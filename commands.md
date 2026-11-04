# 🚀 Garbage Detection AI - System Run Commands

या प्रोजेक्टमध्ये **Frontend (React 19 + Vite + TailwindCSS)** आणि **AI Backend (Python Flask + YOLOv8 Dual Models + CUDA GPU Acceleration)** एकत्रितपणे (Integrated) चालवले जातात.

---

## ⚡ एकाच क्लिकवर सर्व सुरू करण्यासाठी (Easiest Way):
प्रोजेक्टच्या मुख्य फोल्डरमधील **`run_all.bat`** फाईलवर डबल-क्लिक करा.  
हे बॅकएंड आणि फ्रंटएंड दोन्ही वेगवेगळ्या विंडोमध्ये आपोआप सुरू करेल आणि मॉडेल लोड करेल!

---

## 🛠️ मॅन्युअली स्वतंत्र सुरू करण्यासाठी (Manual Terminal Commands):

### 1️⃣ AI Backend सुरू करण्यासाठी (Terminal 1)
हे Python Flask सर्व्हर, कस्टमाइझ केलेले `garbage_best.pt` क्लासिफायर आणि `yolov8s.pt` ऑब्जेक्ट डिटेक्टर GPU (RTX 3050) वर चालवते:

```powershell
# मुख्य डिरेक्टरीमध्ये असताना:
.\gpu_env\Scripts\python.exe backend/app.py
```
किंवा **`run_backend.bat`** वर डबल-क्लिक करा.
- 👉 **Backend API URL:** `http://localhost:5000`
- 👉 **Health Status तपासा:** `http://localhost:5000/api/health`

---

### 2️⃣ Frontend डॅशबोर्ड सुरू करण्यासाठी (Terminal 2)
```powershell
cd frontend
npm run dev
```
किंवा **`run_frontend.bat`** वर डबल-क्लिक करा.
- 👉 Browser मध्ये `http://localhost:8443` उघडा.

---

### 3️⃣ Live Webcam / Edge CCTV Detection (थेट कॅमेऱ्याद्वारे):
तुम्ही दोन प्रकारे थेट कॅमेरा वापरू शकता:

- **पर्याय अ: थेट वेब डॅशबोर्डमध्ये (Browser द्वारे):**
  - ब्राउझरमध्ये `Live Camera` पेजवर जा.
  - Dropdown मधून **"My Device Webcam (Live AI)"** निवडा.
  - कॅमेरा आपोआप सुरू होईल आणि थेट AI मॉडेलद्वारे कचरा ओळखून रिअल-टाइम Bounding Boxes दाखवेल.

- **पर्याय ब: OpenCV Desktop Window द्वारे:**
  ```powershell
  # Webcam द्वारे चालवण्यासाठी:
  .\gpu_env\Scripts\python.exe garbage_detection/detect.py --source 0

  # फोटो तपासण्यासाठी:
  .\gpu_env\Scripts\python.exe garbage_detection/detect.py --source "backend/Dataset/Positive img/000000.jpg"
  ```
  *(टीप: बाहेर पडण्यासाठी 'q' दाबा आणि स्नॅपशॉट सेव्ह करण्यासाठी 's' दाबा).*

---

### 4️⃣ नवीन डेटासेटवर मॉडेल ट्रेनिंग सुरू करण्यासाठी (Model Training):
तुम्ही दोन प्रकारे ट्रेनिंग सुरू करू शकता:

- **पर्याय १: एका क्लिकवर (Easiest):**
  प्रोजेक्टच्या मुख्य फोल्डरमधील **`train_classifier.bat`** फाईलवर डबल-क्लिक करा.

- **पर्याय २: PowerShell / Terminal द्वारे:**
  ```powershell
  # मुख्य डिरेक्टरीमध्ये असताना GPU वर पूर्ण 100 Epochs चे ट्रेनिंग सुरू करा:
  .\gpu_env\Scripts\python.exe backend/train_classifier.py --epochs 100
  ```

*ट्रेनिंग चेकपॉईंटवरून पुन्हा पुढे सुरू करण्यासाठी (Resume):*
- **एका क्लिकवर:** मुख्य फोल्डरमधील **`resume_training.bat`** वर डबल-क्लिक करा.
- **PowerShell द्वारे:**
  ```powershell
  .\gpu_env\Scripts\python.exe backend/resume_training.py
  ```
*(टीप: हे आधी थांबलेल्या Epoch वरून ट्रेनिंग पुढे सुरू करेल आणि पूर्ण झाल्यावर नवीन `best.pt` मॉडेल आपोआप `backend/garbage_best.pt` म्हणून सेव्ह होईल).*






####################################################################################################


# टर्मिनल १ (Backend):
.\gpu_env\Scripts\python.exe backend/app.py

# टर्मिनल २ (Frontend):
cd frontend
npm run dev

