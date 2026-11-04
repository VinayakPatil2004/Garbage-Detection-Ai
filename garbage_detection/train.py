"""
Train a Custom YOLOv8 Model for Garbage & Waste Detection

1. Prepare your Garbage Dataset in YOLO format:
   Dataset folder structure:
   ├── images/
   │   ├── train/
   │   └── val/
   ├── labels/
   │   ├── train/
   │   └── val/
   └── data.yaml

   Example data.yaml:
   train: path/to/images/train
   val: path/to/images/val
   nc: 5
   names: ['plastic_bottle', 'plastic_bag', 'paper_cup', 'organic_waste', 'glass_bottle']

2. Run:
   python train.py
"""

import os
import torch
from ultralytics import YOLO

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_yaml_path = os.path.join(base_dir, "data.yaml")
    
    # Check alternate dataset path in backend if local data.yaml not found
    if not os.path.exists(data_yaml_path):
        alt_yaml = os.path.join(base_dir, "..", "backend", "Dataset", "data.yaml")
        if os.path.exists(alt_yaml):
            data_yaml_path = alt_yaml

    print("==================================================")
    print("      Garbage Detection AI Model Training         ")
    print("==================================================")

    device = 0 if torch.cuda.is_available() else "cpu"
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    print(f"Device: {device_name}")

    if not os.path.exists(data_yaml_path):
        print(f"\n[INFO] 'data.yaml' not found at: {data_yaml_path}")
        print("To train on a custom dataset, place your YOLO-formatted dataset")
        print("with a data.yaml in this directory and re-run.")
        return

    # Start from pretrained model
    model = YOLO("yolov8s.pt")

    results = model.train(
        data=data_yaml_path,
        epochs=50,
        imgsz=640,
        batch=4 if torch.cuda.is_available() else 2,
        workers=0,  # Prevents WinError on Windows
        device=device,
        name="garbage_detection_model"
    )

    print("\nTraining completed successfully!")
    print("Best weights saved at: runs/detect/garbage_detection_model/weights/best.pt")

if __name__ == "__main__":
    main()
