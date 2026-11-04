# ==============================================================
# Configuration File - Real-Time Garbage & Waste Detection
# ==============================================================

import os

# --- Model Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

# 1. Detection Model (Object Detection for Bounding Boxes)
det_candidates = [
    os.path.join(ROOT_DIR, "backend", "yolov8s.pt"),
    os.path.join(ROOT_DIR, "yolo26n.pt"),
    os.path.join(ROOT_DIR, "backend", "yolov8n.pt"),
    os.path.join(BASE_DIR, "yolov8s.pt"),
]
DETECTION_MODEL_PATH = "yolov8s.pt"
for p in det_candidates:
    if os.path.exists(p):
        DETECTION_MODEL_PATH = p
        break

# Default alias for backwards compatibility
MODEL_PATH = DETECTION_MODEL_PATH

# 2. Custom Classification Model (Trained Garbage vs Clean Classifier)
cls_candidates = [
    os.path.join(ROOT_DIR, "backend", "garbage_best.pt"),
    os.path.join(BASE_DIR, "garbage_best.pt")
]
CLASSIFIER_MODEL_PATH = None
for p in cls_candidates:
    if os.path.exists(p):
        CLASSIFIER_MODEL_PATH = p
        break

# Minimum confidence required to consider a detection valid
CONFIDENCE_THRESHOLD = 0.25

# Waste / Litter classes to track and trigger alerts
# Maps YOLO/COCO & Garbage classes to user-friendly labels and colors (BGR format for OpenCV)
GARBAGE_CLASSES = {
    'bottle': {'label': 'Plastic/Glass Bottle', 'category': 'Recyclable', 'color': (255, 128, 0), 'priority': 'Medium'},
    'cup': {'label': 'Paper/Plastic Cup', 'category': 'Recyclable', 'color': (255, 0, 128), 'priority': 'Low'},
    'banana': {'label': 'Banana Peel (Organic)', 'category': 'Organic', 'color': (0, 165, 255), 'priority': 'Low'},
    'apple': {'label': 'Food Waste', 'category': 'Organic', 'color': (0, 165, 255), 'priority': 'Low'},
    'orange': {'label': 'Food Waste', 'category': 'Organic', 'color': (0, 165, 255), 'priority': 'Low'},
    'sandwich': {'label': 'Food Waste', 'category': 'Organic', 'color': (0, 165, 255), 'priority': 'Low'},
    'wine glass': {'label': 'Glass Shard / Bottle', 'category': 'Hazardous Glass', 'color': (0, 0, 255), 'priority': 'High'},
    'fork': {'label': 'Plastic Cutlery', 'category': 'Plastic', 'color': (255, 128, 0), 'priority': 'Low'},
    'knife': {'label': 'Cutlery / Sharp', 'category': 'Solid Waste', 'color': (0, 0, 255), 'priority': 'High'},
    'spoon': {'label': 'Plastic Cutlery', 'category': 'Plastic', 'color': (255, 128, 0), 'priority': 'Low'},
    'bowl': {'label': 'Disposable Bowl', 'category': 'Solid Waste', 'color': (255, 128, 0), 'priority': 'Medium'},
    'handbag': {'label': 'Plastic Bag / Pouch', 'category': 'Soft Plastic', 'color': (255, 128, 0), 'priority': 'Medium'},
    'backpack': {'label': 'Discarded Bag / Textile', 'category': 'Textile Waste', 'color': (255, 0, 128), 'priority': 'Medium'},
    'book': {'label': 'Paper Waste', 'category': 'Paper', 'color': (255, 0, 128), 'priority': 'Low'},
    'garbage': {'label': 'Garbage Pile', 'category': 'Mixed Waste', 'color': (0, 0, 255), 'priority': 'High'},
    'trash': {'label': 'Trash / Litter', 'category': 'Mixed Waste', 'color': (0, 0, 255), 'priority': 'High'},
    'plastic': {'label': 'Plastic Waste', 'category': 'Plastic', 'color': (255, 128, 0), 'priority': 'Medium'},
    'can': {'label': 'Metal Can', 'category': 'Recyclable Metal', 'color': (0, 255, 255), 'priority': 'Medium'},
}

# --- Alert Settings ---
ALERT_COOLDOWN_SECONDS = 60
SHOW_WINDOW = True

# --- Email Notification Settings ---
ENABLE_EMAIL_ALERTS = False  # Set to True once SMTP credentials below are configured
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "your_email@gmail.com"
EMAIL_PASSWORD = "your_app_password_here"
EMAIL_RECEIVER = "alerts_receiver@gmail.com"
