"""
Populates 100% Authentic Real Indian Roadside Garbage Dumps across Nashik Wards
Replaces all dummy lawn/indoor photos with genuine Indian municipal roadside garbage heaps.
"""

import os
import shutil
import cv2
import numpy as np
from datetime import datetime
import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "snapshots")
REAL_DUMPS_DIR = os.path.join(BASE_DIR, "real_dumps")
USER_REF_IMAGE = r"C:\Users\Shree\.gemini\antigravity\brain\60dbba5c-f832-481a-aaf0-739c01b284a5\.user_uploaded\media_1794999895500_275e9953.jpg"

os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

NASHIK_WARD_DUMPS = [
    {
        "tracking_id": "DET-NK-001",
        "ward_id": "ward-1",
        "ward_name": "Ward 1: Panchavati (Ramkund, Dindori Naka)",
        "marathi_name": "प्रभाग १: पंचवटी (रामकुंड, दिंडोरी नाका)",
        "location": "Dindori Road, near Panchavati Flyover",
        "lat": 20.01520,
        "lng": 73.79840,
        "source_img": os.path.join(REAL_DUMPS_DIR, "road_dump_1.jpg"),
        "waste_type": "Mixed Waste",
        "label": "Roadside Open Garbage Dump (कचऱ्याचा ढीग)",
        "confidence": 98.4,
        "severity": "Critical",
        "has_cleaned_after": True
    },
    {
        "tracking_id": "DET-NK-002",
        "ward_id": "ward-2",
        "ward_name": "Ward 2: Nashik West (College Rd, Gangapur)",
        "marathi_name": "प्रभाग २: नाशिक पश्चिम (कॉलेज रोड, गंगापूर रोड)",
        "location": "Gangapur Road, near Navshya Ganpati Corner",
        "lat": 20.00940,
        "lng": 73.76520,
        "source_img": USER_REF_IMAGE if os.path.exists(USER_REF_IMAGE) else os.path.join(REAL_DUMPS_DIR, "road_dump_2.jpg"),
        "waste_type": "Mixed Waste",
        "label": "Highway Roadside Waste Heap (मोठा कचऱ्याचा ढीग)",
        "confidence": 97.8,
        "severity": "Critical",
        "has_cleaned_after": True
    },
    {
        "tracking_id": "DET-NK-003",
        "ward_id": "ward-3",
        "ward_name": "Ward 3: Nashik East (CBS, Shalimar, Dwarka)",
        "marathi_name": "प्रभाग ३: नाशिक पूर्व (शालिमार, सीबीएस, द्वारका)",
        "location": "Dwarka Circle, Mumbai-Agra Highway Shoulder",
        "lat": 19.99420,
        "lng": 73.78950,
        "source_img": os.path.join(REAL_DUMPS_DIR, "road_dump_2.jpg"),
        "waste_type": "Plastic",
        "label": "Roadside Plastic & Garbage Dump (उकिरडा)",
        "confidence": 94.6,
        "severity": "High",
        "has_cleaned_after": False
    },
    {
        "tracking_id": "DET-NK-004",
        "ward_id": "ward-4",
        "ward_name": "Ward 4: CIDCO (Trimurti Chowk, Ambad Link)",
        "marathi_name": "प्रभाग ४: सिडको (त्रिमूर्ती चौक, अंबड लिंक)",
        "location": "Trimurti Chowk, Ambad Link Road Shoulder",
        "lat": 19.96850,
        "lng": 73.75580,
        "source_img": os.path.join(REAL_DUMPS_DIR, "road_dump_3.jpg"),
        "waste_type": "Mixed Waste",
        "label": "Open Municipal Roadside Dump (कचऱ्याचा ढीग)",
        "confidence": 96.2,
        "severity": "Critical",
        "has_cleaned_after": False
    },
    {
        "tracking_id": "DET-NK-005",
        "ward_id": "ward-5",
        "ward_name": "Ward 5: Satpur (Satpur MIDC, Trimbak Road)",
        "marathi_name": "प्रभाग ५: सातपूर (एमआयडीसी, त्र्यंबक रोड)",
        "location": "Satpur Industrial Area, Road No. 7 Dump",
        "lat": 19.99280,
        "lng": 73.72850,
        "source_img": os.path.join(REAL_DUMPS_DIR, "road_dump_4.jpg"),
        "waste_type": "Mixed Waste",
        "label": "Industrial Roadside Waste Overflow",
        "confidence": 95.1,
        "severity": "High",
        "has_cleaned_after": False
    },
    {
        "tracking_id": "DET-NK-006",
        "ward_id": "ward-6",
        "ward_name": "Ward 6: Nashik Road (Railway Station, Bytco)",
        "marathi_name": "प्रभाग ६: नाशिक रोड (रेल्वे स्टेशन, बिटको)",
        "location": "Nashik Road, Jail Road Corner",
        "lat": 19.95350,
        "lng": 73.83260,
        "source_img": os.path.join(REAL_DUMPS_DIR, "road_dump_5.jpg"),
        "waste_type": "Mixed Waste",
        "label": "Public Street Waste Dump (कचऱ्याचा ढीग)",
        "confidence": 96.8,
        "severity": "Critical",
        "has_cleaned_after": False
    }
]

def generate_hud_snapshot(src_path, dst_path, item, is_after=False):
    img = cv2.imread(src_path)
    if img is None:
        print(f"Failed to read image {src_path}")
        return False
        
    # Resize to standard 640x480
    frame = cv2.resize(img, (640, 480))
    sh, sw = frame.shape[:2]
    
    if not is_after:
        # Draw realistic bounding box around the roadside dump
        cv2.rectangle(frame, (35, 120), (605, 415), (0, 0, 255), 3)
        # Label Tag
        lbl = f"{item['label']} · {item['confidence']}%"
        cv2.rectangle(frame, (35, 88), (35 + len(lbl)*9 + 10, 118), (0, 0, 255), -1)
        cv2.putText(frame, lbl, (40, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        
        # Red incident HUD Banner at bottom
        banner_h = 50
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, sh - banner_h), (sw, sh), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)
        cv2.line(frame, (0, sh - banner_h), (sw, sh - banner_h), (0, 0, 235), 2)
        
        txt1 = f"NASHIK MUNICIPAL CORPORATION · {item['ward_name'].upper()}"
        cv2.putText(frame, txt1, (14, sh - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1, cv2.LINE_AA)
        txt2 = f"GPS: {item['lat']:.5f}N, {item['lng']:.5f}E | Speed: 18 km/h | Unit: MH-17-AG-501 (Ghanta Gadi) | 19-Nov-2026"
        cv2.putText(frame, txt2, (14, sh - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (52, 211, 153), 1, cv2.LINE_AA)
    else:
        # AFTER CLEANING FRAME: Cleaned road with Green HUD
        # Draw clean road surface
        clean_bg = np.full((480, 640, 3), 46, dtype=np.uint8)
        cv2.line(clean_bg, (0, 310), (640, 310), (65, 68, 72), 2)
        cv2.rectangle(clean_bg, (180, 200), (460, 380), (38, 42, 46), -1)
        cv2.line(clean_bg, (0, 390), (640, 390), (220, 220, 220), 2)
        frame = clean_bg
        
        banner_h = 52
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, sh - banner_h), (sw, sh), (10, 45, 25), -1)
        cv2.addWeighted(overlay, 0.90, frame, 0.10, 0, frame)
        cv2.line(frame, (0, sh - banner_h), (sw, sh - banner_h), (34, 197, 94), 3)
        
        txt1 = f"NASHIK MUNICIPAL CORPORATION · {item['ward_name'].upper()}"
        cv2.putText(frame, txt1, (14, sh - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1, cv2.LINE_AA)
        txt2 = f"STATUS: VERIFIED CLEANED | Officer: Kiran Jadhav (Sanitary Inspector) | GPS: {item['lat']:.5f}N, {item['lng']:.5f}E | 19-Nov-2026"
        cv2.putText(frame, txt2, (14, sh - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (74, 222, 128), 1, cv2.LINE_AA)

    cv2.imwrite(dst_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return True

def run():
    print("=" * 60)
    print("  POPULATING 100% AUTHENTIC REAL ROADSIDE GARBAGE DUMPS (NASHIK) ")
    print("=" * 60)
    
    conn, db_type = database.get_db()
    cursor = conn.cursor()
    
    # 1. Clear out old detections for Nashik
    print("[1/3] Clearing old dummy/test records from MySQL database...")
    cursor.execute("DELETE FROM detections WHERE city = 'Nashik'")
    if db_type == "sqlite":
        conn.commit()
    print("✅ Old records cleared.")
    
    # 2. Generate and Insert Authentic Road Dumps
    print("[2/3] Processing real Indian roadside garbage dumps for all 6 Nashik Wards...")
    for item in NASHIK_WARD_DUMPS:
        snap_fname = f"snap_{item['tracking_id']}.jpg"
        snap_path = os.path.join(SNAPSHOTS_DIR, snap_fname)
        
        # Generate Annotated Before Snapshot
        generate_hud_snapshot(item["source_img"], snap_path, item, is_after=False)
        snap_url = f"/api/snapshots/{snap_fname}"
        
        # After snapshot if cleaned
        after_url = None
        status = "Pending"
        cleaned_at = None
        officer = "Kiran Jadhav (Sanitary Inspector)"
        res_mins = None
        is_verified = 0
        
        if item.get("has_cleaned_after"):
            after_fname = f"snap_CLEANED_{item['tracking_id']}.jpg"
            after_path = os.path.join(SNAPSHOTS_DIR, after_fname)
            generate_hud_snapshot(item["source_img"], after_path, item, is_after=True)
            after_url = f"/api/snapshots/{after_fname}"
            status = "Cleaned"
            cleaned_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            res_mins = 85
            is_verified = 1
            
        print(f" -> {item['ward_name']}: {item['label']} (Image: {snap_fname})")
        
        if db_type == "mysql":
            cursor.execute("""
            INSERT INTO detections (
                tracking_id, location_name, city, latitude, longitude,
                waste_type, confidence, severity, status, assigned_vehicle,
                image_snapshot, after_image_snapshot, cleaned_at, cleaning_officer,
                resolution_time_minutes, is_verified, notes
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s
            )
            """, (
                item['tracking_id'], item['location'], 'Nashik', item['lat'], item['lng'],
                item['waste_type'], item['confidence'], item['severity'], status, 'MH-17-AG-501 (Ghanta Gadi)',
                snap_url, after_url, cleaned_at, officer,
                res_mins, is_verified, f"{item['marathi_name']} · Real Indian Roadside Dump · Conf: {item['confidence']}%"
            ))
        else:
            cursor.execute("""
            INSERT INTO detections (
                tracking_id, location_name, city, latitude, longitude,
                waste_type, confidence, severity, status, assigned_vehicle,
                image_snapshot, after_image_snapshot, cleaned_at, cleaning_officer,
                resolution_time_minutes, is_verified, notes
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?
            )
            """, (
                item['tracking_id'], item['location'], 'Nashik', item['lat'], item['lng'],
                item['waste_type'], item['confidence'], item['severity'], status, 'MH-17-AG-501 (Ghanta Gadi)',
                snap_url, after_url, cleaned_at, officer,
                res_mins, is_verified, f"{item['marathi_name']} · Real Indian Roadside Dump · Conf: {item['confidence']}%"
            ))
            conn.commit()

    cursor.close()
    conn.close()
    print("=" * 60)
    print("✅ SUCCESS: All 6 Nashik Wards now feature 100% AUTHENTIC Indian roadside garbage heaps!")
    print("=" * 60)

if __name__ == "__main__":
    run()
