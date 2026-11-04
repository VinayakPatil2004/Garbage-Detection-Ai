import os
import shutil
import time
import random
from concurrent.futures import ThreadPoolExecutor
import cv2
import numpy as np
from PIL import Image
import torch
from ultralytics import YOLO

def detect_and_remove_watermark(file_path):
    """Crops GPS Map camera watermark cards from the bottom of municipal WhatsApp photos."""
    try:
        img = cv2.imread(file_path)
        if img is None:
            return 0
        h, w = img.shape[:2]
        if h < 350:
            return 0

        y_min = int(h * 0.58)
        sub = img[y_min:, :]
        sub_gray = cv2.cvtColor(sub, cv2.COLOR_BGR2GRAY)

        dark_mask = (sub_gray < 58).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        closed = cv2.morphologyEx(dark_mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        card_y = None
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            if bw > w * 0.25 and bh > h * 0.07:
                card_y = y_min + y
                break

        search_start = int(h * 0.62)
        search_end = int(h * 0.88)
        sub_left = img[search_start:search_end, :min(150, w)]
        row_means = sub_left.mean(axis=(1, 2))
        diffs = np.abs(np.diff(row_means))

        line_y = None
        if len(diffs) > 0 and np.max(diffs) > 18:
            line_y = search_start + int(np.argmax(diffs))

        fixed_y = None
        if h in (1280, 960):
            cand = h - 321
            diff = np.abs(img[cand-2:cand, :80].astype(int) - img[cand:cand+2, :80].astype(int)).mean()
            if diff > 14:
                fixed_y = cand

        candidates = [y for y in (card_y, line_y, fixed_y) if y is not None]
        if candidates:
            cut = min(candidates) - 4
            if cut > int(h * 0.50):
                cropped = img[:cut, :]
                cv2.imwrite(file_path, cropped)
                return 1
        return 0
    except Exception:
        return 0

def safe_link_or_copy(src, dst):
    """Tries NTFS hardlink first (instant, 0 disk space), falls back to copy."""
    if os.path.exists(dst):
        return
    try:
        os.link(src, dst)
    except Exception:
        shutil.copy2(src, dst)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "Dataset")
    source_dir = os.path.join(dataset_dir, "garbage new")
    pos_dir = os.path.join(dataset_dir, "Positive img")
    neg_dir = os.path.join(dataset_dir, "Negative img")
    train_dir = os.path.join(dataset_dir, "classification_dataset")

    os.makedirs(pos_dir, exist_ok=True)
    os.makedirs(neg_dir, exist_ok=True)

    print("=" * 65)
    print("      AI DATASET CLASSIFIER & MERGER PIPELINE (GPU ACCELERATED)     ")
    print("=" * 65)

    # 1. Hardware Check
    device = 0 if torch.cuda.is_available() else "cpu"
    if torch.cuda.is_available():
        print(f"[GPU] CUDA Active: {torch.cuda.get_device_name(0)}")
    else:
        print("[CPU] Running on CPU")

    # 2. Re-establish Negative img baseline from classification_dataset if needed
    train_neg_dir = os.path.join(train_dir, "train", "Negative")
    val_neg_dir = os.path.join(train_dir, "val", "Negative")
    existing_neg_files = set(os.listdir(neg_dir))

    restored_count = 0
    for sdir in (train_neg_dir, val_neg_dir):
        if os.path.exists(sdir):
            for fn in os.listdir(sdir):
                if fn.lower().endswith(('.jpg', '.jpeg', '.png')) and fn not in existing_neg_files:
                    safe_link_or_copy(os.path.join(sdir, fn), os.path.join(neg_dir, fn))
                    existing_neg_files.add(fn)
                    restored_count += 1
    if restored_count > 0:
        print(f"[RESTORE] Linked {restored_count} existing Negative images into '{neg_dir}'")

    print(f"[BASELINE] Existing Positive img: {len(os.listdir(pos_dir))} images")
    print(f"[BASELINE] Existing Negative img: {len(os.listdir(neg_dir))} images")

    # 3. Check Source folder
    if not os.path.exists(source_dir):
        print(f"[ERROR] Source folder '{source_dir}' not found!")
        return

    new_files = [f for f in sorted(os.listdir(source_dir)) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    total_new = len(new_files)
    print(f"[INPUT] Found {total_new} new images in '{source_dir}' to classify.")

    if total_new == 0:
        print("No new images to process.")
        return

    # 4. Remove location watermarks concurrently
    print("\n--- Step 1: Cleaning GPS Map Watermarks on New Dataset ---")
    start_wm = time.time()
    all_new_paths = [os.path.join(source_dir, f) for f in new_files]
    with ThreadPoolExecutor(max_workers=min(16, (os.cpu_count() or 4) * 2)) as executor:
        wm_results = list(executor.map(detect_and_remove_watermark, all_new_paths))
    wm_removed = sum(wm_results)
    print(f"Cleaned {wm_removed} GPS location watermarks in {round(time.time() - start_wm, 2)}s.")

    # 5. Load AI Models on GPU
    print("\n--- Step 2: Loading AI Models (Classifier & Object Detector) ---")
    classifier_path = os.path.join(base_dir, "garbage_best.pt")
    detector_path = os.path.join(base_dir, "yolov8s.pt")
    if not os.path.exists(detector_path):
        detector_path = os.path.join(base_dir, "yolov8n.pt")

    print(f"Loading Classifier: {classifier_path}")
    m_cls = YOLO(classifier_path)
    print(f"Loading Detector: {detector_path}")
    m_det = YOLO(detector_path)

    # 6. Two-Stage High Accuracy Classification
    print("\n--- Step 3: Running Two-Stage High-Precision AI Classification ---")
    start_cls = time.time()

    positive_files = []
    negative_candidates = []

    cls_batch_size = 128
    print(f"Stage 1: Batch Classification (imgsz=256, batch={cls_batch_size})...")
    for i in range(0, total_new, cls_batch_size):
        batch_paths = all_new_paths[i:i + cls_batch_size]
        batch_names = new_files[i:i + cls_batch_size]

        results = m_cls(batch_paths, imgsz=256, batch=len(batch_paths), device=device, verbose=False)
        for fn, p, r in zip(batch_names, batch_paths, results):
            probs = r.probs.data.tolist()
            garb_p = probs[1] if len(probs) > 1 else 0.0

            if garb_p >= 0.50:
                positive_files.append((fn, p, garb_p, "Classifier direct high-confidence"))
            else:
                negative_candidates.append((fn, p, garb_p))

        done = min(i + cls_batch_size, total_new)
        if done % 1280 == 0 or done == total_new:
            speed = done / (time.time() - start_cls)
            print(f"  Stage 1 Progress: {done}/{total_new} ({done/total_new*100:.1f}%) | "
                  f"Positive: {len(positive_files)} | Candidates to verify: {len(negative_candidates)} | "
                  f"Speed: {speed:.1f} img/s", flush=True)

    print(f"\nStage 1 Result: {len(positive_files)} positive images confirmed directly.")
    print(f"Stage 2: Verifying {len(negative_candidates)} candidate clean images with Object Detector & Spatial Check...")

    waste_classes = {
        'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
        'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
        'hot dog', 'pizza', 'donut', 'cake'
    }

    negative_files = []
    start_det = time.time()
    det_batch_size = 32

    for i in range(0, len(negative_candidates), det_batch_size):
        batch = negative_candidates[i:i + det_batch_size]
        batch_paths = [item[1] for item in batch]

        det_results = m_det(batch_paths, conf=0.25, imgsz=640, batch=len(batch_paths), device=device, verbose=False)

        for (fn, p, orig_garb_p), dr in zip(batch, det_results):
            has_waste_object = False
            has_person = False
            waste_items_found = []

            for b in dr.boxes:
                cname = m_det.names[int(b.cls[0])]
                conf = float(b.conf[0])
                if cname in waste_classes and conf >= 0.25:
                    has_waste_object = True
                    waste_items_found.append(f"{cname}({conf:.2f})")
                if cname == 'person':
                    has_person = True

            # If person detected, check bottom 45% (worker cleaning / basket held)
            person_waste_detected = False
            if has_person and not has_waste_object:
                try:
                    with Image.open(p) as img_pil:
                        w, h = img_pil.size
                        bot_crop = img_pil.crop((0, int(h * 0.45), w, h))
                        bot_res = m_cls(bot_crop, imgsz=256, device=device, verbose=False)[0]
                        bot_garb_p = bot_res.probs.data[1].item()
                        if bot_garb_p >= 0.70:
                            person_waste_detected = True
                except Exception:
                    pass

            if has_waste_object:
                positive_files.append((fn, p, orig_garb_p, f"Object detected: {', '.join(waste_items_found)}"))
            elif person_waste_detected:
                positive_files.append((fn, p, orig_garb_p, "Person waste basket/cleaning scene"))
            else:
                negative_files.append((fn, p, orig_garb_p))

        done_det = min(i + det_batch_size, len(negative_candidates))
        if done_det % 640 == 0 or done_det == len(negative_candidates):
            speed_det = done_det / (time.time() - start_det)
            print(f"  Stage 2 Progress: {done_det}/{len(negative_candidates)} ({done_det/len(negative_candidates)*100:.1f}%) | "
                  f"Total Positive: {len(positive_files)} | Total Clean: {len(negative_files)} | "
                  f"Speed: {speed_det:.1f} img/s", flush=True)

    print("\n" + "=" * 65)
    print("      CLASSIFICATION SUMMARY FOR NEW DATASET       ")
    print("=" * 65)
    print(f"Total images evaluated: {total_new}")
    print(f"Classified as POSITIVE (Garbage): {len(positive_files)} ({len(positive_files)/total_new*100:.1f}%)")
    print(f"Classified as NEGATIVE (Clean):   {len(negative_files)} ({len(negative_files)/total_new*100:.1f}%)")

    # 7. Move classified files to Positive img and Negative img
    print("\n--- Step 4: Moving and Merging into Positive & Negative Datasets ---")
    start_move = time.time()

    # Move to Positive img
    for fn, src_path, _, _ in positive_files:
        dst_path = os.path.join(pos_dir, fn)
        try:
            shutil.move(src_path, dst_path)
        except Exception as e:
            print(f"Move error for {fn}: {e}")

    # Move to Negative img
    for fn, src_path, _ in negative_files:
        dst_path = os.path.join(neg_dir, fn)
        try:
            shutil.move(src_path, dst_path)
        except Exception as e:
            print(f"Move error for {fn}: {e}")

    print(f"Moved files into '{pos_dir}' and '{neg_dir}' in {round(time.time() - start_move, 2)}s.")

    # 8. Update classification_dataset (80% train / 20% val split for newly added images)
    print("\n--- Step 5: Updating train/val Splits in classification_dataset ---")
    train_pos_dir = os.path.join(train_dir, "train", "Positive")
    val_pos_dir = os.path.join(train_dir, "val", "Positive")
    train_neg_dir = os.path.join(train_dir, "train", "Negative")
    val_neg_dir = os.path.join(train_dir, "val", "Negative")

    os.makedirs(train_pos_dir, exist_ok=True)
    os.makedirs(val_pos_dir, exist_ok=True)
    os.makedirs(train_neg_dir, exist_ok=True)
    os.makedirs(val_neg_dir, exist_ok=True)

    # Positive split
    random.seed(42)
    new_pos_names = [item[0] for item in positive_files]
    random.shuffle(new_pos_names)
    pos_split_idx = int(len(new_pos_names) * 0.8)

    for fn in new_pos_names[:pos_split_idx]:
        safe_link_or_copy(os.path.join(pos_dir, fn), os.path.join(train_pos_dir, fn))
    for fn in new_pos_names[pos_split_idx:]:
        safe_link_or_copy(os.path.join(pos_dir, fn), os.path.join(val_pos_dir, fn))

    # Negative split
    new_neg_names = [item[0] for item in negative_files]
    random.shuffle(new_neg_names)
    neg_split_idx = int(len(new_neg_names) * 0.8)

    for fn in new_neg_names[:neg_split_idx]:
        safe_link_or_copy(os.path.join(neg_dir, fn), os.path.join(train_neg_dir, fn))
    for fn in new_neg_names[neg_split_idx:]:
        safe_link_or_copy(os.path.join(neg_dir, fn), os.path.join(val_neg_dir, fn))

    print(f"Updated classification_dataset:")
    print(f"  Added to train/Positive: {pos_split_idx} | val/Positive: {len(new_pos_names) - pos_split_idx}")
    print(f"  Added to train/Negative: {neg_split_idx} | val/Negative: {len(new_neg_names) - neg_split_idx}")

    # Check remaining in garbage new
    remaining = len(os.listdir(source_dir))
    if remaining == 0:
        try:
            os.rmdir(source_dir)
            print(f"[CLEANUP] Empty source directory '{source_dir}' removed.")
        except Exception:
            pass

    # 9. Final Dataset Counts
    final_pos = len(os.listdir(pos_dir))
    final_neg = len(os.listdir(neg_dir))
    final_train_pos = len(os.listdir(train_pos_dir))
    final_val_pos = len(os.listdir(val_pos_dir))
    final_train_neg = len(os.listdir(train_neg_dir))
    final_val_neg = len(os.listdir(val_neg_dir))

    print("\n" + "=" * 65)
    print("      ALL DATASET OPERATIONS COMPLETED SUCCESSFULLY!        ")
    print("=" * 65)
    print(f"Total Positive (Garbage) Dataset: {final_pos} images")
    print(f"Total Negative (Clean) Dataset:   {final_neg} images")
    print(f"Total Images in System:           {final_pos + final_neg} images")
    print(f"\nClassification Dataset Distribution:")
    print(f"  train/Positive: {final_train_pos} images")
    print(f"  val/Positive:   {final_val_pos} images")
    print(f"  train/Negative: {final_train_neg} images")
    print(f"  val/Negative:   {final_val_neg} images")
    print("=" * 65)

if __name__ == "__main__":
    main()
