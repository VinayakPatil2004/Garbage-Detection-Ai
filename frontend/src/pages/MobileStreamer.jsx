import { useState, useEffect, useRef } from "react";
import { 
  Camera, Video, VideoOff, SwitchCamera, Zap, Wifi, WifiOff, 
  MapPin, CheckCircle2, AlertTriangle, ArrowLeft, ShieldCheck
} from "lucide-react";

export default function MobileStreamer() {
  const [streaming, setStreaming] = useState(true);
  const [facingMode, setFacingMode] = useState("environment"); // environment = back camera
  const [qualityMode, setQualityMode] = useState("high"); // "high" (1080p · Sharpest), "balanced" (720p), "fast" (540p)
  const [fps, setFps] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);
  const [city, setCity] = useState("Ahilyanagar");
  const [vehicleId, setVehicleId] = useState("MH-17-AG-501 (Ghanta Gadi)");
  const [lastDetection, setLastDetection] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);

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
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
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

  // Self-pacing sequential streaming loop (Prevents socket exhaustion and guarantees butter-smooth streaming)
  const streamActiveRef = useRef(false);

  useEffect(() => {
    streamActiveRef.current = streaming;
    if (streaming) {
      runStreamLoop();
    }
    return () => {
      streamActiveRef.current = false;
    };
  }, [streaming, qualityMode]);

  const runStreamLoop = async () => {
    while (streamActiveRef.current) {
      const startTime = performance.now();
      await sendSingleFrame();
      const elapsed = performance.now() - startTime;
      // High mode: ~25 FPS (40ms budget); Balanced: ~24 FPS (42ms budget); Fast: ~28 FPS (35ms budget)
      const targetBudget = qualityMode === "high" ? 40 : (qualityMode === "balanced" ? 42 : 35);
      const delay = Math.max(5, targetBudget - elapsed);
      await new Promise(r => setTimeout(r, delay));
    }
  };

  const sendSingleFrame = () => {
    return new Promise((resolve) => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !canvasRef.current) {
        return resolve();
      }

      const video = videoRef.current;
      const vw = video.videoWidth || 1080;
      const vh = video.videoHeight || 1920;

      if ((vw > vh) !== isLandscape) {
        setIsLandscape(vw > vh);
      }

      // Dynamic quality & resolution tiers:
      // High mode (1080p · Ultra Sharp): maxDim = 1080, quality = 0.85
      // Balanced mode (720p HD): maxDim = 840, quality = 0.80
      // Fast mode (540p Speed): maxDim = 600, quality = 0.70
      const cfg = {
        high: { maxDim: 1080, quality: 0.85 },
        balanced: { maxDim: 840, quality: 0.80 },
        fast: { maxDim: 600, quality: 0.70 }
      }[qualityMode] || { maxDim: 1080, quality: 0.85 };

      const scale = Math.min(1.0, cfg.maxDim / Math.max(vw, vh));
      const targetW = Math.round(vw * scale);
      const targetH = Math.round(vh * scale);

      const canvas = canvasRef.current;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, targetW, targetH);

      canvas.toBlob(async (blob) => {
        if (!blob) return resolve();

        try {
          const res = await fetch("/api/upload_frame", {
            method: "POST",
            headers: { 
              "Content-Type": "image/jpeg",
              "Connection": "keep-alive"
            },
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
          resolve();
        }
      }, 'image/jpeg', cfg.quality);
    });
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
          <button
            type="button"
            onClick={() => setQualityMode(prev => prev === 'high' ? 'balanced' : (prev === 'balanced' ? 'fast' : 'high'))}
            title="Switch streaming quality preset"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: qualityMode === 'high' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              border: qualityMode === 'high' ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.2)',
              color: qualityMode === 'high' ? '#60A5FA' : '#E2E8F0',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {qualityMode === 'high' ? '🌟 1080p Ultra' : (qualityMode === 'balanced' ? '⚡ 720p HD' : '🏎️ 480p Speed')}
          </button>
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

        {/* Orientation Hint */}
        <div style={{
          position: 'absolute',
          bottom: '105px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: isLandscape ? 'rgba(16, 185, 129, 0.85)' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          borderRadius: '20px',
          padding: '6px 14px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
          zIndex: 15,
          whiteSpace: 'nowrap',
          border: isLandscape ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {isLandscape ? (
            <span>🖥️ 16:9 Widescreen Active (Matching PC Screen)</span>
          ) : (
            <span>📱 Portrait Mode · Rotate phone sideways for full 16:9 widescreen</span>
          )}
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
