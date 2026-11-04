import os
import shutil
import time
from ultralytics import YOLO

def scan_and_separate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "Dataset")
    neg_dir = os.path.join(dataset_dir, "Negative img")
    pos_dir = os.path.join(dataset_dir, "Positive img")

    os.makedirs(pos_dir, exist_ok=True)
    os.makedirs(neg_dir, exist_ok=True)

    model_path = os.path.join(base_dir, "yolov8s.pt")
    if not os.path.exists(model_path):
        model_path = os.path.join(base_dir, "yolov8n.pt")

    print(f"Loading YOLO model from {model_path} on GPU...")
    model = YOLO(model_path)

    # All files in Negative img
    files = sorted([f for f in os.listdir(neg_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    total_files = len(files)
    print(f"Total images in Negative img to scan: {total_files}")

    waste_classes = {
        'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
        'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
        'hot dog', 'pizza', 'donut', 'cake', 'book'
    }

    moved_count = 0
    start_time = time.time()

    for i, filename in enumerate(files):
        src_path = os.path.join(neg_dir, filename)
        if not os.path.exists(src_path):
            continue

        try:
            results = model(src_path, conf=0.10, imgsz=640, device=0, verbose=False)
            is_garbage = False

            if results and len(results) > 0:
                boxes = results[0].boxes
                h, w = results[0].orig_shape

                for b in boxes:
                    cls_id = int(b.cls[0].item())
                    cls_name = model.names.get(cls_id, "")
                    conf = float(b.conf[0].item())
                    xyxy = b.xyxy[0].tolist()
                    y2 = xyxy[3]

                    # 1. Direct waste items (bottles, cups, plates, food waste, wrappers)
                    if cls_name in waste_classes and conf >= 0.12:
                        is_garbage = True
                        break

                    # 2. Sweeper brooms / cleaning action
                    if cls_name == 'baseball bat' and conf >= 0.10:
                        is_garbage = True
                        break

                    # 3. Bags / sacks lying near ground level (potential garbage bags)
                    if cls_name in {'handbag', 'backpack'} and conf >= 0.20 and (y2 / h) > 0.70:
                        is_garbage = True
                        break

            if is_garbage:
                dest_path = os.path.join(pos_dir, filename)
                shutil.move(src_path, dest_path)
                moved_count += 1

        except Exception as e:
            pass

        # Progress reporting
        if (i + 1) % 1000 == 0 or (i + 1) == total_files:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 1
            remaining = (total_files - (i + 1)) / rate
            print(f"[{i + 1}/{total_files}] Processed ({((i+1)/total_files)*100:.1f}%) | "
                  f"Moved to Positive: {moved_count} | Speed: {rate:.1f} img/s | "
                  f"ETA: {remaining/60:.1f} min", flush=True)

    total_time = round(time.time() - start_time, 2)
    print("\n" + "="*50)
    print("      AI GARBAGE SCAN & SEPARATION COMPLETED!   ")
    print("="*50)
    print(f"Total images scanned: {total_files}")
    print(f"Garbage/Cleaning images moved to Positive: {moved_count}")
    print(f"Remaining clean images in Negative: {len(os.listdir(neg_dir))}")
    print(f"Total in Positive img: {len(os.listdir(pos_dir))}")
    print(f"Time taken: {total_time}s ({total_time/60:.2f} mins)")

if __name__ == "__main__":
    scan_and_separate()
