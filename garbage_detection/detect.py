"""
Real-Time Garbage & Waste Detection Engine
Supports: USB Webcams, CCTV RTSP streams, Video files, or Static images.
Features:
- High-performance YOLOv8 GPU/CPU inference
- Automatic categorization (Plastic, Paper, Organic, Glass, Metal)
- Visual bounding boxes with confidence levels and live HUD
- Snapshot saving and optional email alert notifications on litter detection
"""

import os
# Bypass PyTorch weights_only default restriction for custom weights
os.environ["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = "1"

import cv2
import time
import argparse
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from datetime import datetime
import torch
from ultralytics import YOLO
import config


def send_email_alert(frame, label, category, confidence):
    """Send an automated email notification with snapshot attached."""
    if not config.ENABLE_EMAIL_ALERTS:
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = config.EMAIL_SENDER
        msg['To'] = config.EMAIL_RECEIVER
        msg['Subject'] = f"🗑️ ALERT: Garbage Detected - {label} ({confidence*100:.1f}%)"

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        body = (
            f"Municipal AI Monitoring Alert:\n\n"
            f"Object: {label}\n"
            f"Category: {category}\n"
            f"Confidence: {confidence*100:.1f}%\n"
            f"Detected Time: {timestamp}\n\n"
            f"A snapshot of the detected litter is attached."
        )
        msg.attach(MIMEText(body, 'plain'))

        # Attach JPEG snapshot
        _, img_encoded = cv2.imencode('.jpg', frame)
        image = MIMEImage(img_encoded.tobytes(), name="garbage_alert.jpg")
        msg.attach(image)

        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.EMAIL_SENDER, config.EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()

        print(f"[{timestamp}] 📧 Email alert successfully dispatched for {label} ({confidence*100:.1f}%)")
    except Exception as e:
        print(f"[ERROR] Failed to send email alert: {e}")


def main(source, conf_threshold=None):
    conf_threshold = conf_threshold or config.CONFIDENCE_THRESHOLD

    # Device selection
    device = 0 if torch.cuda.is_available() else "cpu"
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    print(f"Starting Garbage Detection Engine on {device_name}...")
    print(f"Loading YOLO model from: {config.MODEL_PATH}")

    model = YOLO(config.MODEL_PATH)

    # Determine input type
    is_image = False
    if os.path.isfile(source) and source.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.bmp')):
        is_image = True
    elif source.isdigit():
        source = int(source)

    # Output alert directory
    alert_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alerts")
    os.makedirs(alert_dir, exist_ok=True)

    if is_image:
        print(f"Analyzing static image: {source}")
        frame = cv2.imread(source)
        if frame is None:
            print(f"[ERROR] Could not read image at {source}")
            return
        process_single_frame(model, frame, conf_threshold, alert_dir, device)
        return

    # Video stream or webcam
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video stream or webcam: {source}")
        return

    print(f"Stream successfully connected: {source}")
    print("Real-time monitoring active. Press 'q' to quit, 's' to save snapshot.")

    last_alert_time = {}
    fps_start_time = time.time()
    fps_counter = 0
    fps = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[INFO] Stream paused or ended. Attempting reconnect...")
            time.sleep(1)
            cap = cv2.VideoCapture(source)
            continue

        fps_counter += 1
        if (time.time() - fps_start_time) > 1.0:
            fps = round(fps_counter / (time.time() - fps_start_time), 1)
            fps_counter = 0
            fps_start_time = time.time()

        # Run inference
        results = model(frame, conf=conf_threshold, device=device, verbose=False)

        detected_waste_count = 0
        current_labels = []

        if results and len(results) > 0 and getattr(results[0], 'boxes', None) is not None:
            for box in results[0].boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                raw_label = model.names.get(cls_id, "").lower()

                # Match against garbage classes
                if raw_label in config.GARBAGE_CLASSES:
                    meta = config.GARBAGE_CLASSES[raw_label]
                    label = meta['label']
                    category = meta['category']
                    color = meta['color']
                else:
                    # In case of custom garbage model or general items
                    label = raw_label.replace('_', ' ').capitalize()
                    category = "Litter / Waste"
                    color = (0, 165, 255)

                detected_waste_count += 1
                current_labels.append(label)

                # Draw bounding box
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Label tag
                tag = f"{label} {conf*100:.0f}%"
                (w, h), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(frame, (x1, y1 - 20), (x1 + w + 6, y1), color, -1)
                cv2.putText(frame, tag, (x1 + 3, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

                # Trigger alerts if cooldown passed
                now = time.time()
                if now - last_alert_time.get(raw_label, 0) > config.ALERT_COOLDOWN_SECONDS:
                    last_alert_time[raw_label] = now
                    # Save local snapshot
                    ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    snap_path = os.path.join(alert_dir, f"waste_{raw_label}_{ts_str}.jpg")
                    cv2.imwrite(snap_path, frame)
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🚨 Garbage detected: {label} ({conf*100:.1f}%) -> Saved to {snap_path}")
                    send_email_alert(frame, label, category, conf)

        # Draw HUD Overlay
        cv2.rectangle(frame, (10, 10), (320, 80), (15, 23, 42), -1)
        cv2.rectangle(frame, (10, 10), (320, 80), (37, 99, 235), 1)

        hud_color = (0, 255, 128) if detected_waste_count == 0 else (0, 80, 255)
        cv2.putText(frame, f"Garbage AI Status: ACTIVE ({fps} FPS)", (20, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Litter Detected: {detected_waste_count} items", (20, 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, hud_color, 2, cv2.LINE_AA)
        cv2.putText(frame, f"Device: {device_name}", (20, 72),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (148, 163, 184), 1, cv2.LINE_AA)

        if config.SHOW_WINDOW:
            cv2.imshow("Garbage Detection AI - Real Time Monitor", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                snap_path = os.path.join(alert_dir, f"manual_snap_{ts_str}.jpg")
                cv2.imwrite(snap_path, frame)
                print(f"[MANUAL CAPTURE] Saved snapshot to: {snap_path}")

    cap.release()
    cv2.destroyAllWindows()


def process_single_frame(model, frame, conf_threshold, alert_dir, device):
    """Process a static image file and display/save results."""
    results = model(frame, conf=conf_threshold, device=device)
    count = 0

    if results and len(results) > 0 and getattr(results[0], 'boxes', None) is not None:
        for box in results[0].boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            raw_label = model.names.get(cls_id, "").lower()

            if raw_label in config.GARBAGE_CLASSES:
                meta = config.GARBAGE_CLASSES[raw_label]
                label = meta['label']
                color = meta['color']
            else:
                label = raw_label.replace('_', ' ').capitalize()
                color = (0, 165, 255)

            count += 1
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"{label} {conf*100:.0f}%", (x1, max(y1 - 8, 15)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    print(f"\nAnalysis complete: Found {count} waste/garbage objects.")
    output_path = os.path.join(alert_dir, "detection_result.jpg")
    cv2.imwrite(output_path, frame)
    print(f"Result image saved to: {output_path}")

    if config.SHOW_WINDOW:
        cv2.imshow("Garbage Detection Result", frame)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real-time Garbage and Waste Detection AI")
    parser.add_argument("--source", type=str, default="0",
                        help="Video source: Webcam (0), RTSP URL, Video file, or Image path")
    parser.add_argument("--conf", type=float, default=None,
                        help="Confidence threshold (e.g., 0.25)")
    args = parser.parse_args()

    main(args.source, args.conf)
