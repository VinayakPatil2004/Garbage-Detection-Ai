import cv2
import os
import sys
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import analyze_image_unified
from PIL import Image

vid_path = r"C:\Users\Shree\Downloads\VID20261116122028.mp4"
if not os.path.exists(vid_path):
    print(f"Error: Video file not found at {vid_path}")
    sys.exit(1)

cap = cv2.VideoCapture(vid_path)
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "garbage_detection", "alerts", "video_test")
os.makedirs(output_dir, exist_ok=True)

# Sample every 10 seconds across the ~5 minute video
step_sec = 10
sample_timestamps = [i * step_sec for i in range(int(duration // step_sec) + 1)]

print(f"Loaded Video: {w}x{h} @ {fps:.1f} FPS | Duration: {int(duration//60)}m {int(duration%60)}s ({len(sample_timestamps)} sample points)")
print("-" * 65)

results_summary = []

for sec in sample_timestamps:
    frame_idx = int(sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    if not ret:
        continue

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)

    t0 = time.time()
    res = analyze_image_unified(pil_img)
    dt = time.time() - t0

    mins = int(sec // 60)
    secs = int(sec % 60)
    ts_str = f"{mins:02d}:{secs:02d}"

    verdict = res["verdict"]
    preds = res["predictions"]
    is_garb = res["is_garbage"]

    obj_labels = [f"{p['label']} ({p['confidence']}%)" for p in preds]

    results_summary.append({
        "time": ts_str,
        "sec": sec,
        "verdict": verdict,
        "is_garbage": is_garb,
        "objects": obj_labels,
        "latency": f"{dt:.2f}s"
    })

    if is_garb:
        h_f, w_f = frame.shape[:2]
        for p in preds:
            bx = p["box"]
            x1 = int((bx["x"] / 100.0) * w_f)
            y1 = int((bx["y"] / 100.0) * h_f)
            bw = int((bx["width"] / 100.0) * w_f)
            bh = int((bx["height"] / 100.0) * h_f)
            cv2.rectangle(frame, (x1, y1), (x1 + bw, y1 + bh), (0, 0, 255), 4)
            tag = f"{p['label']} {p['confidence']}%"
            cv2.putText(frame, tag, (x1, max(y1 - 10, 35)), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)

        snap_name = f"detect_{mins:02d}m_{secs:02d}s.jpg"
        snap_path = os.path.join(output_dir, snap_name)
        cv2.imwrite(snap_path, frame)
        print(f"[{ts_str}] 🚨 {verdict} | Found: {', '.join(obj_labels)} | Latency: {dt:.2f}s")
    else:
        print(f"[{ts_str}] ✅ {verdict} | Latency: {dt:.2f}s")

cap.release()

total_garbage = sum(1 for r in results_summary if r["is_garbage"])
total_clean = sum(1 for r in results_summary if not r["is_garbage"])
print("=" * 65)
print(f"AI VIDEO SCAN COMPLETE:")
print(f"  Total Scanned Points : {len(results_summary)}")
print(f"  Clean Road Segments  : {total_clean}")
print(f"  Garbage Hotspots     : {total_garbage}")
print(f"  Snapshots Saved In   : {output_dir}")
print("=" * 65)

