import os
import shutil
import time

def separate_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(base_dir, "Dataset")
    source_dir = os.path.join(dataset_dir, "Garbage Data")
    positive_dir = os.path.join(dataset_dir, "Positive img")
    negative_dir = os.path.join(dataset_dir, "Negative img")

    os.makedirs(positive_dir, exist_ok=True)
    os.makedirs(negative_dir, exist_ok=True)

    if not os.path.exists(source_dir):
        print(f"Source folder not found: {source_dir}")
        return

    files = os.listdir(source_dir)
    print(f"Total files in 'Garbage Data' to process: {len(files)}")

    # Known garbage classification prefixes (Kaggle classes + TACO numeric & IMG_ dataset)
    garbage_prefixes = (
        'cardboard', 'glass', 'plastic', 'metal', 'paper',
        'trash', 'battery', 'biological', 'clothes', 'shoes',
        '000', 'img_'
    )

    pos_count = 0
    neg_count = 0
    start_time = time.time()

    for i, filename in enumerate(files):
        src_path = os.path.join(source_dir, filename)
        name_lower = filename.lower()

        # Check if file belongs to garbage categories
        if name_lower.startswith(garbage_prefixes):
            dest_path = os.path.join(positive_dir, filename)
            shutil.move(src_path, dest_path)
            pos_count += 1
        else:
            # Everything else (WhatsApp images, CCTV street shots, personal photos, videos)
            dest_path = os.path.join(negative_dir, filename)
            shutil.move(src_path, dest_path)
            neg_count += 1

        if (i + 1) % 5000 == 0:
            print(f"Processed {i + 1}/{len(files)} files... (Garbage: {pos_count}, Non-Garbage: {neg_count})")

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "="*50)
    print("      DATASET SEPARATION COMPLETED SUCCESSFULLY!   ")
    print("="*50)
    print(f"Time taken: {elapsed} seconds")
    print(f"[POSITIVE] Garbage images: {pos_count} files -> {positive_dir}")
    print(f"[NEGATIVE] Non-Garbage images: {neg_count} files -> {negative_dir}")
    
    # Check remaining files in Garbage Data
    remaining = len(os.listdir(source_dir))
    print(f"Remaining in 'Garbage Data': {remaining}")

if __name__ == "__main__":
    separate_dataset()
