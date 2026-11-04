# 🗑️ Real-Time Garbage & Waste Detection AI

या मॉडेलद्वारे कॅमेरा (Webcam), सीसीटीव्ही (CCTV RTSP Stream), व्हिडिओ किंवा फोटोमधून कचरा (Garbage/Waste/Litter) ओळखून त्याचे वर्गीकरण (Plastic, Paper, Organic, Glass, Metal) केले जाते. तसेच कचरा आढळल्यास आपोआप फोटोसह ईमेल अलर्ट देखील पाठवले जातात.

---

## 🚀 १. चालवण्यासाठी कमांड्स (How to Run)

प्रोजेक्टच्या व्हर्च्युअल एन्व्हायरनमेंट (`gpu_env`) सह चालवा:

### अ) Webcam (लॅपटॉप कॅमेऱ्याद्वारे):
```bash
..\gpu_env\Scripts\python.exe detect.py --source 0
```

### ब) इमेज / फोटो तपासण्यासाठी:
```bash
..\gpu_env\Scripts\python.exe detect.py --source "../backend/Dataset/Garbage Data/000015.jpg"
```

### क) व्हिडिओ फाईल तपासण्यासाठी:
```bash
..\gpu_env\Scripts\python.exe detect.py --source "video.mp4"
```

### ड) CCTV कॅमेरा (RTSP Stream द्वारे):
```bash
..\gpu_env\Scripts\python.exe detect.py --source "rtsp://username:password@camera_ip:554/stream1"
```

---

## ⚙️ २. कॉन्फिगरेशन (`config.py`)

- `MODEL_PATH`: मॉडेल फाईलचा पाथ (डिफॉल्ट: `backend/yolov8s.pt` किंवा `garbage_best.pt`).
- `CONFIDENCE_THRESHOLD`: डिटेक्शन अचूकतेची मर्यादा (उदा. `0.25`).
- `SHOW_WINDOW`: लाईव्ह स्क्रीन विंडो दाखवायची की नाही (`True`/`False`).
- `ENABLE_EMAIL_ALERTS`: कचरा आढळल्यास ईमेल पाठवायचा का (`True`/`False`).
- `EMAIL_SENDER` व `EMAIL_PASSWORD`: Gmail App Password.
- `EMAIL_RECEIVER`: ज्या ईमेलवर अलर्ट पाठवायचे आहेत तो ईमेल.

---

## 🎯 ३. ओळखले जाणारे कचऱ्याचे प्रकार (Detected Waste Categories)

| वर्ग (Class) | श्रेणी (Category) | रंग (Color) |
|---|---|---|
| Plastic bottle, container | Recyclable Plastic (PET) | निळा (Blue) |
| Plastic bag, pouch | Soft Plastic (LDPE) | फिकट निळा |
| Paper cup, book | Paper / Cardboard | जांभळा (Purple) |
| Banana peel, fruit/food scrap | Organic Waste (Compostable) | केशरी (Orange) |
| Glass bottle / shard | Glass Waste (Hazardous) | लाल (Red) |
| General litter / trash | Solid Waste | पिवळा/लाल |

---

## ⌨️ शॉर्टकट कीज (Hotkeys)
- **`q`** : डिटेक्शन बंद करण्यासाठी (Quit)
- **`s`** : लाईव्ह फ्रेमचा स्नॅपशॉट मॅन्युअली सेव्ह करण्यासाठी (Save Snapshot to `alerts/`)
