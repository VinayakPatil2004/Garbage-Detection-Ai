import { useMemo, useState, useEffect, useRef } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Bot, Calendar, Camera, Minus,
  Check, CheckCircle, RefreshCw, ChevronDown, CircleUserRound, Clock3, Cpu, Database,
  Download, Eye, EyeOff, FileBarChart, Filter, Focus, Globe, Key, Layers, LayoutDashboard,
  Leaf, LockKeyhole, LogOut, Mail, Map, MapPin, Menu, Monitor, Moon, Paperclip, Play, Pause, Plus,
  Printer, Recycle, Search, Server, Settings, ShieldCheck, Sliders, Smartphone, Sparkles,
  Square, Trash2, TrendingUp, TrendingDown, UploadCloud, Users, User, Video, Wifi, X, Zap,
  MoreVertical, Loader2, Sparkle, Film
} from "lucide-react";
import Card from '../components/Card.jsx';
import SectionHead from '../components/SectionHead.jsx';
import Button from '../components/Button.jsx';

const DEFAULT_DEMO_PREDICTIONS = [
  { id: 1, label: "Plastic bottle", category: "Recyclable plastic · PET", confidence: 94, priority: "Medium", box: { x: 30, y: 40, width: 22, height: 26 } },
  { id: 2, label: "Plastic bag", category: "Soft plastic · LDPE", confidence: 89, priority: "Medium", box: { x: 60, y: 58, width: 20, height: 22 } },
  { id: 3, label: "Paper cup", category: "Paper waste · Coated", confidence: 91, priority: "Low", box: { x: 45, y: 50, width: 16, height: 18 } },
  { id: 4, label: "Banana peel", category: "Organic waste · Compostable", confidence: 96, priority: "Low", box: { x: 20, y: 68, width: 18, height: 16 } },
  { id: 5, label: "Glass bottle", category: "Glass waste · Recyclable", confidence: 85, priority: "High", box: { x: 78, y: 62, width: 16, height: 24 } }
];

export default function Detection() {
  const [uploaded, setUploaded] = useState(null);
  const [fileObj, setFileObj] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [continuousScan, setContinuousScan] = useState(false);
  const [detected, setDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [executionTime, setExecutionTime] = useState("0.25s");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [hoveredBox, setHoveredBox] = useState(null);
  const [assigned, setAssigned] = useState(false);
  const [aiVerdict, setAiVerdict] = useState(null);
  const [activeDevice, setActiveDevice] = useState("GPU");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Check backend health on mount
  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then(res => res.json())
      .then(data => {
        if (data.status === "ok") {
          const dev = data.device ? (data.device.includes("CUDA") ? "CUDA GPU (RTX 3050)" : "CPU") : "Online";
          setBackendStatus(`Online (${dev})`);
          setActiveDevice(dev);
        } else {
          setBackendStatus("Offline (Demo Mode)");
        }
      })
      .catch(() => {
        setBackendStatus("Offline (Demo Mode)");
      });

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isVid = file.type.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov") || name.endsWith(".mkv");

    setIsVideo(isVid);
    setFileObj(file);
    setUploaded(URL.createObjectURL(file));
    setDetected(false);
    setPredictions([]);
    setAiVerdict(null);
    setAssigned(false);
    setContinuousScan(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeMedia = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setUploaded(null);
    setFileObj(null);
    setIsVideo(false);
    setContinuousScan(false);
    setDetected(false);
    setPredictions([]);
    setAiVerdict(null);
    setAssigned(false);
  };

  const captureVideoFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.90);
  };

  const runDetection = async () => {
    if (!uploaded) return;
    setLoading(true);

    // 1. If Video file: capture current frame or send video
    if (isVideo) {
      const frameBase64 = captureVideoFrame();
      if (frameBase64) {
        try {
          const res = await fetch("http://localhost:5000/api/detect_frame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frame: frameBase64 }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
              const preds = data.predictions || [];
              setPredictions(preds);
              setExecutionTime(data.execution_time || "0.18s");
              setAiVerdict({
                verdict: data.verdict || (preds.length > 0 ? "Garbage Detected" : "Clean Area"),
                isGarbage: data.is_garbage !== undefined ? data.is_garbage : preds.length > 0,
                confidence: data.classification 
                  ? (data.is_garbage ? data.classification.garbage_confidence : data.classification.clean_confidence)
                  : (preds[0]?.confidence || 95),
                models: data.models_used || { classifier: "garbage_best.pt", detector: "yolov8s.pt" },
                device: data.device || activeDevice,
                roadParams: data.road_parameters
              });
              setDetected(true);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("Backend API error on video frame:", err);
        }
      }
    }

    // 2. If Image file: send multipart form data
    if (fileObj && !isVideo) {
      try {
        const formData = new FormData();
        formData.append("image", fileObj);

        const res = await fetch("http://localhost:5000/api/detect", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            const preds = data.predictions || [];
            setPredictions(preds);
            setExecutionTime(data.execution_time || "0.22s");
            setAiVerdict({
              verdict: data.verdict || (preds.length > 0 ? "Garbage Detected" : "Clean Area"),
              isGarbage: data.is_garbage !== undefined ? data.is_garbage : preds.length > 0,
              confidence: data.classification 
                ? (data.is_garbage ? data.classification.garbage_confidence : data.classification.clean_confidence)
                : (preds[0]?.confidence || 95),
              models: data.models_used || { classifier: "garbage_best.pt", detector: "yolov8s.pt" },
              device: data.device || activeDevice,
              roadParams: data.road_parameters
            });
            setDetected(true);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend API not reachable, falling back to local demo:", err);
      }
    }

    // Fallback/Demo mode
    setTimeout(() => {
      setPredictions(DEFAULT_DEMO_PREDICTIONS);
      setExecutionTime("0.45s");
      setAiVerdict({
        verdict: "Garbage Detected",
        isGarbage: true,
        confidence: 94.2,
        models: { classifier: "garbage_best.pt (Simulated)", detector: "yolov8s.pt" },
        device: "Local Engine"
      });
      setDetected(true);
      setLoading(false);
    }, 600);
  };

  // Continuous Video Scan Toggle
  const toggleContinuousScan = () => {
    if (continuousScan) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      setContinuousScan(false);
    } else {
      setContinuousScan(true);
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
      // Run frame inference every 850ms
      scanIntervalRef.current = setInterval(async () => {
        const frameBase64 = captureVideoFrame();
        if (!frameBase64) return;
        try {
          const res = await fetch("http://localhost:5000/api/detect_frame", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frame: frameBase64 })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "success") {
              const preds = data.predictions || [];
              setPredictions(preds);
              setExecutionTime(data.execution_time || "0.15s");
              setAiVerdict({
                verdict: data.verdict || (preds.length > 0 ? "Garbage Detected" : "Clean Area"),
                isGarbage: data.is_garbage !== undefined ? data.is_garbage : preds.length > 0,
                confidence: data.classification 
                  ? (data.is_garbage ? data.classification.garbage_confidence : data.classification.clean_confidence)
                  : (preds[0]?.confidence || 95),
                models: data.models_used || { classifier: "garbage_best.pt", detector: "yolov8s.pt" },
                device: data.device || activeDevice,
                roadParams: data.road_parameters
              });
              setDetected(true);
            }
          }
        } catch (e) {
          // ignore stream interval drops
        }
      }, 850);
    }
  };

  const loadDemo = () => {
    setFileObj(null);
    setIsVideo(false);
    setUploaded(true);
    setDetected(false);
    setPredictions([]);
    setAiVerdict(null);
    setAssigned(false);
  };

  const getCategoryIcon = (label = "") => {
    const l = label.toLowerCase();
    if (l.includes("bottle") || l.includes("plastic")) return <Recycle size={14} />;
    if (l.includes("paper") || l.includes("cup") || l.includes("book")) return <Paperclip size={14} />;
    if (l.includes("banana") || l.includes("peel") || l.includes("food") || l.includes("organic") || l.includes("apple") || l.includes("orange")) return <Leaf size={14} />;
    if (l.includes("glass")) return <Trash2 size={14} />;
    return <Focus size={14} />;
  };

  const totalCount = predictions.length;

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="welcome-title">AI Garbage & Street Waste Detection</div>
          <div className="welcome-sub">Dual-engine detection for high-res images and MP4 road CCTV video clips with GPU acceleration.</div>
        </div>
        <div className={`status-pill ${backendStatus.includes("Offline") ? "offline" : ""}`}>
          <span /> AI Engine: {backendStatus}
        </div>
      </div>

      <div className="detection-layout">
        <Card className="upload-card">
          <SectionHead 
            title="Media input (Photos & Video)" 
            detail="JPG, PNG, JPEG, WEBP or MP4, WEBM · direct GPU inference" 
          />

          {!uploaded ? (
            <label 
              className={`dropzone ${isDragging ? 'border-primary bg-emerald-50 dark:bg-emerald-950/20' : ''}`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              <input 
                type="file" 
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska" 
                onChange={handleFileChange} 
              />
              <div className="upload-icon">
                <UploadCloud size={27} />
              </div>
              <b>Drop an image or MP4 video here or choose file</b>
              <span>High resolution photos, CCTV road footage, dashcam clips, or mobile MP4 videos</span>
              <div className="upload-types" style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span>JPG</span>
                <span>PNG</span>
                <span>WEBP</span>
                <span style={{ background: '#2563EB', color: '#FFFFFF', borderColor: '#2563EB', fontWeight: 'bold' }}>MP4</span>
                <span style={{ background: '#059669', color: '#FFFFFF', borderColor: '#059669', fontWeight: 'bold' }}>WEBM</span>
              </div>
            </label>
          ) : (
            <div 
              className="sample-photo" 
              style={
                isVideo 
                  ? { minHeight: '390px', background: '#0A0F1D', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
                  : typeof uploaded === "string" 
                    ? { backgroundImage: `url(${uploaded})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' } 
                    : { position: 'relative' }
              }
            >
              {/* If Video: Render native HTML5 video player */}
              {isVideo ? (
                <>
                  <video
                    ref={videoRef}
                    src={uploaded}
                    controls
                    playsInline
                    style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '15px' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </>
              ) : (
                /* Demo SVG backdrop if not actual image */
                typeof uploaded !== "string" && (
                  <>
                    <div className="photo-sky" />
                    <div className="photo-building building-one" />
                    <div className="photo-building building-two" />
                    <div className="photo-road" />
                    <div className="trash-shape bottle" />
                    <div className="trash-shape bag" />
                    <div className="trash-shape cup" />
                    <div className="trash-shape peel" />
                    <div className="trash-shape glass" />
                  </>
                )
              )}

              {/* Bounding boxes overlay */}
              {detected && predictions.map((pred) => (
                <div 
                  key={pred.id}
                  className={`detect-box ${hoveredBox === pred.id ? 'active' : ''}`}
                  style={{
                    position: 'absolute',
                    top: `${pred.box.y}%`,
                    left: `${pred.box.x}%`,
                    width: `${pred.box.width ? `${pred.box.width}%` : 'auto'}`,
                    height: `${pred.box.height ? `${pred.box.height}%` : 'auto'}`,
                    opacity: hoveredBox && hoveredBox !== pred.id ? 0.3 : 1,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s ease, border-color 0.2s ease'
                  }}
                >
                  <span>{pred.label} · {pred.confidence}%</span>
                </div>
              ))}

              <button className="remove-image" onClick={removeMedia} title="Remove media">
                <X size={17} />
              </button>

              <div className="image-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isVideo ? <Film size={13} /> : null}
                {fileObj ? fileObj.name : "Sample media"} 
                <span>{isVideo ? "MP4 Video Loaded" : "Photo Ready for AI"}</span>
              </div>
            </div>
          )}

          <div className="upload-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button kind="secondary" onClick={loadDemo}>
              <Camera size={17} /> Load demo sample
            </Button>

            {isVideo && uploaded && (
              <Button 
                kind={continuousScan ? "danger" : "secondary"}
                onClick={toggleContinuousScan}
                style={continuousScan ? { background: '#EF4444', color: '#FFF' } : {}}
              >
                {continuousScan ? <><Pause size={17} /> Stop Video Scan</> : <><Play size={17} /> ⚡ Live Video AI Tracking</>}
              </Button>
            )}

            <Button onClick={runDetection} disabled={!uploaded || loading}>
              {loading ? (
                <><Loader2 size={17} className="animate-spin" /> Analyzing on GPU...</>
              ) : (
                <><Sparkles size={17} /> {isVideo ? "Analyze Current Video Frame" : "Analyze with AI"}</>
              )}
            </Button>
          </div>
        </Card>

        <Card className="results-card">
          <SectionHead 
            title="Analysis results" 
            detail={detected ? `${aiVerdict?.verdict || "Completed"} · Latency ${executionTime}` : "AI output and classification will appear here"} 
            action={detected ? <div className="success-icon"><Check size={15} /></div> : null} 
          />

          {detected ? (
            <>
              {/* Verdict Header Badge */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '14px',
                background: aiVerdict?.isGarbage ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                border: `1px solid ${aiVerdict?.isGarbage ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {aiVerdict?.isGarbage ? <Trash2 color="#EF4444" size={20} /> : <Leaf color="#22C55E" size={20} />}
                  <div>
                    <b style={{ color: aiVerdict?.isGarbage ? '#EF4444' : '#22C55E', fontSize: '15px' }}>
                      {aiVerdict?.verdict}
                    </b>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      Confidence: {aiVerdict?.confidence}% · {aiVerdict?.models?.classifier || "garbage_best.pt"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', background: 'var(--surface)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  {executionTime}
                </div>
              </div>

              {/* Road / Lighting Parameters Badge if available */}
              {aiVerdict?.roadParams && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>🛣️ {aiVerdict.roadParams.environment || "Road Engine"}</span>
                  <span>{aiVerdict.roadParams.resolution_mode || "640px Boost"}</span>
                  {aiVerdict.roadParams.lighting_adapted && <span style={{ color: '#EAB308', fontWeight: 600 }}>CLAHE Active</span>}
                </div>
              )}

              {aiVerdict?.isGarbage ? (
                <>
                  <div className="result-score">
                    <div 
                      className="score-ring" 
                      style={{ background: 'radial-gradient(circle, var(--surface) 59%, transparent 61%), conic-gradient(var(--blue) 0 40%, var(--purple) 40% 60%, var(--orange) 60% 80%, var(--green) 80% 100%)' }}
                    >
                      <b>{totalCount}</b>
                      <span>Items detected</span>
                    </div>
                  </div>

                  <div className="result-items" style={{ maxHeight: "190px", overflowY: "auto" }}>
                    {predictions.map((item) => (
                      <div 
                        key={item.id} 
                        className="result-item" 
                        style={{ cursor: "pointer", background: hoveredBox === item.id ? "var(--surface-2)" : "transparent" }}
                        onMouseEnter={() => setHoveredBox(item.id)}
                        onMouseLeave={() => setHoveredBox(null)}
                      >
                        <div className="result-number" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
                          {getCategoryIcon(item.label)}
                        </div>
                        <div>
                          <b>{item.label}</b>
                          <span>{item.category}</span>
                        </div>
                        <strong>{item.confidence}%</strong>
                      </div>
                    ))}
                  </div>

                  <div className="result-actions" style={{ marginTop: '14px' }}>
                    <Button 
                      kind={assigned ? "secondary" : "primary"} 
                      onClick={() => setAssigned(true)}
                      disabled={assigned}
                    >
                      {assigned ? <><Check size={16} /> Cleanup Assigned to Ward</> : <><Sparkles size={16} /> Assign Cleanup Team</>}
                    </Button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
                  <Leaf size={44} color="#22C55E" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                  <b style={{ display: 'block', fontSize: '15px', color: 'var(--text)' }}>No Garbage Detected!</b>
                  <p style={{ fontSize: '13px', margin: '4px 0 0' }}>The area appears completely clean and well-maintained.</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 16px', color: 'var(--muted)' }}>
              <UploadCloud size={38} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <b style={{ display: 'block', fontSize: '14px', color: 'var(--text)' }}>No Media Analyzed Yet</b>
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Drop a photo or MP4 video on the left, then click Analyze with AI.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
