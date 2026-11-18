import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle, Calendar, ChevronDown, Focus, Layers, Leaf, Minus, Plus, Search, Video, X, MapPin, Truck, CheckCircle, Database, Navigation, Radio, Compass, Crosshair, ExternalLink, Smartphone, Activity
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
    truck: true,
    mobileStreamer: true
  });
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Live Mobile Edge Camera GPS Telemetry State
  const [liveMobileUnit, setLiveMobileUnit] = useState(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [userPos, setUserPos] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(L.layerGroup());
  const liveMobileLayerRef = useRef(L.layerGroup());
  const userLocationLayerRef = useRef(L.layerGroup());

  // Fetch detections from XAMPP MySQL
  const fetchCityDetections = async (city) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?city=${city}`);
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

  // High-frequency live polling of mobile streamer GPS status
  useEffect(() => {
    let isMounted = true;
    const fetchLiveStatus = async () => {
      try {
        const res = await fetch("/api/field_status");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.status === "success") {
            const gps = json.gps;
            const isLive = json.active || (gps && gps.active);
            if (gps && gps.latitude && gps.longitude) {
              setLiveMobileUnit({
                ...gps,
                active: isLive,
                fps: json.fps || 24,
                detectionsCount: json.count || 0
              });
            }
          }
        }
      } catch (err) {
        // network fluctuation
      }
    };

    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      liveMobileLayerRef.current.addTo(map);
      userLocationLayerRef.current.addTo(map);
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

  // Real-time Live Mobile Camera Unit GPS marker rendering
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    liveMobileLayerRef.current.clearLayers();

    if (!activeFilters.mobileStreamer || !liveMobileUnit || !liveMobileUnit.latitude || !liveMobileUnit.longitude) {
      return;
    }

    const { latitude, longitude, speed_kmh, accuracy_m, vehicle_id, fps, active } = liveMobileUnit;

    const ringAnim = active ? 'animation: mobile-radar 2s infinite ease-out;' : '';
    const ringBg = active ? 'rgba(16, 185, 129, 0.45)' : 'rgba(59, 130, 246, 0.25)';
    const borderColor = active ? '#10b981' : '#3b82f6';
    const glowShadow = active ? '0 0 16px rgba(16, 185, 129, 0.8), 0 4px 10px rgba(0,0,0,0.5)' : '0 0 10px rgba(59, 130, 246, 0.5), 0 4px 8px rgba(0,0,0,0.4)';
    const badgeText = active ? 'LIVE' : 'STANDBY';
    const badgeBg = active ? '#ef4444' : '#2563eb';

    // Glowing pulsating radar beacon icon
    const liveIcon = L.divIcon({
      className: 'live-mobile-marker-wrapper',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: ${ringBg};
            ${ringAnim}
          "></div>
          <div style="
            position: absolute;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #0f172a;
            border: 2.5px solid ${borderColor};
            box-shadow: ${glowShadow};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 17px;
          ">
            📹
          </div>
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            background: ${badgeBg};
            color: white;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 4px;
            border: 1px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            letter-spacing: 0.5px;
          ">${badgeText}</div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
    });

    const popupHtml = `
      <div style="min-width: 260px; font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${active ? '#ef4444' : '#3b82f6'}; box-shadow: 0 0 8px ${active ? '#ef4444' : '#3b82f6'};"></span>
            <b style="font-size: 13px; color: #0f172a;">${active ? 'Live Mobile Edge Camera' : 'Mobile Camera (Last Known)'}</b>
          </div>
          <span style="background: ${active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color: ${active ? '#059669' : '#2563eb'}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">
            ${active ? `● ${fps || 24} FPS LIVE` : 'STANDBY'}
          </span>
        </div>

        ${active ? `
          <div style="position: relative; width: 100%; height: 135px; background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            <img 
              src="/api/broadcast_stream" 
              alt="Live Stream Preview" 
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.style.display='none'"
            />
            <div style="position: absolute; top: 6px; left: 6px; background: rgba(15, 23, 42, 0.75); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px;">
              YOLOv8 EDGE FEED
            </div>
          </div>
        ` : `
          <div style="height: 80px; background: #0f172a; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; margin-bottom: 8px; text-align: center; padding: 6px;">
            <div style="font-size: 20px; margin-bottom: 2px;">📱</div>
            <b style="color: #f8fafc;">Camera Stream Standby</b>
            <span style="color: #64748b; font-size: 10px; margin-top: 2px;">Open <code>/cam</code> on phone to broadcast live stream</span>
          </div>
        `}

        <div style="font-size: 12px; color: #1e293b; margin-bottom: 4px;">
          <b>Vehicle Unit:</b> <span style="color: #2563eb; font-weight: 600;">${vehicle_id || 'MH-17-AG-501 (Ghanta Gadi)'}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px;">
          <span>Speed: <b style="color: #059669; font-size: 12px;">${speed_kmh || 0} km/h</b></span>
          <span>Accuracy: <b>±${accuracy_m || 3} meters</b></span>
        </div>

        <div style="font-size: 11px; font-family: monospace; color: #334155; background: #f1f5f9; padding: 5px 8px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
          📍 GPS: ${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E
        </div>

        <div style="display: flex; gap: 8px;">
          <button 
            id="btn-goto-live-cam"
            style="flex: 1; text-align: center; background: #2563eb; color: #fff; border: none; padding: 7px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
          >
            📹 Open Live Camera Hub
          </button>
          <a 
            href="https://www.google.com/maps?q=${latitude},${longitude}" 
            target="_blank" 
            rel="noreferrer" 
            style="display: flex; align-items: center; justify-content: center; background: #10b981; color: #fff; text-decoration: none; padding: 7px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;"
          >
            Google Maps
          </a>
        </div>
      </div>
    `;

    const marker = L.marker([latitude, longitude], { icon: liveIcon, zIndexOffset: 1000 })
      .bindPopup(popupHtml);

    marker.on('popupopen', () => {
      const btn = document.getElementById('btn-goto-live-cam');
      if (btn) {
        btn.onclick = () => {
          if (navigate) navigate("live-camera");
          else window.location.href = "/live-camera";
        };
      }
    });

    liveMobileLayerRef.current.addLayer(marker);
  }, [liveMobileUnit, activeFilters.mobileStreamer]);

  // Focus map on the live mobile camera unit
  const focusOnLiveMobile = () => {
    if (!mapInstanceRef.current || !liveMobileUnit || !liveMobileUnit.latitude) {
      alert("No mobile camera GPS coordinates available yet. Open /cam on phone.");
      return;
    }
    const { latitude, longitude } = liveMobileUnit;
    
    // Automatically switch city view if mobile camera is in Nashik or Ahilyanagar
    if (latitude > 19.8 && selectedCity !== "Nashik") {
      setSelectedCity("Nashik");
    } else if (latitude < 19.5 && selectedCity !== "Ahilyanagar") {
      setSelectedCity("Ahilyanagar");
    }
    mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 1.2 });
  };

  // Locate the user's current device (browser GPS)
  const locateUserDevice = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPos({ latitude, longitude, accuracy });

        if (mapInstanceRef.current) {
          userLocationLayerRef.current.clearLayers();

          const userIcon = L.divIcon({
            className: 'user-loc-beacon',
            html: `
              <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                <div style="
                  position: absolute;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: rgba(59, 130, 246, 0.4);
                  animation: mobile-radar 2s infinite ease-out;
                "></div>
                <div style="
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: #2563eb;
                  border: 3px solid #ffffff;
                  box-shadow: 0 0 10px rgba(37,99,235,0.7);
                "></div>
              </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17]
          });

          const userMarker = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 900 })
            .bindPopup(`
              <div style="font-size: 12px; padding: 4px;">
                <b style="color: #2563eb;">📍 Your Current Device Location</b>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                  Accuracy: ±${Math.round(accuracy)}m
                </div>
                <div style="font-size: 10px; font-family: monospace; color: #475569; margin-top: 4px;">
                  ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E
                </div>
              </div>
            `);

          userLocationLayerRef.current.addLayer(userMarker);
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
        }
      },
      (err) => {
        setIsLocatingUser(false);
        console.warn("Device location error:", err);
        alert(`Could not get device location: ${err.message}. Please check browser location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

          {/* Live Mobile Camera Unit Indicator */}
          <Card 
            onClick={focusOnLiveMobile}
            style={{ 
              padding: '8px 14px', 
              minWidth: '145px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2px', 
              cursor: liveMobileUnit?.active ? 'pointer' : 'default',
              border: liveMobileUnit?.active ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--line)',
              background: liveMobileUnit?.active ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface)',
              transition: 'all 0.2s ease'
            }}
            title={liveMobileUnit?.active ? "Click to fly to Live Mobile Camera on map" : "Mobile Camera is currently offline"}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: liveMobileUnit?.active ? '#059669' : 'var(--muted)', fontSize: '11px', fontWeight: 'bold' }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: liveMobileUnit?.active ? '#10B981' : '#94A3B8',
                boxShadow: liveMobileUnit?.active ? '0 0 8px #10B981' : 'none'
              }} />
              Live Mobile Unit
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: liveMobileUnit?.active ? '#10B981' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {liveMobileUnit?.active ? (
                <span>{liveMobileUnit.speed_kmh} km/h · Active</span>
              ) : (
                <span style={{ fontSize: '13px' }}>Standby</span>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Main Map Box */}
      <Card style={{ padding: 0, position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--line)' }}>
        <style>{`
          @keyframes mobile-radar {
            0% { transform: scale(0.6); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.6; }
            100% { transform: scale(2.0); opacity: 0; }
          }
        `}</style>

        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px', zIndex: 1 }} />

        {/* Live Mobile Camera Status Banner Overlay */}
        {liveMobileUnit && liveMobileUnit.active && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 56,
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            borderRadius: '10px',
            padding: '7px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            fontSize: '12px'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span>
              <b>Live Camera Unit:</b> {liveMobileUnit.vehicle_id} ({liveMobileUnit.speed_kmh} km/h)
            </span>
            <button
              onClick={focusOnLiveMobile}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🎯 Focus Unit
            </button>
          </div>
        )}

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

        {/* Quick Map Action Floating Buttons (Focus Camera & Locate Me) */}
        <div style={{ position: 'absolute', top: 68, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          {liveMobileUnit && liveMobileUnit.active && (
            <button
              onClick={focusOnLiveMobile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#0f172a',
                color: '#fff',
                border: '1.5px solid #10b981',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Fly to live mobile camera location"
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              🎯 Focus Camera ({liveMobileUnit.speed_kmh} km/h)
            </button>
          )}

          <button
            onClick={locateUserDevice}
            disabled={isLocatingUser}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'var(--surface, #ffffff)',
              color: '#2563eb',
              border: '1px solid var(--line)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Locate my device on map"
          >
            <Crosshair size={14} color="#2563eb" />
            {isLocatingUser ? "Locating..." : "📍 My Location"}
          </button>
        </div>

        {/* Filter Legend Overlay */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, padding: '10px 16px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 'bold', color: '#334155', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', flexWrap: 'wrap', border: '1px solid rgba(0,0,0,0.08)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: activeFilters.mobileStreamer ? 1 : 0.4 }} onClick={() => toggleFilter('mobileStreamer')}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} /> 📹 Live Mobile Camera
          </span>
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
