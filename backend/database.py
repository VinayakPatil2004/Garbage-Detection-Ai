"""
Database Management Module for Garbage Detection AI
Supports:
- Primary: MySQL / MariaDB via XAMPP (localhost:3306, user: root, db: garbage_detection_db)
- Automatic fallback: SQLite (backend/garbage_history.db) if XAMPP MySQL is not running
"""

import os
import time
import uuid
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
        notes = data.get('notes', 'Detected via AI Edge Camera')

        if db_type == "mysql":
            cursor.execute("""
            INSERT INTO detections (tracking_id, location_name, city, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (tracking_id, loc, city, lat, lng, wtype, conf, sev, status, vehicle, notes))
            new_id = cursor.lastrowid
        else:
            cursor.execute("""
            INSERT INTO detections (tracking_id, location_name, city, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tracking_id, loc, city, lat, lng, wtype, conf, sev, status, vehicle, notes))
            conn.commit()
            new_id = cursor.lastrowid

        return {"id": new_id, "tracking_id": tracking_id, "status": "success", "db": db_type}
    except Exception as e:
        print(f"Error adding detection: {e}")
        return {"status": "error", "message": str(e)}
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
            d['confidence'] = f"{float(d.get('confidence', 0)):.1f}%"
            d['location'] = d.get('location_name', '')
            d['type'] = d.get('waste_type', '')
            d['city'] = d.get('city', 'Ahilyanagar')
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

def delete_detection_record(det_id):
    """Deletes a detection record."""
    conn, db_type = get_db()
    cursor = conn.cursor()
    try:
        if db_type == "mysql":
            cursor.execute("DELETE FROM detections WHERE id = %s OR tracking_id = %s", (det_id, det_id))
        else:
            cursor.execute("DELETE FROM detections WHERE id = ? OR tracking_id = ?", (det_id, det_id))
            conn.commit()
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
