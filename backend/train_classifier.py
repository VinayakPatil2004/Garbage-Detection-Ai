"""
Automatic Garbage vs Clean Model Training Pipeline
Uses YOLOv8 Classification with PyTorch CUDA GPU Acceleration
"""

import os
import shutil
import random
import torch
from ultralytics import YOLO

def prepare_and_train():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "Dataset")
    train_dir = os.path.join(dataset_dir, "classification_dataset")
    pos_source = os.path.join(dataset_dir, "Positive img")
    neg_source = os.path.join(dataset_dir, "Negative img")

    print("=" * 65)
    print("      GARBAGE DETECTION AI - MODEL TRAINING PIPELINE (CUDA GPU)     ")
    print("=" * 65)

    # 1. Hardware Check
    device = 0 if torch.cuda.is_available() else "cpu"
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
        print(f"[HARDWARE] Active GPU: {gpu_name} ({vram_gb} GB VRAM)")
        print(f"[HARDWARE] PyTorch CUDA Version: {torch.version.cuda}")
    else:
        print("[HARDWARE] Warning: CUDA GPU not found, running on CPU.")

    # 2. Check Dataset Folders
    train_pos = os.path.join(train_dir, "train", "Positive")
    train_neg = os.path.join(train_dir, "train", "Negative")
    val_pos = os.path.join(train_dir, "val", "Positive")
    val_neg = os.path.join(train_dir, "val", "Negative")

    for p in (train_pos, train_neg, val_pos, val_neg):
        os.makedirs(p, exist_ok=True)

    # Clear old YOLO cache to ensure all newly added images are indexed
    for cache_name in ("train.cache", "val.cache"):
        cp = os.path.join(train_dir, cache_name)
        if os.path.exists(cp):
            try:
                os.remove(cp)
            except Exception:
                pass

    count_train_pos = len(os.listdir(train_pos))
    count_train_neg = len(os.listdir(train_neg))
    count_val_pos = len(os.listdir(val_pos))
    count_val_neg = len(os.listdir(val_neg))

    print(f"\n[DATASET] Dataset Location: {train_dir}")
    print(f"  train/Positive: {count_train_pos} images")
    print(f"  train/Negative: {count_train_neg} images")
    print(f"  val/Positive:   {count_val_pos} images")
    print(f"  val/Negative:   {count_val_neg} images")
    print(f"  Total Dataset:  {count_train_pos + count_train_neg + count_val_pos + count_val_neg} images")

    # 3. Model Weight Selection (Transfer Learning)
    existing_best = os.path.join(base_dir, "garbage_best.pt")
    if os.path.exists(existing_best):
        print(f"\n[TRANSFER LEARNING] Loading existing best model: {existing_best}")
        model = YOLO(existing_best)
    else:
        print("\n[TRANSFER LEARNING] Initializing YOLOv8 small classifier backbone...")
        model = YOLO("yolov8s-cls.pt")

    # 4. Hyperparameters tuned for RTX 3050 (6GB VRAM)
    import argparse
    parser = argparse.ArgumentParser(description="Train Garbage Classifier on GPU")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs (default: 100)")
    parser.add_argument("--batch", type=int, default=32, help="Batch size (default: 32)")
    parser.add_argument("--imgsz", type=int, default=256, help="Image resolution (default: 256)")
    parser.add_argument("--patience", type=int, default=0, help="Early stopping patience (0 to run full epochs)")
    args, _ = parser.parse_known_args()

    epochs = args.epochs
    batch_size = args.batch
    img_size = args.imgsz
    patience = args.patience

    print("\n--- Training Hyperparameters ---")
    print(f"Epochs:        {epochs} (Full 100 Epochs Training)")
    print(f"Batch Size:    {batch_size}")
    print(f"Image Size:    {img_size}px (native high-resolution)")
    print(f"Optimizer:     AdamW (lr0=0.0005, cos_lr=True)")
    print(f"Patience:      {patience} (0 = Complete all {epochs} epochs)")
    print(f"Augmentations: Flip, Rotation, Color-Jitter")
    print("--------------------------------\n")

    # 5. Execute Training
    results = model.train(
        data=train_dir,
        epochs=epochs,
        patience=patience,
        imgsz=img_size,
        batch=batch_size,
        device=device,
        workers=0,            # Windows multi-threading safe
        optimizer="AdamW",
        lr0=0.0005,
        lrf=0.01,
        cos_lr=True,
        degrees=12.0,
        fliplr=0.5,
        flipud=0.2,
        name="garbage_classifier_100epochs",
        exist_ok=True
    )

    # 6. Deploy Best Weights to backend/garbage_best.pt automatically
    best_weights_path = os.path.join(results.save_dir, "weights", "best.pt")
    if os.path.exists(best_weights_path):
        target_path = os.path.join(base_dir, "garbage_best.pt")
        # Backup old weights
        backup_path = os.path.join(base_dir, "garbage_best_backup.pt")
        if os.path.exists(target_path):
            shutil.copy2(target_path, backup_path)
            print(f"[BACKUP] Previous best weights backed up to: {backup_path}")

        shutil.copy2(best_weights_path, target_path)
        print(f"\n[DEPLOY] Newly trained best model successfully deployed to: {target_path}")

    print("\n" + "=" * 65)
    print("       MODEL TRAINING COMPLETED SUCCESSFULLY!       ")
    print("=" * 65)
    print(f"Training Results saved in: {results.save_dir}")
    print(f"Active Classifier Model:   {os.path.join(base_dir, 'garbage_best.pt')}")

if __name__ == "__main__":
    prepare_and_train()
