import { useState, useEffect, useRef } from "react";
import { 
  Camera, Video, VideoOff, SwitchCamera, Zap, Wifi, WifiOff, 
  MapPin, CheckCircle2, AlertTriangle, ArrowLeft, ShieldCheck
} from "lucide-react";

export default function MobileStreamer() {
  const [streaming, setStreaming] = useState(true);
  const [facingMode, setFacingMode] = useState("environment"); // environment = back camera
  const [fps, setFps] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [city, setCity] = useState("Ahilyanagar");
  const [vehicleId, setVehicleId] = useState("MH-17-AG-501 (Ghanta Gadi)");
  const [lastDetection, setLastDetection] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const isSendingRef = useRef(false);
  const framesCountRef = useRef(0);
  const fpsTimerRef = useRef(null);

  // Initialize camera stream
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check if torch / flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError("Camera permission denied or camera not available. Please allow camera access in browser settings.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn("Torch error:", e);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
  };

  // FPS calculation ticker
  useEffect(() => {
    fpsTimerRef.current = setInterval(() => {
      setFps(framesCountRef.current);
      framesCountRef.current = 0;
    }, 1000);
    return () => clearInterval(fpsTimerRef.current);
  }, []);

  // Frame streaming loop: runs at high frequency (~15-20 FPS)
  useEffect(() => {
    if (!streaming) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      captureAndSend();
    }, 60); // 60ms interval = up to 16 FPS

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [streaming]);

  const captureAndSend = () => {
    if (isSendingRef.current) return;
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    // Send high-speed optimized 540x360 frame
    canvas.width = 540;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
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
          framesCountRef.current += 1;
          setBytesSent(prev => prev + blob.size);
          const data = await res.json();
          if (data.predictions && data.predictions.length > 0) {
            setLastDetection({
              time: new Date().toLocaleTimeString(),
              count: data.predictions.length,
              labels: data.predictions.map(p => p.label).join(", ")
            });
          }
        }
      } catch (err) {
        // network fluctuation
      } finally {
        isSendingRef.current = false;
      }
    }, 'image/jpeg', 0.52);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0B0F19',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top Header Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: '14px 18px',
        background: 'linear-gradient(to bottom, rgba(11,15,25,0.92) 0%, rgba(11,15,25,0) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: streaming ? '#EF4444' : '#94A3B8',
            boxShadow: streaming ? '0 0 12px #EF4444' : 'none',
            animation: streaming ? 'pulse 1.5s infinite' : 'none'
          }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', color: '#fff' }}>
              {streaming ? "LIVE MUNICIPAL STREAM" : "STREAM PAUSED"}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {vehicleId}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {fps} FPS
          </div>
          <select 
            value={city} 
            onChange={(e) => setCity(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '11px',
              outline: 'none'
            }}
          >
            <option value="Ahilyanagar">Ahilyanagar</option>
            <option value="Nashik">Nashik</option>
          </select>
        </div>
      </div>

      {/* Main Full-Screen Camera Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Reticle / Aim Overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '240px',
          height: '240px',
          border: '1.5px dashed rgba(255,255,255,0.25)',
          borderRadius: '16px',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            bottom: '-28px',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.5px'
          }}>
            POINT AT ROAD / LITTER
          </div>
        </div>

        {/* Recent Detection Notification Banner on Mobile */}
        {lastDetection && (
          <div style={{
            position: 'absolute',
            top: '75px',
            left: '16px',
            right: '16px',
            background: 'rgba(239, 68, 68, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 25,
            animation: 'fadeIn 0.3s ease'
          }}>
            <AlertTriangle size={20} color="#fff" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                AI Alert: {lastDetection.count} Waste Object(s) Detected!
              </div>
              <div style={{ fontSize: '11px', color: '#FEE2E2' }}>
                {lastDetection.labels} · Logged to Central Database ({lastDetection.time})
              </div>
            </div>
          </div>
        )}

        {/* Error overlay if camera is blocked */}
        {cameraError && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11,15,25,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
            textAlign: 'center',
            zIndex: 30
          }}>
            <Camera size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>Camera Permission Needed</h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px', lineHeight: 1.5 }}>
              {cameraError}
            </p>
            <button
              onClick={startCamera}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#10B981',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: '20px 24px 30px',
        background: 'linear-gradient(to top, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around'
      }}>
        {/* Toggle Stream (Pause / Resume) */}
        <button
          onClick={() => setStreaming(!streaming)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: streaming ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `2px solid ${streaming ? '#EF4444' : '#10B981'}`,
            color: streaming ? '#EF4444' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title={streaming ? "Pause Stream" : "Resume Stream"}
        >
          {streaming ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        {/* Big Shutter / Status Center Button */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <ShieldCheck size={32} />
          </div>
          <span style={{ fontSize: '10px', color: '#94A3B8', letterSpacing: '0.5px' }}>
            TRANSMITTING
          </span>
        </div>

        {/* Flip Front / Back Camera */}
        <button
          onClick={toggleFacingMode}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Switch Camera (Front/Rear)"
        >
          <SwitchCamera size={24} />
        </button>

        {/* Flashlight / Torch toggle if supported */}
        {hasTorch && (
          <button
            onClick={toggleTorch}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: torchOn ? '#F59E0B' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${torchOn ? '#F59E0B' : 'rgba(255,255,255,0.2)'}`,
              color: torchOn ? '#000' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Toggle Flashlight"
          >
            <Zap size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
