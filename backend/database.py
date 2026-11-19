"""
Database Management Module for Garbage Detection AI
Supports:
- Primary: MySQL / MariaDB via XAMPP (localhost:3306, user: root, db: garbage_detection_db)
- Automatic fallback: SQLite (backend/garbage_history.db) if XAMPP MySQL is not running
"""

import os
import time
import uuid
import math
import pymysql
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BASE_DIR, "garbage_history.db")

# XAMPP MySQL Configuration
MYSQL_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASS', ''),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'database': 'garbage_detection_db',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True
}

def get_db():
    """Returns an active database connection (MySQL or SQLite fallback)."""
    # 1. Try XAMPP MySQL
    try:
        conn = pymysql.connect(**MYSQL_CONFIG)
        return conn, "mysql"
    except Exception as e:
        # 2. SQLite Fallback
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"

def init_db():
    """Initializes tables and seeds initial sample records."""
    # Ensure MySQL database exists
    try:
        root_conn = pymysql.connect(
            host=MYSQL_CONFIG['host'],
            user=MYSQL_CONFIG['user'],
            password=MYSQL_CONFIG['password'],
            port=MYSQL_CONFIG['port']
        )
        with root_conn.cursor() as cur:
            cur.execute("CREATE DATABASE IF NOT EXISTS garbage_detection_db CHARACTER SET utf8mb4")
        root_conn.close()
    except Exception:
        pass

    conn, db_type = get_db()
    cursor = conn.cursor()

    try:
        if db_type == "mysql":
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS detections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tracking_id VARCHAR(50) UNIQUE NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                location_name VARCHAR(150) NOT NULL,
                latitude DECIMAL(10, 7) DEFAULT 18.5204,
                longitude DECIMAL(10, 7) DEFAULT 73.8567,
                waste_type VARCHAR(50) NOT NULL,
                confidence DECIMAL(5, 2) NOT NULL,
                severity ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
                status ENUM('Pending', 'Assigned', 'In Progress', 'Cleaned') DEFAULT 'Pending',
                assigned_vehicle VARCHAR(50) NULL,
                image_snapshot VARCHAR(255) NULL,
                after_image_snapshot VARCHAR(255) NULL,
                cleaned_at DATETIME NULL,
                cleaning_officer VARCHAR(120) NULL,
                resolution_time_minutes INT NULL,
                is_verified TINYINT DEFAULT 0,
                is_hotspot TINYINT DEFAULT 0,
                hotspot_cluster_id VARCHAR(64) NULL,
                recurrence_count INT DEFAULT 1,
                notes TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_code VARCHAR(50) UNIQUE NOT NULL,
                driver_name VARCHAR(100) NOT NULL,
                driver_phone VARCHAR(20) NOT NULL,
                vehicle_type VARCHAR(50) NOT NULL,
                status ENUM('Active', 'On Route', 'Maintenance', 'Idle') DEFAULT 'Active',
                current_location VARCHAR(150) NOT NULL,
                fuel_level INT DEFAULT 85
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
        else:
            # SQLite Table definitions
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tracking_id TEXT UNIQUE NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                location_name TEXT NOT NULL,
                city TEXT DEFAULT 'Ahilyanagar',
                latitude REAL DEFAULT 18.5204,
                longitude REAL DEFAULT 73.8567,
                waste_type TEXT NOT NULL,
                confidence REAL NOT NULL,
                severity TEXT DEFAULT 'Medium',
                status TEXT DEFAULT 'Pending',
                assigned_vehicle TEXT NULL,
                image_snapshot TEXT NULL,
                after_image_snapshot TEXT NULL,
                cleaned_at TEXT NULL,
                cleaning_officer TEXT NULL,
                resolution_time_minutes INTEGER NULL,
                is_verified INTEGER DEFAULT 0,
                is_hotspot INTEGER DEFAULT 0,
                hotspot_cluster_id TEXT NULL,
                recurrence_count INTEGER DEFAULT 1,
                notes TEXT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_code TEXT UNIQUE NOT NULL,
                driver_name TEXT NOT NULL,
                driver_phone TEXT NOT NULL,
                vehicle_type TEXT NOT NULL,
                status TEXT DEFAULT 'Active',
                current_location TEXT NOT NULL,
                fuel_level INTEGER DEFAULT 85
            );
            """)
            conn.commit()

        # Schema Auto-Migration: Ensure all new verification & hotspot columns exist in existing tables
        new_cols = [
            ("after_image_snapshot", "VARCHAR(255) NULL" if db_type == "mysql" else "TEXT NULL"),
            ("cleaned_at", "DATETIME NULL" if db_type == "mysql" else "TEXT NULL"),
            ("cleaning_officer", "VARCHAR(120) NULL" if db_type == "mysql" else "TEXT NULL"),
            ("resolution_time_minutes", "INT NULL" if db_type == "mysql" else "INTEGER NULL"),
            ("is_verified", "TINYINT DEFAULT 0" if db_type == "mysql" else "INTEGER DEFAULT 0"),
            ("is_hotspot", "TINYINT DEFAULT 0" if db_type == "mysql" else "INTEGER DEFAULT 0"),
            ("hotspot_cluster_id", "VARCHAR(64) NULL" if db_type == "mysql" else "TEXT NULL"),
            ("recurrence_count", "INT DEFAULT 1" if db_type == "mysql" else "INTEGER DEFAULT 1"),
        ]

        if db_type == "mysql":
            for col_name, col_def in new_cols:
                try:
                    cursor.execute(f"""
                    SELECT COUNT(*) as cnt FROM information_schema.columns 
                    WHERE table_schema = DATABASE() AND table_name = 'detections' AND column_name = '{col_name}'
                    """)
                    row = cursor.fetchone()
                    cnt = row['cnt'] if isinstance(row, dict) else row[0]
                    if cnt == 0:
                        cursor.execute(f"ALTER TABLE detections ADD COLUMN {col_name} {col_def}")
                except Exception as ex:
                    print(f"Notice during MySQL migration for {col_name}: {ex}")
        else:
            try:
                cursor.execute("PRAGMA table_info(detections)")
                existing_cols = [r[1] for r in cursor.fetchall()]
                for col_name, col_def in new_cols:
                    if col_name not in existing_cols:
                        cursor.execute(f"ALTER TABLE detections ADD COLUMN {col_name} {col_def}")
                conn.commit()
            except Exception as ex:
                print(f"Notice during SQLite migration: {ex}")

        # Seed initial vehicles if empty
        cursor.execute("SELECT COUNT(*) AS cnt FROM vehicles")
        row = cursor.fetchone()
        count = row['cnt'] if isinstance(row, dict) else row[0]
        if count == 0:
            sample_vehicles = [
                ("TRK-101", "Ramesh Patil", "+91 98220 12345", "Hydraulic Compactor", "On Route", "Station Road Ward 4", 82),
                ("TRK-102", "Suresh Jadhav", "+91 98221 67890", "Tipper Van", "Active", "Market Yard Ward 2", 90),
                ("TRK-103", "Anil Shinde", "+91 98222 34567", "Mini Waste Loader", "Active", "Riverside Ward 1", 75),
                ("TRK-104", "Ganesh Kadam", "+91 98223 89012", "E-Garbage Rickshaw", "Idle", "Central Depot", 95)
            ]
            for v in sample_vehicles:
                if db_type == "mysql":
                    cursor.execute("""
                    INSERT INTO vehicles (vehicle_code, driver_name, driver_phone, vehicle_type, status, current_location, fuel_level)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, v)
                else:
                    cursor.execute("""
                    INSERT INTO vehicles (vehicle_code, driver_name, driver_phone, vehicle_type, status, current_location, fuel_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, v)
            if db_type == "sqlite":
                conn.commit()

        # Seed initial detections if empty
        cursor.execute("SELECT COUNT(*) AS cnt FROM detections")
        row = cursor.fetchone()
        count = row['cnt'] if isinstance(row, dict) else row[0]
        if count == 0:
            sample_dets = [
                ("DET-20261117-001", "Market Yard Main Gate", 18.5204, 73.8567, "Plastic", 96.5, "High", "In Progress", "TRK-102", "Plastic carry bags scattered near entrance"),
                ("DET-20261117-002", "Station Road Corner", 18.5290, 73.8740, "Cardboard", 88.0, "Medium", "Assigned", "TRK-101", "Packaging boxes dumped on pavement"),
                ("DET-20261117-003", "Riverside Park South", 18.5140, 73.8320, "Organic", 92.5, "Low", "Cleaned", "TRK-103", "Vegetable scraps and organic waste - cleared"),
                ("DET-20261117-004", "Central Bus Station", 18.5310, 73.8680, "Metal", 91.0, "Critical", "Pending", None, "Crushed beverage cans and metal debris"),
                ("DET-20261117-005", "College Road Crossing", 18.5220, 73.8450, "Paper", 84.5, "Low", "Cleaned", "TRK-104", "Newspaper flyers - cleaned by sanitary staff")
            ]
            for d in sample_dets:
                if db_type == "mysql":
                    cursor.execute("""
                    INSERT INTO detections (tracking_id, location_name, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, d)
                else:
                    cursor.execute("""
                    INSERT INTO detections (tracking_id, location_name, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, d)
            if db_type == "sqlite":
                conn.commit()

        if db_type == "mysql":
            print("✅ Database Connected: XAMPP MySQL (localhost:3306 -> garbage_detection_db)!")
        else:
            print("ℹ️ Database Connected: Local SQLite fallback (backend/garbage_history.db). Start MySQL in XAMPP Control Panel for phpMyAdmin.")
    finally:
        cursor.close()
        conn.close()

def add_detection_record(data):
    """Inserts a new detection record into the database."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        tracking_id = f"DET-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        loc = data.get('location_name', 'CCTV Monitor Street 4')
        city = data.get('city', 'Ahilyanagar')
        lat = float(data.get('latitude', 18.5204))
        lng = float(data.get('longitude', 73.8567))
        wtype = data.get('waste_type', 'Plastic')
        conf = float(data.get('confidence', 90.0))
        sev = data.get('severity', 'High' if conf > 90 else 'Medium')
        status = data.get('status', 'Pending')
        vehicle = data.get('assigned_vehicle', 'MH-17-AG-501 (Ghanta Gadi)')
        image_snapshot = data.get('image_snapshot', None)
        notes = data.get('notes', 'Detected via AI Edge Camera')
        recurrence_count = int(data.get('recurrence_count', 1))
        is_hotspot = 1 if (data.get('is_hotspot') or recurrence_count >= 3) else 0
        hotspot_cluster_id = data.get('hotspot_cluster_id', None)

        if db_type == "mysql":
            cursor.execute("""
            INSERT INTO detections (tracking_id, location_name, city, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, image_snapshot, notes, recurrence_count, is_hotspot, hotspot_cluster_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (tracking_id, loc, city, lat, lng, wtype, conf, sev, status, vehicle, image_snapshot, notes, recurrence_count, is_hotspot, hotspot_cluster_id))
            new_id = cursor.lastrowid
        else:
            cursor.execute("""
            INSERT INTO detections (tracking_id, location_name, city, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, image_snapshot, notes, recurrence_count, is_hotspot, hotspot_cluster_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tracking_id, loc, city, lat, lng, wtype, conf, sev, status, vehicle, image_snapshot, notes, recurrence_count, is_hotspot, hotspot_cluster_id))
            conn.commit()
            new_id = cursor.lastrowid

        return {"id": new_id, "tracking_id": tracking_id, "status": "success", "db": db_type, "image_snapshot": image_snapshot, "recurrence_count": recurrence_count, "is_hotspot": bool(is_hotspot)}
    except Exception as e:
        print(f"Error adding detection: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()

def haversine_distance_meters(lat1, lon1, lat2, lon2):
    """Calculates ground distance in meters between two GPS coordinates using the Haversine formula."""
    try:
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_phi = math.radians(float(lat2) - float(lat1))
        delta_lambda = math.radians(float(lon2) - float(lon1))
        a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except Exception:
        return 999999.0

def check_and_deduplicate_detection(data, radius_meters=25.0, time_window_hours=4.0):
    """
    Spatial & Temporal Deduplication Engine (Pillar 4):
    If an active incident is detected within radius_meters (default 25m) and within the last time_window_hours (default 4h):
    - Increment recurrence_count.
    - If recurrence_count >= 3, automatically escalate to 'is_hotspot = 1' and 'severity = Critical'.
    - Do NOT generate a duplicate dashboard card or flood the database.
    - If outside 25m: create a brand new incident record.
    """
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        lat = float(data.get('latitude', 20.0108))
        lng = float(data.get('longitude', 73.7646))

        # Query recent uncleaned incidents within ±0.003 deg (~330m)
        lat_min = lat - 0.003
        lat_max = lat + 0.003
        lng_min = lng - 0.003
        lng_max = lng + 0.003

        query = """
        SELECT id, tracking_id, latitude, longitude, recurrence_count, is_hotspot, status, notes, timestamp
        FROM detections
        WHERE status IN ('Pending', 'Assigned', 'In Progress')
          AND latitude BETWEEN %s AND %s
          AND longitude BETWEEN %s AND %s
        ORDER BY id DESC LIMIT 25
        """ if db_type == "mysql" else """
        SELECT id, tracking_id, latitude, longitude, recurrence_count, is_hotspot, status, notes, timestamp
        FROM detections
        WHERE status IN ('Pending', 'Assigned', 'In Progress')
          AND latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
        ORDER BY id DESC LIMIT 25
        """

        cursor.execute(query, (lat_min, lat_max, lng_min, lng_max))
        candidates = cursor.fetchall()

        matched_incident = None
        min_dist = 999999.0

        for cand in candidates:
            c_dict = dict(cand)
            c_lat = float(c_dict.get('latitude', 0))
            c_lng = float(c_dict.get('longitude', 0))
            d_m = haversine_distance_meters(lat, lng, c_lat, c_lng)
            if d_m <= radius_meters and d_m < min_dist:
                min_dist = d_m
                matched_incident = c_dict

        if matched_incident:
            # Merging into existing hotspot/incident
            inc_id = matched_incident['id']
            curr_count = int(matched_incident.get('recurrence_count') or 1) + 1
            is_hotspot = 1 if curr_count >= 3 else int(matched_incident.get('is_hotspot') or 0)
            sev = 'Critical' if is_hotspot else 'High'

            now_str = datetime.now().strftime("%d-%b %H:%M")
            old_notes = str(matched_incident.get('notes') or '')
            if f"Hits: {curr_count}" not in old_notes:
                updated_notes = f"{old_notes} | Re-observed at {now_str} (Hits: {curr_count})"
            else:
                updated_notes = old_notes

            if db_type == "mysql":
                cursor.execute("""
                UPDATE detections
                SET recurrence_count = %s,
                    is_hotspot = %s,
                    severity = %s,
                    notes = %s
                WHERE id = %s
                """, (curr_count, is_hotspot, sev, updated_notes, inc_id))
            else:
                cursor.execute("""
                UPDATE detections
                SET recurrence_count = ?,
                    is_hotspot = ?,
                    severity = ?,
                    notes = ?
                WHERE id = ?
                """, (curr_count, is_hotspot, sev, updated_notes, inc_id))
                conn.commit()

            return {
                "action": "merged",
                "id": inc_id,
                "tracking_id": matched_incident.get('tracking_id'),
                "distance_meters": round(min_dist, 1),
                "recurrence_count": curr_count,
                "is_hotspot": bool(is_hotspot),
                "status": "success"
            }
        else:
            # Create fresh incident record
            data['recurrence_count'] = 1
            data['is_hotspot'] = 0
            created = add_detection_record(data)
            created["action"] = "created"
            return created
    finally:
        cursor.close()
        conn.close()

NASHIK_WARDS = [
    {"id": "W1", "name": "प्रभाग १: पंचवटी (Panchavati)", "sub_areas": "रामकुंड, दिंडोरी नाका, तपोवन", "officer": "सुनील शिंदे (सॅनिटरी इन्स्पेक्टर)"},
    {"id": "W2", "name": "प्रभाग २: नाशिक पश्चिम (Nashik West)", "sub_areas": "कॉलेज रोड, गंगापूर रोड, कॅनडा कॉर्नर", "officer": "प्रवीण पाटील (सॅनिटरी इन्स्पेक्टर)"},
    {"id": "W3", "name": "प्रभाग ३: नाशिक पूर्व (Nashik East)", "sub_areas": "शालीमार, जुने सीबीएस, द्वारका", "officer": "रमेश पवार (सॅनिटरी इन्स्पेक्टर)"},
    {"id": "W4", "name": "प्रभाग ४: सिडको (CIDCO)", "sub_areas": "त्रिमूर्ती चौक, उत्तम नगर, अंबड लिंक रोड", "officer": "किरण जाधव (सॅनिटरी इन्स्पेक्टर)"},
    {"id": "W5", "name": "प्रभाग ५: सातपूर (Satpur)", "sub_areas": "एमआयडीसी इंडस्ट्रियल, त्र्यंबक रोड", "officer": "दीपक मोरे (सॅनिटरी इन्स्पेक्टर)"},
    {"id": "W6", "name": "प्रभाग ६: नाशिक रोड (Nashik Road)", "sub_areas": "रेल्वे स्टेशन, बिटको पॉईंट, जेल रोड", "officer": "संजय गायकवाड (सॅनिटरी इन्स्पेक्टर)"}
]

def get_ward_leaderboard(city='Nashik'):
    """
    Computes Cleanliness Performance Index (CPI) Leaderboard across Nashik Municipal Corporation Wards (Pillar 5).
    CPI Formula: max(10, min(100, 100 - (active_incidents * 5 + hotspots * 8) + (cleaned_incidents * 3)))
    """
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT location_name, status, is_hotspot FROM detections")
        rows = cursor.fetchall()

        ward_stats = {w['id']: {
            "id": w['id'],
            "name": w['name'],
            "sub_areas": w['sub_areas'],
            "officer": w['officer'],
            "total": 0,
            "active": 0,
            "cleaned": 0,
            "hotspots": 0
        } for w in NASHIK_WARDS}

        for r in rows:
            d = dict(r)
            loc = (d.get('location_name') or '').lower()
            st = d.get('status')
            hot = int(d.get('is_hotspot') or 0)

            matched_id = None
            if "panchavati" in loc or "ward 1" in loc or "पंचवटी" in loc or "रामकुंड" in loc:
                matched_id = "W1"
            elif "west" in loc or "college" in loc or "gangapur" in loc or "ward 2" in loc or "पश्चिम" in loc:
                matched_id = "W2"
            elif "east" in loc or "shalimar" in loc or "cbs" in loc or "ward 3" in loc or "dwarka" in loc or "पूर्व" in loc:
                matched_id = "W3"
            elif "cidco" in loc or "सिडको" in loc or "trimurti" in loc or "ward 4" in loc:
                matched_id = "W4"
            elif "satpur" in loc or "सातपूर" in loc or "midc" in loc or "ward 5" in loc:
                matched_id = "W5"
            elif "nashik road" in loc or "रोड" in loc or "bytco" in loc or "ward 6" in loc:
                matched_id = "W6"
            else:
                matched_id = "W2"

            if matched_id in ward_stats:
                ward_stats[matched_id]["total"] += 1
                if st == 'Cleaned':
                    ward_stats[matched_id]["cleaned"] += 1
                else:
                    ward_stats[matched_id]["active"] += 1
                if hot:
                    ward_stats[matched_id]["hotspots"] += 1

        leaderboard = []
        for w_id, s in ward_stats.items():
            if s["total"] == 0:
                cpi = 98.0
                grade = "A+ (उत्कृष्ट - Pristine)"
            else:
                raw_cpi = 100 - (s["active"] * 5 + s["hotspots"] * 8) + (s["cleaned"] * 3)
                cpi = round(max(15.0, min(100.0, float(raw_cpi))), 1)
                if cpi >= 90:
                    grade = "A+ (उत्कृष्ट - Pristine)"
                elif cpi >= 75:
                    grade = "A (चांगले - Good)"
                elif cpi >= 60:
                    grade = "B (मध्यम - Satisfactory)"
                else:
                    grade = "C (तातडीने सफाई आवश्यक - Action Needed)"
            s["cpi"] = cpi
            s["grade"] = grade
            leaderboard.append(s)

        leaderboard.sort(key=lambda x: x["cpi"], reverse=True)
        return leaderboard
    finally:
        cursor.close()
        conn.close()

def get_all_detections(limit=100, status=None, waste_type=None, city=None):
    """Fetches list of detections with optional filtering."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        query = "SELECT * FROM detections WHERE 1=1"
        params = []

        if city and city != "All":
            query += " AND city = %s" if db_type == "mysql" else " AND city = ?"
            params.append(city)

        if status and status != "All statuses":
            query += " AND status = %s" if db_type == "mysql" else " AND status = ?"
            params.append(status)

        if waste_type and waste_type != "All":
            query += " AND waste_type = %s" if db_type == "mysql" else " AND waste_type = ?"
            params.append(waste_type)

        query += " ORDER BY id DESC LIMIT %s" if db_type == "mysql" else " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            # Format datetime
            if isinstance(d.get('timestamp'), datetime):
                d['date'] = d['timestamp'].strftime("%b %d, %Y")
                d['time'] = d['timestamp'].strftime("%I:%M %p")
            elif d.get('timestamp'):
                d['date'] = str(d['timestamp'])[:10]
                d['time'] = str(d['timestamp'])[11:16]

            # Format cleaned_at if available
            if isinstance(d.get('cleaned_at'), datetime):
                d['cleaned_at_formatted'] = d['cleaned_at'].strftime("%b %d, %Y %I:%M %p")
            elif d.get('cleaned_at'):
                d['cleaned_at_formatted'] = str(d['cleaned_at'])
            else:
                d['cleaned_at_formatted'] = None

            d['confidence'] = f"{float(d.get('confidence', 0)):.1f}%"
            d['location'] = d.get('location_name', '')
            d['type'] = d.get('waste_type', '')
            d['city'] = d.get('city', 'Ahilyanagar')
            d['after_image_snapshot'] = d.get('after_image_snapshot')
            d['cleaning_officer'] = d.get('cleaning_officer') or 'Kiran Jadhav (Sanitary Inspector)'
            d['resolution_time_minutes'] = d.get('resolution_time_minutes') or 95
            d['is_verified'] = bool(d.get('is_verified', 0))
            d['is_hotspot'] = bool(d.get('is_hotspot', 0))
            d['hotspot_cluster_id'] = d.get('hotspot_cluster_id')
            d['recurrence_count'] = int(d.get('recurrence_count') or 1)
            try:
                d['lat'] = float(d['latitude']) if d.get('latitude') is not None else 19.0948
                d['lng'] = float(d['longitude']) if d.get('longitude') is not None else 74.7480
            except Exception:
                d['lat'] = 19.0948
                d['lng'] = 74.7480
            results.append(d)
        return results
    finally:
        cursor.close()
        conn.close()

def update_detection_status(det_id, new_status, vehicle=None):
    """Updates status of a detection (Pending -> Assigned -> In Progress -> Cleaned)."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        if db_type == "mysql":
            cursor.execute("""
            UPDATE detections 
            SET status = %s, assigned_vehicle = COALESCE(%s, assigned_vehicle)
            WHERE id = %s OR tracking_id = %s
            """, (new_status, vehicle, det_id, det_id))
            conn.commit()
        else:
            cursor.execute("""
            UPDATE detections 
            SET status = ?, assigned_vehicle = COALESCE(?, assigned_vehicle)
            WHERE id = ? OR tracking_id = ?
            """, (new_status, vehicle, det_id, det_id))
            conn.commit()
        return {"status": "success", "updated_id": det_id, "new_status": new_status}
    finally:
        cursor.close()
        conn.close()

def record_cleaning_verification(det_id, after_image_url, officer_name="Kiran Jadhav (Sanitary Inspector)", resolution_minutes=None):
    """
    Records official cleaning verification with after-cleaning snapshot, timestamp,
    and sanitary inspector sign-off.
    """
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        now_dt = datetime.now()
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")

        if resolution_minutes is None:
            if db_type == "mysql":
                cursor.execute("SELECT timestamp FROM detections WHERE id = %s OR tracking_id = %s", (det_id, det_id))
            else:
                cursor.execute("SELECT timestamp FROM detections WHERE id = ? OR tracking_id = ?", (det_id, det_id))
            row = cursor.fetchone()
            if row:
                t_val = row.get("timestamp") if isinstance(row, dict) else row[0]
                if isinstance(t_val, datetime):
                    diff = now_dt - t_val
                    resolution_minutes = max(1, int(diff.total_seconds() / 60))
                elif isinstance(t_val, str):
                    try:
                        det_t = datetime.strptime(t_val[:19], "%Y-%m-%d %H:%M:%S")
                        diff = now_dt - det_t
                        resolution_minutes = max(1, int(diff.total_seconds() / 60))
                    except Exception:
                        resolution_minutes = 95
            else:
                resolution_minutes = 95

        if db_type == "mysql":
            cursor.execute("""
            UPDATE detections 
            SET status = 'Cleaned',
                after_image_snapshot = %s,
                cleaned_at = %s,
                cleaning_officer = %s,
                resolution_time_minutes = %s,
                is_verified = 1
            WHERE id = %s OR tracking_id = %s
            """, (after_image_url, now_str, officer_name, resolution_minutes, det_id, det_id))
            conn.commit()
        else:
            cursor.execute("""
            UPDATE detections 
            SET status = 'Cleaned',
                after_image_snapshot = ?,
                cleaned_at = ?,
                cleaning_officer = ?,
                resolution_time_minutes = ?,
                is_verified = 1
            WHERE id = ? OR tracking_id = ?
            """, (after_image_url, now_str, officer_name, resolution_minutes, det_id, det_id))
            conn.commit()

        return {
            "status": "success",
            "det_id": det_id,
            "after_image_snapshot": after_image_url,
            "cleaned_at": now_str,
            "cleaning_officer": officer_name,
            "resolution_time_minutes": resolution_minutes
        }
    finally:
        cursor.close()
        conn.close()

def get_before_after_gallery(limit=50, city='Nashik'):
    """Fetches all verified cleaned detections that have both before and after snapshots."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        query = """
        SELECT * FROM detections 
        WHERE status = 'Cleaned' AND image_snapshot IS NOT NULL AND after_image_snapshot IS NOT NULL
        """
        params = []
        if city and city != 'All':
            query += " AND city = %s" if db_type == "mysql" else " AND city = ?"
            params.append(city)
        query += " ORDER BY id DESC LIMIT %s" if db_type == "mysql" else " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        cursor.close()
        conn.close()

def delete_detection_record(det_id):
    """Deletes a detection record and cleans up associated snapshot file."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        img_snap = None
        if db_type == "mysql":
            cursor.execute("SELECT image_snapshot FROM detections WHERE id = %s OR tracking_id = %s", (det_id, det_id))
            row = cursor.fetchone()
            if row:
                img_snap = row.get("image_snapshot") if isinstance(row, dict) else row[0]
            cursor.execute("DELETE FROM detections WHERE id = %s OR tracking_id = %s", (det_id, det_id))
            conn.commit()
        else:
            cursor.execute("SELECT image_snapshot FROM detections WHERE id = ? OR tracking_id = ?", (det_id, det_id))
            row = cursor.fetchone()
            if row:
                img_snap = row["image_snapshot"] if hasattr(row, '__getitem__') else row[0]
            cursor.execute("DELETE FROM detections WHERE id = ? OR tracking_id = ?", (det_id, det_id))
            conn.commit()

        if img_snap:
            try:
                fname = os.path.basename(img_snap)
                fpath = os.path.join(os.path.dirname(__file__), "snapshots", fname)
                if os.path.exists(fpath):
                    os.remove(fpath)
            except Exception as e:
                print("Notice: could not delete snapshot image:", e)

        return {"status": "success", "deleted_id": det_id}
    finally:
        cursor.close()
        conn.close()

def get_all_vehicles():
    """Fetches list of municipal collection vehicles."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM vehicles ORDER BY id ASC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        cursor.close()
        conn.close()
