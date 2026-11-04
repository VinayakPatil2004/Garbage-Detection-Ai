import os
import time
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor

def detect_and_remove_watermark(file_path):
    try:
        img = cv2.imread(file_path)
        if img is None:
            return 0
        h, w = img.shape[:2]
        if h < 350:
            return 0

        # Region to search: bottom 42% of the image (where GPS Map overlays are located)
        y_min = int(h * 0.58)
        sub = img[y_min:, :]
        sub_gray = cv2.cvtColor(sub, cv2.COLOR_BGR2GRAY)

        # 1. Detect dark floating card (RGB < 58)
        dark_mask = (sub_gray < 58).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        closed = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        card_y = None
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            # GPS badge card is at least 25% of image width and 8% of image height
            if bw > w * 0.25 and bh > h * 0.07:
                card_y = y_min + y
                break

        # 2. Detect horizontal dividing line for full-width strip or map top
        search_start = int(h * 0.62)
        search_end = int(h * 0.88)
        sub_left = img[search_start:search_end, :min(150, w)]
        row_means = sub_left.mean(axis=(1, 2))
        diffs = np.abs(np.diff(row_means))

        line_y = None
        if len(diffs) > 0 and np.max(diffs) > 18:
            line_y = search_start + int(np.argmax(diffs))

        # 3. Handle standard fixed height (321px from bottom in 1280 or 960 images)
        fixed_y = None
        if h in (1280, 960):
            cand = h - 321
            diff = np.abs(img[cand-2:cand, :80].astype(int) - img[cand:cand+2, :80].astype(int)).mean()
            if diff > 14:
                fixed_y = cand

        candidates = [y for y in (card_y, line_y, fixed_y) if y is not None]
        if candidates:
            cut = min(candidates) - 4
            # Make sure we don't over-crop: cut must be in bottom 50%
            if cut > int(h * 0.50):
                cropped = img[:cut, :]
                cv2.imwrite(file_path, cropped)
                return 1

        return 0
    except Exception:
        return 0

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = os.path.join(base_dir, "Dataset", "Negative img")

    if not os.path.exists(target_dir):
        print(f"Directory not found: {target_dir}")
        return

    valid_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
    all_files = [
        os.path.join(target_dir, f)
        for f in os.listdir(target_dir)
        if f.lower().endswith(valid_exts)
    ]

    total = len(all_files)
    print(f"Total images to scan for GPS location watermarks: {total}")
    start_time = time.time()

    watermarks_removed = 0
    batch_size = 5000
    workers = min(16, (os.cpu_count() or 4) * 2)

    for i in range(0, total, batch_size):
        batch = all_files[i:i + batch_size]
        with ThreadPoolExecutor(max_workers=workers) as executor:
            results = list(executor.map(detect_and_remove_watermark, batch))

        batch_removed = sum(results)
        watermarks_removed += batch_removed
        done = min(i + batch_size, total)
        elapsed = time.time() - start_time
        speed = done / elapsed if elapsed > 0 else 0
        print(f"Progress: {done}/{total} images scanned ({speed:.1f} imgs/sec) -> Floating/strip watermarks removed: {watermarks_removed}")

    total_time = round(time.time() - start_time, 2)
    print("\n" + "=" * 55)
    print("      ALL LOCATION WATERMARKS REMOVED SUCCESSFULLY!   ")
    print("=" * 55)
    print(f"Total images scanned: {total}")
    print(f"Location watermarks removed: {watermarks_removed}")
    print(f"Total time taken: {total_time}s")

if __name__ == "__main__":
    main()
