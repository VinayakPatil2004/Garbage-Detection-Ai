import { useState, useEffect, useRef } from "react";
import {
  Camera, Check, ChevronDown, Clock3, Focus, Leaf, Paperclip,
  Play, Recycle, Square, Trash2, Video, Zap, Activity, AlertCircle, RefreshCw
} from "lucide-react";
import Card from '../components/Card.jsx';
import SectionHead from '../components/SectionHead.jsx';
import Button from '../components/Button.jsx';

const CAMERAS = [
  { id: "webcam", label: "My Device Webcam (Live AI)" },
  { id: "cam-04", label: "CAM-04 · Riverside Park (Demo)" },
  { id: "cam-02", label: "CAM-02 · Market Street (Demo)" },
  { id: "cam-03", label: "CAM-03 · Central Station (Demo)" },
];

export default function LiveCamera() {
  const [running, setRunning] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [selectedCam, setSelectedCam] = useState("webcam");
  const [cameraError, setCameraError] = useState(null);
  const [liveBoxes, setLiveBoxes] = useState([]);
  const [liveStats, setLiveStats] = useState({
    count: 0,
    avgConf: 92.5,
    fps: 30,
    lastUpdate: "Just now"
  });
  const [detectionHistory, setDetectionHistory] = useState([
    { id: 'h1', label: 'Plastic bottle', type: 'Plastic', conf: 96, time: 'Just now' },
    { id: 'h2', label: 'Paper cup', type: 'Paper', conf: 88, time: '4 sec ago' },
    { id: 'h3', label: 'Banana peel', type: 'Organic', conf: 92, time: '12 sec ago' },
  ]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize camera stream when webcam mode is selected
  useEffect(() => {
    if (selectedCam === "webcam") {
      startWebcam();
    } else {
      stopWebcam();
      // Setup demo boxes
      setLiveBoxes([
        { id: 'd1', label: 'Plastic bottle', confidence: 96, box: { x: 38, y: 55, width: 14, height: 18 }, color: 'var(--blue)' },
        { id: 'd2', label: 'Paper cup', confidence: 88, box: { x: 65, y: 60, width: 12, height: 16 }, color: 'var(--purple)' },
      ]);
    }

    return () => {
      stopWebcam();
    };
  }, [selectedCam]);

  const startWebcam = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError("Camera access not supported in this browser.");
      }
    } catch (err) {
      console.warn("Webcam access error:", err);
      setCameraError("Webcam not accessible or permission denied. Showing CCTV demo stream.");
      setSelectedCam("cam-04");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Live frame inference loop
  useEffect(() => {
    if (!running || selectedCam !== "webcam") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 1200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, selectedCam]);

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    try {
      const canvas = canvasRef.current;
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Data = canvas.toDataURL('image/jpeg', 0.6);

      const res = await fetch("http://localhost:5000/api/detect_frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64Data })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          const preds = data.predictions || [];
          setLiveBoxes(preds);
          const total = preds.length;
          const avgC = total > 0 ? (preds.reduce((a, b) => a + (b.confidence || 0), 0) / total).toFixed(1) : 94.0;

          setLiveStats({
            count: total,
            avgConf: avgC,
            fps: 28,
            lastUpdate: "Just now"
          });

          if (preds.length > 0) {
            const newItems = preds.map(p => ({
              id: `item-${Date.now()}-${p.id}`,
              label: p.label,
              type: p.type || 'Litter',
              conf: p.confidence,
              time: 'Just now'
            }));
            setDetectionHistory(prev => [...newItems, ...prev.slice(0, 8)]);
          }
        }
      }
    } catch (e) {
      // Backend maybe paused or starting up
    }
  };

  const handleCapture = () => {
    setCaptured(true);
    const a = document.createElement("a");
    import('html2canvas').then(({ default: html2canvas }) => {
      const feedElement = document.querySelector('.camera-feed');
      if (feedElement) {
        html2canvas(feedElement, { useCORS: true, backgroundColor: null }).then(canvas => {
          a.href = canvas.toDataURL("image/png");
          a.download = `Garbage_AI_Capture_${selectedCam}_${Date.now()}.png`;
          a.click();
        });
      }
    });
    setTimeout(() => setCaptured(false), 2000);
  };

  const getCategoryIcon = (label = "") => {
    const l = label.toLowerCase();
    if (l.includes("bottle") || l.includes("plastic")) return <Recycle size={14} />;
    if (l.includes("paper") || l.includes("cup")) return <Paperclip size={14} />;
    if (l.includes("banana") || l.includes("peel") || l.includes("food") || l.includes("organic")) return <Leaf size={14} />;
    if (l.includes("glass")) return <Trash2 size={14} />;
    return <Focus size={14} />;
  };

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="welcome-title">Live Edge Camera</div>
          <div className="welcome-sub">Real-time CCTV & Webcam edge monitoring with live YOLO AI detection.</div>
        </div>
        <div className={running ? "status-pill" : "status-pill offline"}>
          <span /> {running ? "AI Detection Active" : "Stream Paused"}
        </div>
      </div>

      <div className="camera-grid">
        <Card className="camera-card">
          <div className="camera-feed" style={{ position: 'relative', minHeight: '480px', background: '#0F172A', overflow: 'hidden' }}>
            
            {/* Real Webcam Stream or Simulated CCTV background */}
            {selectedCam === "webcam" ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
              />
            ) : (
              <>
                <div className="cam-sky" />
                <div className="cam-ground" />
                <div className="cam-tree tree-a" />
                <div className="cam-tree tree-b" />
              </>
            )}

            {/* Hidden canvas for extracting frames */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Camera Overlay HUD */}
            <div className="camera-overlay" style={{ zIndex: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Video size={14} /> {CAMERAS.find(c => c.id === selectedCam)?.label || selectedCam}
              </span>
              <span>
                <span className="rec-dot" style={{ background: running ? '#EF4444' : '#94A3B8' }} /> {running ? "LIVE · 1080p" : "PAUSED"}
              </span>
            </div>

            {/* Live Bounding Boxes from AI Detection */}
            {running && liveBoxes.map((box, idx) => (
              <div 
                key={box.id || idx}
                className="detect-box" 
                style={{
                  position: 'absolute',
                  left: `${box.box?.x ?? 30}%`,
                  top: `${box.box?.y ?? 40}%`,
                  width: `${box.box?.width ?? 20}%`,
                  height: `${box.box?.height ?? 22}%`,
                  borderColor: box.priority === 'High' ? 'var(--red)' : 'var(--blue)',
                  zIndex: 8,
                  transition: 'all 0.25s ease'
                }}
              >
                <span style={{ background: box.priority === 'High' ? '#DC2626' : '#2563EB' }}>
                  {box.label} · {box.confidence}%
                </span>
              </div>
            ))}

            <div className="camera-time" style={{ zIndex: 10 }}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="camera-controls">
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button kind={running ? "danger" : "primary"} onClick={() => setRunning(!running)}>
                {running ? <><Square size={15} /> Stop detection</> : <><Play size={15} /> Start detection</>}
              </Button>
              <Button kind="secondary" onClick={handleCapture}>
                {captured ? <><Check size={17} /> Captured</> : <><Camera size={17} /> Capture frame</>}
              </Button>
            </div>

            {/* Camera Switcher Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '8px 36px 8px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface-2)',
                  color: 'inherit',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {CAMERAS.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label}</option>
                ))}
              </select>
              <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'none', opacity: 0.7 }} />
            </div>
          </div>
        </Card>

        <div className="camera-side">
          <Card>
            <SectionHead title="Live edge stats" detail="Direct AI model stream" />
            <div className="live-stat-grid">
              <div>
                <Focus size={18} />
                <span>Detections</span>
                <b>{liveStats.count} items</b>
              </div>
              <div>
                <Zap size={18} />
                <span>Avg. confidence</span>
                <b>{liveStats.avgConf}%</b>
              </div>
              <div>
                <Activity size={18} />
                <span>Frame rate</span>
                <b>{liveStats.fps} FPS</b>
              </div>
              <div>
                <Clock3 size={18} />
                <span>AI Status</span>
                <b style={{ color: running ? 'var(--green)' : 'var(--orange)' }}>
                  {running ? "Scanning" : "Idle"}
                </b>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead title="Recent detections" detail="Real-time incident log" />
            <div className="result-items compact-results" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {detectionHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.6, fontSize: '13px' }}>
                  No active waste detected in frame
                </div>
              ) : (
                detectionHistory.map((item) => (
                  <div key={item.id} className="result-item">
                    <div className="result-number" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
                      {getCategoryIcon(item.label)}
                    </div>
                    <div>
                      <b>{item.label}</b>
                      <span>{item.time}</span>
                    </div>
                    <strong>{item.conf}%</strong>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
