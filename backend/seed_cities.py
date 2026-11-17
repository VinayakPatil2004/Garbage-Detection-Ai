import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database

conn, db_type = database.get_db()
with conn.cursor() as cur:
    try:
        if db_type == 'mysql':
            cur.execute("ALTER TABLE detections ADD COLUMN city VARCHAR(50) DEFAULT 'Ahilyanagar' AFTER location_name")
        else:
            cur.execute("ALTER TABLE detections ADD COLUMN city TEXT DEFAULT 'Ahilyanagar'")
        print("City column added successfully!")
    except Exception as e:
        print("Notice on city column:", e)

    cur.execute("DELETE FROM detections")
    
    records = [
        # Ahilyanagar Records
        ('DET-AH-001', 'Delhi Gate, Savedi', 'Ahilyanagar', 19.1150, 74.7380, 'Plastic', 97.5, 'Critical', 'Pending', None, 'High volume of single-use plastic carry bags scattered along Delhi Gate pavement.'),
        ('DET-AH-002', 'Market Yard, Station Road', 'Ahilyanagar', 19.0910, 74.7420, 'Cardboard', 91.0, 'High', 'Assigned', 'TRK-101', 'Dumped commercial packaging boxes and vegetable crates near Gate 2.'),
        ('DET-AH-003', 'Maliwada Kotwali Chowk', 'Ahilyanagar', 19.0880, 74.7350, 'Metal', 89.5, 'Medium', 'In Progress', 'TRK-103', 'Crushed beverage cans and metal scraps reported near bus stop.'),
        ('DET-AH-004', 'Nalegaon Bhingar Road', 'Ahilyanagar', 19.0800, 74.7550, 'Paper', 86.0, 'Low', 'Cleaned', 'TRK-104', 'Pamphlets and paper waste - cleared by ward sanitary staff.'),
        ('DET-AH-005', 'MIDC Nagapur Industrial Zone', 'Ahilyanagar', 19.1550, 74.7150, 'Plastic', 94.2, 'High', 'Pending', None, 'Polymer scraps and plastic bags along industrial service road.'),

        # Nashik Records
        ('DET-NK-001', 'CBS Bus Stand, Old CBS', 'Nashik', 19.9970, 73.7880, 'Plastic', 98.2, 'Critical', 'Pending', None, 'Heavy accumulation of PET plastic bottles and disposable cups near terminal.'),
        ('DET-NK-002', 'College Road, Canada Corner', 'Nashik', 20.0050, 73.7650, 'Cardboard', 92.5, 'High', 'Assigned', 'TRK-102', 'Packaging boxes and fast-food wrappers on pavement.'),
        ('DET-NK-003', 'Panchavati, Ramkund Ghat', 'Nashik', 20.0080, 73.7920, 'Organic', 95.0, 'Medium', 'In Progress', 'TRK-102', 'Organic waste and bio-mass along Godavari river walk.'),
        ('DET-NK-004', 'Gangapur Road, Ward 12', 'Nashik', 20.0150, 73.7520, 'Paper', 88.0, 'Low', 'Cleaned', 'TRK-104', 'Residential paper litter - verified clean by surveillance camera.'),
        ('DET-NK-005', 'Satpur MIDC Service Road', 'Nashik', 19.9750, 73.7250, 'Metal', 93.4, 'High', 'Pending', None, 'Discarded metal sheets and industrial scraps blocking shoulder.')
    ]

    for r in records:
        if db_type == 'mysql':
            cur.execute("""
            INSERT INTO detections (tracking_id, location_name, city, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, r)
        else:
            cur.execute("""
            INSERT INTO detections (tracking_id, location_name, city, latitude, longitude, waste_type, confidence, severity, status, assigned_vehicle, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, r)
    if db_type == 'sqlite':
        conn.commit()

    print(f"✅ Successfully inserted {len(records)} Ahilyanagar & Nashik records into MySQL!")
conn.close()
