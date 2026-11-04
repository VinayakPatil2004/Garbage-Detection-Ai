import { useMemo, useState, useEffect } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Bot, Calendar, Camera, Minus,
  Check, CheckCircle, RefreshCw, ChevronDown, CircleUserRound, Clock3, Cpu, Database,
  Download, Eye, EyeOff, FileBarChart, Filter, Focus, Globe, Key, Layers, LayoutDashboard,
  Leaf, LockKeyhole, LogOut, Mail, Map, MapPin, Menu, Monitor, Moon, Paperclip, Play, Plus,
  Printer, Recycle, Search, Server, Settings, ShieldCheck, Sliders, Smartphone, Sparkles,
  Square, Trash2, TrendingUp, TrendingDown, UploadCloud, Users, User, Video, Wifi, X, Zap,
  MoreVertical, Loader2, Sparkle
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
  const [detected, setDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [executionTime, setExecutionTime] = useState("0.25s");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [hoveredBox, setHoveredBox] = useState(null);
  const [assigned, setAssigned] = useState(false);
  const [aiVerdict, setAiVerdict] = useState(null);
  const [activeDevice, setActiveDevice] = useState("GPU");

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
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileObj(file);
      setUploaded(URL.createObjectURL(file));
      setDetected(false);
      setPredictions([]);
      setAiVerdict(null);
      setAssigned(false);
    }
  };

  const removeImage = () => {
    setUploaded(null);
    setFileObj(null);
    setDetected(false);
    setPredictions([]);
    setAiVerdict(null);
    setAssigned(false);
  };

  const runDetection = async () => {
    if (!uploaded) return;
    setLoading(true);

    // If we have an actual file uploaded, try the real AI backend
    if (fileObj) {
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
              device: data.device || activeDevice
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

  const loadDemo = () => {
    setFileObj(null);
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

  const getPriorityColor = (priority = "") => {
    if (priority === "High") return "var(--red)";
    if (priority === "Medium") return "var(--orange)";
    return "var(--green)";
  };

  const totalCount = predictions.length;

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="welcome-title">AI Garbage Detection</div>
          <div className="welcome-sub">Integrated dual-model inference: fine-tuned classifier (garbage_best) + object locator (yolov8s).</div>
        </div>
        <div className={`status-pill ${backendStatus.includes("Offline") ? "offline" : ""}`}>
          <span /> AI Engine: {backendStatus}
        </div>
      </div>

      <div className="detection-layout">
        <Card className="upload-card">
          <SectionHead title="Image input" detail="JPG, PNG, JPEG or WEBP · direct GPU inference" />
          {!uploaded ? (
            <label className="dropzone">
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <div className="upload-icon"><UploadCloud size={27} /></div>
              <b>Drop an image here or choose file</b>
              <span>High resolution photos, CCTV snapshots, or mobile pictures</span>
              <div className="upload-types"><span>JPG</span><span>PNG</span><span>WEBP</span></div>
            </label>
          ) : (
            <div 
              className="sample-photo" 
              style={typeof uploaded === "string" ? { backgroundImage: `url(${uploaded})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' } : { position: 'relative' }}
            >
              {typeof uploaded !== "string" && (
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
              )}

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
                    transition: 'opacity 0.2s ease, border-color 0.2s ease'
                  }}
                >
                  <span>{pred.label} · {pred.confidence}%</span>
                </div>
              ))}

              <button className="remove-image" onClick={removeImage} title="Remove image">
                <X size={17} />
              </button>
              <div className="image-meta">
                {fileObj ? fileObj.name : "Sample image"} <span>Ready for AI Analysis</span>
              </div>
            </div>
          )}

          <div className="upload-actions">
            <Button kind="secondary" onClick={loadDemo}>
              <Camera size={17} /> Load demo sample
            </Button>
            <Button onClick={runDetection} disabled={!uploaded || loading}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Analyzing on GPU...</> : <><Sparkles size={17} /> Analyze with AI</>}
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

                  <div className="detail-grid">
                    <div>
                      <span>Total Waste</span>
                      <b>{totalCount} items</b>
                    </div>
                    <div>
                      <span>Est. weight</span>
                      <b>{(Math.max(totalCount, 1) * 0.35).toFixed(2)} kg</b>
                    </div>
                    <div>
                      <span>AI Models</span>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blue)' }}>
                        Dual YOLO
                      </div>
                    </div>
                    <div>
                      <span>Priority</span>
                      <b className="priority" style={{ color: getPriorityColor(predictions[0]?.priority || "High") }}>
                        {predictions[0]?.priority || "High"}
                      </b>
                    </div>
                  </div>

                  <Button className="full" kind={assigned ? "secondary" : "primary"} onClick={() => setAssigned(true)}>
                    {assigned ? <><Check size={17} /> Crew Dispatched to Location</> : <><MapPin size={17} /> Assign municipal pickup</>}
                  </Button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 15px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <ShieldCheck size={32} color="#22C55E" />
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>Clean Public Space</h3>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>
                    AI classifier verified no trash, litter, or hazardous waste detected in this scene.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Focus size={35} />
              <b>No detection yet</b>
              <span>Upload an image and run the dual AI model to see detailed bounding boxes & classification.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
