import { useState, useEffect, useRef } from "react";
import {
  Camera, Check, ChevronDown, Clock3, Focus, Leaf, Paperclip,
  Play, Recycle, Square, Trash2, Video, Zap, Activity, AlertCircle, RefreshCw, Smartphone, ExternalLink
} from "lucide-react";
import Card from '../components/Card.jsx';
import SectionHead from '../components/SectionHead.jsx';
import Button from '../components/Button.jsx';

const CAMERAS = [
  { id: "mobile-broadcast", label: "☁️ Mobile Field Unit (Cloudflare Live)" },
  { id: "mobile-ip", label: "📱 Local IP Webcam (Wi-Fi App)" },
  { id: "webcam", label: "💻 Device Webcam (Laptop/Phone)" },
  { id: "cam-04", label: "CAM-04 · Ahilyanagar Delhi Gate (Demo)" },
  { id: "cam-02", label: "CAM-02 · Nashik College Road (Demo)" },
  { id: "cam-03", label: "CAM-03 · Central Station (Demo)" },
];

export default function LiveCamera() {
  const [running, setRunning] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [selectedCam, setSelectedCam] = useState("webcam");
  const [mobileIpUrl, setMobileIpUrl] = useState("http://192.168.1.35:8080/video");
  const [activeMobileUrl, setActiveMobileUrl] = useState("http://192.168.1.35:8080/video");
  const [streamMode, setStreamMode] = useState("ai"); // 'ai' or 'direct'
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
    { id: 'h2', label: 'Cardboard box', type: 'Paper', conf: 88, time: '4 sec ago' },
  ]);

  const videoRef = useRef(null);
  const mobileImgRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const isSendingRef = useRef(false);

  // Initialize camera stream when webcam mode is selected
  useEffect(() => {
    if (selectedCam === "webcam") {
      startWebcam();
    } else {
      stopWebcam();
      if (selectedCam !== "webcam" && selectedCam !== "mobile-ip" && selectedCam !== "mobile-broadcast") {
        // Setup demo boxes for simulated cams
        setLiveBoxes([
          { id: 'd1', label: 'Plastic bottle', confidence: 96, box: { x: 38, y: 55, width: 14, height: 18 }, color: 'var(--blue)' },
          { id: 'd2', label: 'Paper cup', confidence: 88, box: { x: 65, y: 60, width: 12, height: 16 }, color: 'var(--purple)' },
        ]);
      } else {
        setLiveBoxes([]);
      }
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
    if (!running || (selectedCam !== "webcam" && selectedCam !== "mobile-ip")) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      captureAndSendFrame();
    }, selectedCam === "webcam" ? 70 : 600);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, selectedCam, activeMobileUrl]);

  // Live stats sync for Cloudflare Mobile Field Broadcast
  useEffect(() => {
    if (selectedCam !== "mobile-broadcast" || !running) return;

    const pollFieldStatus = async () => {
      try {
        const res = await fetch("/api/field_status");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            setLiveStats({
              count: data.count || 0,
              avgConf: data.avg_confidence || 94.0,
              fps: data.fps || 24,
              lastUpdate: "Just now"
            });
            if (data.predictions && data.predictions.length > 0) {
              const newItems = data.predictions.map(p => ({
                id: `item-${Date.now()}-${p.id || Math.random()}`,
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
      }
    };

    pollFieldStatus();
    const interval = setInterval(pollFieldStatus, 1200);
    return () => clearInterval(interval);
  }, [selectedCam, running]);

  const captureAndSendFrame = async () => {
    if (isSendingRef.current) return;
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 540;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    if (selectedCam === "webcam") {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      isSendingRef.current = true;
      canvas.toBlob(async (blob) => {
        if (!blob) {
          isSendingRef.current = false;
          return;
        }
        try {
          const res = await fetch("/api/upload_frame", {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: blob
          });

          if (res.ok) {
            const data = await res.json();
            if (data.predictions) {
              const preds = data.predictions;
              setLiveBoxes(preds);
              const total = preds.length;
              const avgC = total > 0 ? (preds.reduce((a, b) => a + (b.confidence || 0), 0) / total).toFixed(1) : 94.0;

              setLiveStats({
                count: total,
                avgConf: avgC,
                fps: 24,
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
        } finally {
          isSendingRef.current = false;
        }
      }, 'image/jpeg', 0.50);

    } else if (selectedCam === "mobile-ip") {
      if (!activeMobileUrl) return;
      isSendingRef.current = true;
      try {
        const res = await fetch("/api/detect_ipcam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: activeMobileUrl, city: "Ahilyanagar", location: "Mobile IP Camera" })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            const preds = data.predictions || [];
            setLiveBoxes(preds);
            const total = preds.length;
            const avgC = total > 0 ? (preds.reduce((a, b) => a + (b.confidence || 0), 0) / total).toFixed(1) : 94.0;
            setLiveStats({ count: total, avgConf: avgC, fps: 20, lastUpdate: "Just now" });
          }
        }
      } catch (e) {
      } finally {
        isSendingRef.current = false;
      }
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

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="welcome-title">Live Edge Camera</div>
          <div className="welcome-sub">
            Real-time CCTV, Webcam & Mobile IP Camera edge monitoring with live YOLOv8 AI detection.
          </div>
        </div>
        <div className={running ? "status-pill" : "status-pill offline"}>
          <span /> {running ? "AI Detection Active" : "Stream Paused"}
        </div>
      </div>

      {/* Mobile IP Stream Configuration Bar */}
      {selectedCam === "mobile-ip" && (
        <Card style={{ marginBottom: '16px', padding: '14px 20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Smartphone size={22} color="#10B981" />
              <div>
                <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Mobile IP Camera URL:</b>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Enter the IP shown at the bottom of your phone in IP Webcam app:
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '520px', alignItems: 'center' }}>
              <input
                value={mobileIpUrl}
                onChange={(e) => setMobileIpUrl(e.target.value)}
                placeholder="http://192.168.1.35:8080/video"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '13px', color: 'var(--ink)' }}
              />
              <Button kind="primary" onClick={() => {
                const target = mobileIpUrl.trim() || "http://192.168.1.35:8080/video";
                setMobileIpUrl(target);
                setActiveMobileUrl(target);
              }}>
                Connect
              </Button>
              <button
                type="button"
                onClick={() => setStreamMode(streamMode === 'ai' ? 'direct' : 'ai')}
                title="Toggle between AI GPU stream (processed via backend) and Direct LAN stream"
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #10B981',
                  background: streamMode === 'ai' ? '#10B981' : 'transparent',
                  color: streamMode === 'ai' ? '#fff' : '#10B981',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {streamMode === 'ai' ? '⚡ AI Stream' : '📡 Direct LAN'}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💡 For 60 FPS GPU window: double-click <b>run_mobile_ip_cam.bat</b></span>
            </div>
          </div>
        </Card>
      )}

      {/* Cloudflare Mobile Broadcast Information Banner */}
      {selectedCam === "mobile-broadcast" && (
        <Card style={{ marginBottom: '16px', padding: '14px 20px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Smartphone size={22} color="#3B82F6" />
              <div>
                <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Mobile Streamer Mode (No Dashboard on Phone):</b>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  On your mobile phone, open: <code style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.12)', color: '#2563EB', fontWeight: 700 }}>/cam</code> at the end of the Cloudflare link (e.g. <span style={{ color: '#10B981', fontWeight: 600 }}>https://...trycloudflare.com/cam</span>)
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="rec-dot" style={{ background: '#10B981' }} /> Listening for Live Mobile Transmission
            </div>
          </div>
        </Card>
      )}

      <div className="camera-layout">
        <Card className="camera-card">
          <div className="camera-feed" style={{ position: 'relative', minHeight: '480px', background: '#0F172A', overflow: 'hidden' }}>

            {/* Cloudflare Remote Mobile Broadcast Feed */}
            {selectedCam === "mobile-broadcast" && (
              <img
                src="/api/broadcast_stream"
                alt="Cloudflare Mobile Broadcast Feed"
                style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0, background: '#000' }}
              />
            )}

            {/* Real Webcam Stream */}
            {selectedCam === "webcam" && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
              />
            )}

            {/* Mobile Phone IP Stream */}
            {selectedCam === "mobile-ip" && (
              activeMobileUrl ? (
                <img
                  ref={mobileImgRef}
                  key={`${activeMobileUrl}-${streamMode}`}
                  src={streamMode === 'ai'
                    ? `/api/stream_feed?url=${encodeURIComponent(activeMobileUrl)}`
                    : activeMobileUrl}
                  alt="Mobile IP Webcam Feed"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0, background: '#000' }}
                  onError={() => {
                    setCameraError("Cannot connect to mobile IP. Ensure phone is on same Wi-Fi and IP Webcam server is running.");
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '440px', color: '#94A3B8', textAlign: 'center', padding: '30px' }}>
                  <Smartphone size={56} color="#10B981" style={{ marginBottom: '16px' }} />
                  <h3 style={{ color: '#F8FAFC', marginBottom: '8px', fontSize: '18px' }}>Mobile Camera Not Connected</h3>
                  <p style={{ maxWidth: '480px', fontSize: '13px', lineHeight: '1.6', marginBottom: '18px', color: '#CBD5E1' }}>
                    1. Open <b>IP Webcam</b> app on Android phone & tap <b>Start server</b>.<br />
                    2. Check the IP shown on mobile screen (e.g. <code>http://192.168.1.35:8080</code>).<br />
                    3. Enter it in the input above and click <b>Connect</b>.
                  </p>
                  <Button kind="primary" onClick={() => {
                    const target = mobileIpUrl.trim() || "http://192.168.1.35:8080/video";
                    setMobileIpUrl(target);
                    setActiveMobileUrl(target);
                  }}>
                    Connect Phone Stream
                  </Button>
                </div>
              )
            )}

            {/* Simulated Demo Background */}
            {selectedCam !== "webcam" && selectedCam !== "mobile-ip" && selectedCam !== "mobile-broadcast" && (
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
            {running && selectedCam !== "mobile-broadcast" && liveBoxes.map((box, idx) => (
              <div
                key={box.id || idx}
                className="detect-box"
                style={{
                  position: 'absolute',
                  left: `${box.box?.x ?? 30}%`,
                  top: `${box.box?.y ?? 40}%`,
                  width: `${box.box?.width ?? 20}%`,
                  height: `${box.box?.height ?? 22}%`,
                  borderColor: box.priority === 'High' ? 'var(--red, #ef4444)' : 'var(--blue, #3b82f6)',
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
                  background: 'var(--surface-2, #f1f5f9)',
                  color: 'inherit',
                  border: '1px solid var(--border, #cbd5e1)',
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
                <b style={{ color: running ? 'var(--green, #10b981)' : 'var(--muted)' }}>
                  {running ? "Scanning" : "Idle"}
                </b>
              </div>
            </div>
          </Card>

          <Card className="recent-log-card">
            <SectionHead title="Recent detections" detail="Real-time incident log" />
            <div className="log-list">
              {detectionHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="log-item">
                  <div className="log-icon">
                    <Recycle size={15} />
                  </div>
                  <div className="log-info">
                    <b>{item.label}</b>
                    <span>{item.time}</span>
                  </div>
                  <div className="log-badge">{item.conf}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
