import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle, Calendar, ChevronDown, Focus, Layers, Leaf, Minus, Plus, Search, Video, X, MapPin, Truck, CheckCircle, Database, Navigation
} from "lucide-react";
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CITIES = {
  Ahilyanagar: {
    name: "Ahilyanagar (अहिल्यानगर)",
    center: [19.0948, 74.7480],
    zoom: 13,
    cameras: [
      { id: "cam-ah-01", name: "CAM-01 · Savedi Delhi Gate", lat: 19.1170, lng: 74.7390, status: "Online" },
      { id: "cam-ah-02", name: "CAM-02 · Market Yard Gate 2", lat: 19.0920, lng: 74.7440, status: "Online" },
      { id: "cam-ah-03", name: "CAM-03 · Maliwada Chowk", lat: 19.0870, lng: 74.7360, status: "Online" }
    ],
    trucks: [
      { id: "TRK-101", name: "Truck TRK-101 (Ramesh Patil)", lat: 19.1020, lng: 74.7410, route: "Delhi Gate -> Savedi Line" },
      { id: "TRK-103", name: "Loader TRK-103 (Anil Shinde)", lat: 19.0850, lng: 74.7500, route: "Nalegaon Depot" }
    ]
  },
  Nashik: {
    name: "Nashik (नाशिक)",
    center: [19.9975, 73.7898],
    zoom: 13,
    cameras: [
      { id: "cam-nk-01", name: "CAM-01 · Old CBS Bus Terminal", lat: 19.9980, lng: 73.7870, status: "Online" },
      { id: "cam-nk-02", name: "CAM-02 · College Road Corner", lat: 20.0060, lng: 73.7660, status: "Online" },
      { id: "cam-nk-03", name: "CAM-03 · Ramkund Godavari Ghat", lat: 20.0090, lng: 73.7930, status: "Online" }
    ],
    trucks: [
      { id: "TRK-102", name: "Truck TRK-102 (Suresh Jadhav)", lat: 20.0010, lng: 73.7780, route: "CBS -> College Road" },
      { id: "TRK-104", name: "Van TRK-104 (Ganesh Kadam)", lat: 19.9800, lng: 73.7350, route: "Satpur MIDC Service" }
    ]
  }
};

export default function MapPage({ navigate }) {
  const [selectedCity, setSelectedCity] = useState("Ahilyanagar");
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    hotspot: true,
    camera: true,
    clean: true,
    truck: true
  });
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(L.layerGroup());

  // Fetch detections from XAMPP MySQL
  const fetchCityDetections = async (city) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/history?city=${city}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDetections(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not load city detections from backend:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCityDetections(selectedCity);
  }, [selectedCity]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const cityData = CITIES[selectedCity];
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(cityData.center, cityData.zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      L.control.zoom({ position: 'topleft' }).addTo(map);
      markersLayerRef.current.addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view and markers when city or detections change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const cityData = CITIES[selectedCity];
    mapInstanceRef.current.flyTo(cityData.center, cityData.zoom, { duration: 1.0 });

    // Clear previous markers
    markersLayerRef.current.clearLayers();

    // 1. Add Waste Detection Markers from XAMPP MySQL
    detections.forEach((det) => {
      const isClean = det.status === "Cleaned";
      if (isClean && !activeFilters.clean) return;
      if (!isClean && !activeFilters.hotspot) return;

      const lat = det.lat || det.latitude;
      const lng = det.lng || det.longitude;
      if (!lat || !lng) return;

      let bgColor = "#ef4444"; // Red for Critical/Pending
      let iconSymbol = "🗑️";
      if (isClean) {
        bgColor = "#10b981"; // Green
        iconSymbol = "✓";
      } else if (det.severity === "Medium" || det.severity === "Low") {
        bgColor = "#f59e0b"; // Orange
      }

      const icon = L.divIcon({
        className: 'custom-waste-marker',
        html: `
          <div style="
            background: ${bgColor};
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 15px;
            border: 3px solid white;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            cursor: pointer;
            transition: transform 0.2s ease;
          ">${iconSymbol}</div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });

      const popupHtml = `
        <div style="min-width: 220px; font-family: inherit; padding: 4px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #0f172a;">${det.location_name || det.location}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;"><b>Tracking ID:</b> <code>${det.tracking_id}</code></div>
          <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="background: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">${det.waste_type || det.type}</span>
            <span style="background: ${bgColor}20; color: ${bgColor}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">${det.confidence}</span>
            <span style="background: rgba(0,0,0,0.06); padding: 2px 8px; border-radius: 6px; font-size: 11px;">Status: <b>${det.status}</b></span>
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 10px; line-height: 1.4;">${det.notes || 'AI localized street waste'}</div>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            Assigned: <b>${det.assigned_vehicle || 'Unassigned'}</b>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon }).bindPopup(popupHtml);
      marker.on('click', () => setSelectedItem(det));
      markersLayerRef.current.addLayer(marker);
    });

    // 2. Add CCTV Camera Markers
    if (activeFilters.camera) {
      cityData.cameras.forEach(cam => {
        const camIcon = L.divIcon({
          className: 'cctv-marker',
          html: `
            <div style="
              background: #2563eb;
              color: white;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              border: 2px solid white;
              box-shadow: 0 3px 10px rgba(37,99,235,0.4);
              cursor: pointer;
            ">📹</div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16]
        });

        const camPopup = `
          <div style="min-width: 180px;">
            <b style="font-size: 13px;">${cam.name}</b>
            <div style="font-size: 12px; color: #10b981; margin-top: 4px;">● AI Video Stream Active (30 FPS)</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Edge YOLOv8s Surveillance Node</div>
          </div>
        `;
        const marker = L.marker([cam.lat, cam.lng], { icon: camIcon }).bindPopup(camPopup);
        markersLayerRef.current.addLayer(marker);
      });
    }

    // 3. Add Municipal Garbage Trucks
    if (activeFilters.truck) {
      cityData.trucks.forEach(trk => {
        const truckIcon = L.divIcon({
          className: 'fleet-truck-marker',
          html: `
            <div style="
              background: #1e293b;
              color: #60a5fa;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              border: 3px solid white;
              box-shadow: 0 4px 14px rgba(0,0,0,0.4);
              cursor: pointer;
            ">🚛</div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        });

        const truckPopup = `
          <div style="min-width: 200px;">
            <b style="font-size: 13px; color: #1e293b;">${trk.name}</b>
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">Route: <b>${trk.route}</b></div>
            <div style="font-size: 11px; color: #10b981; margin-top: 2px;">● Status: Active Waste Collection</div>
          </div>
        `;
        const marker = L.marker([trk.lat, trk.lng], { icon: truckIcon }).bindPopup(truckPopup);
        markersLayerRef.current.addLayer(marker);
      });
    }

  }, [selectedCity, detections, activeFilters]);

  // Handle Search Location
  const handleSearch = (e) => {
    e.preventDefault();
    if (!search || !mapInstanceRef.current) return;
    const match = detections.find(d => 
      (d.location_name || d.location || "").toLowerCase().includes(search.toLowerCase())
    );
    if (match) {
      const lat = match.lat || match.latitude;
      const lng = match.lng || match.longitude;
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
    } else {
      alert(`Location "${search}" not found in current city records.`);
    }
  };

  const toggleFilter = (key) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeHotspotsCount = detections.filter(d => d.status !== "Cleaned").length;
  const cleanedCount = detections.filter(d => d.status === "Cleaned").length;

  return (
    <div className="page-content map-page" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & City Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '14px', flexShrink: 0 }}>
        <div>
          <div className="welcome-title">Smart City Waste GIS Map</div>
          <div className="welcome-sub">
            Live municipal GIS overview of waste hotspots, CCTV nodes, and collection fleet in <b>{selectedCity}</b>.
          </div>
        </div>

        {/* 2 City Switcher Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface)', padding: '4px', borderRadius: '12px', border: '1px solid var(--line)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <button
            onClick={() => setSelectedCity("Ahilyanagar")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: selectedCity === "Ahilyanagar" ? 'var(--primary, #10B981)' : 'transparent',
              color: selectedCity === "Ahilyanagar" ? 'white' : 'var(--ink)'
            }}
          >
            <MapPin size={15} /> 1. Ahilyanagar (अहिल्यानगर)
          </button>
          <button
            onClick={() => setSelectedCity("Nashik")}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: selectedCity === "Nashik" ? 'var(--primary, #10B981)' : 'transparent',
              color: selectedCity === "Nashik" ? 'white' : 'var(--ink)'
            }}
          >
            <MapPin size={15} /> 2. Nashik (नाशिक)
          </button>
        </div>

        {/* City Stats Indicators */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Card style={{ padding: '8px 14px', minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '11px', fontWeight: 'bold' }}>
              <AlertTriangle size={13} color="var(--red, #ef4444)" /> Active Hotspots
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--red, #ef4444)' }}>{activeHotspotsCount}</div>
          </Card>
          <Card style={{ padding: '8px 14px', minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '11px', fontWeight: 'bold' }}>
              <CheckCircle size={13} color="var(--green, #10B981)" /> Cleaned Areas
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--green, #10B981)' }}>{cleanedCount}</div>
          </Card>
          <Card style={{ padding: '8px 14px', minWidth: '130px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '11px', fontWeight: 'bold' }}>
              <Truck size={13} color="var(--blue, #3B82F6)" /> Fleet on Duty
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{CITIES[selectedCity].trucks.length} Trucks</div>
          </Card>
        </div>
      </div>

      {/* Main Map Box */}
      <Card style={{ padding: 0, position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--line)' }}>
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px', zIndex: 1 }} />

        {/* Search Bar Overlay */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: '280px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface, #ffffff)', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid var(--line)' }}>
            <Search size={16} style={{ color: 'var(--muted)', marginRight: '8px' }} />
            <input
              placeholder={`Search in ${selectedCity}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: '13px', color: 'var(--ink)' }}
            />
            {search && <X size={14} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setSearch("")} />}
          </form>
        </div>

        {/* Filter Legend Overlay */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, padding: '10px 16px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 'bold', color: '#334155', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', flexWrap: 'wrap', border: '1px solid rgba(0,0,0,0.08)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: activeFilters.hotspot ? 1 : 0.4 }} onClick={() => toggleFilter('hotspot')}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> 🗑️ Garbage Hotspots
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: activeFilters.clean ? 1 : 0.4 }} onClick={() => toggleFilter('clean')}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /> ✓ Clean Areas
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: activeFilters.camera ? 1 : 0.4 }} onClick={() => toggleFilter('camera')}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb' }} /> 📹 CCTV Nodes
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: activeFilters.truck ? 1 : 0.4 }} onClick={() => toggleFilter('truck')}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e293b' }} /> 🚛 Waste Trucks
          </span>
        </div>
      </Card>
    </div>
  );
}
