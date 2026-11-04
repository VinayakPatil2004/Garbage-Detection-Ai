"""
Resume Garbage Detection AI Model Training
Resumes training from the last saved checkpoint (last.pt) on GPU without losing progress.
"""

import os
import shutil
import torch
from ultralytics import YOLO, settings

def resume_training():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    print("=" * 65)
    print("   GARBAGE DETECTION AI - RESUME MODEL TRAINING PIPELINE    ")
    print("=" * 65)

    # 1. Hardware Check
    device = 0 if torch.cuda.is_available() else "cpu"
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
        print(f"[HARDWARE] Active GPU: {gpu_name} ({vram_gb} GB VRAM)")
        print(f"[HARDWARE] CUDA Version: {torch.version.cuda}")
    else:
        print("[HARDWARE] Running on CPU")

    # 2. Locate checkpoint (last.pt)
    candidate_paths = [
        os.path.join(settings.get('runs_dir', ''), "classify", "garbage_classifier_100epochs", "weights", "last.pt"),
        r"C:\Users\Shree\Saved Games\New folder\Video_ad_Generator\runs\classify\garbage_classifier_100epochs\weights\last.pt",
        os.path.join(base_dir, "..", "runs", "classify", "garbage_classifier_100epochs", "weights", "last.pt"),
        os.path.join(os.getcwd(), "runs", "classify", "garbage_classifier_100epochs", "weights", "last.pt"),
    ]

    last_pt = None
    for p in candidate_paths:
        if p and os.path.exists(p):
            last_pt = os.path.abspath(p)
            break

    if not last_pt:
        print("\n[ERROR] Checkpoint 'last.pt' not found in standard run directories.")
        print("Checked paths:")
        for p in candidate_paths:
            print(f" - {p}")
        return

    print(f"\n[CHECKPOINT] Found saved checkpoint: {last_pt}")
    print("Resuming training from last saved epoch on GPU...")
    print("Target: 100 Epochs (No progress lost)\n")

    # 3. Resume training
    model = YOLO(last_pt)
    results = model.train(resume=True)

    # 4. Auto-deploy best weights to backend/garbage_best.pt
    try:
        run_dir = str(results.save_dir) if results and hasattr(results, 'save_dir') else os.path.dirname(os.path.dirname(last_pt))
        best_pt = os.path.join(run_dir, "weights", "best.pt")
        target_pt = os.path.join(base_dir, "garbage_best.pt")
        backup_pt = os.path.join(base_dir, "garbage_best_backup.pt")

        if os.path.exists(best_pt):
            if os.path.exists(target_pt):
                shutil.copy2(target_pt, backup_pt)
                print(f"[BACKUP] Previous best weights backed up to: {backup_pt}")
            shutil.copy2(best_pt, target_pt)
            print(f"\n[DEPLOY] Newly trained best model successfully deployed to: {target_pt}")
    except Exception as e:
        print(f"Note on auto-deploy: {e}")

    print("\n" + "=" * 65)
    print("       MODEL TRAINING COMPLETED SUCCESSFULLY!       ")
    print("=" * 65)

if __name__ == "__main__":
    resume_training()
