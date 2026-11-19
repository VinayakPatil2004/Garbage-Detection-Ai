import { useMemo, useState, useEffect, useRef } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, Bot, Calendar, Camera, Minus,
  Check, CheckCircle, RefreshCw, ChevronDown, CircleUserRound, Clock3, Cpu, Database,
  Download, Eye, EyeOff, FileBarChart, Filter, Focus, Globe, Key, Layers, LayoutDashboard,
  Leaf, LockKeyhole, LogOut, Mail, Map, MapPin, Menu, Monitor, Moon, Paperclip, Play, Plus,
  Printer, Recycle, Search, Server, Settings, ShieldCheck, Sliders, Smartphone, Sparkles, Sun,
  Square, Trash2, TrendingUp, TrendingDown, UploadCloud, Users, User, Video, Wifi, X, Zap,
  MoreVertical, ExternalLink, Maximize2, Crosshair, Navigation
} from "lucide-react";
import { navItems, detections } from "../data/constants.js";
import Brand from '../components/Brand.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import Card from '../components/Card.jsx';
import SectionHead from '../components/SectionHead.jsx';
import StatCard from '../components/StatCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import DetectionChart from '../components/DetectionChart.jsx';
import DonutChart from '../components/DonutChart.jsx';
import MiniMap from '../components/MiniMap.jsx';
import TrendChart from '../components/TrendChart.jsx';

const NASHIK_WARD_TABS = [
  { id: "all", label: "All Wards (सर्व प्रभाग)", short: "All" },
  { id: "ward-2", label: "Ward 2: Nashik West (कॉलेज रोड / गंगापूर)", short: "Ward 2: West" },
  { id: "ward-1", label: "Ward 1: Panchavati (पंचवटी)", short: "Ward 1: Panchavati" },
  { id: "ward-3", label: "Ward 3: Nashik East (सीबीएस / शालिमार)", short: "Ward 3: East" },
  { id: "ward-4", label: "Ward 4: CIDCO (सिडको)", short: "Ward 4: CIDCO" },
  { id: "ward-5", label: "Ward 5: Satpur (सातपूर MIDC)", short: "Ward 5: Satpur" },
  { id: "ward-6", label: "Ward 6: Nashik Road (नाशिक रोड)", short: "Ward 6: Nashik Road" },
];

export default function Dashboard({ navigate }) {
    const [timeRange, setTimeRange] = useState("This week");
    const [chartMenuOpen, setChartMenuOpen] = useState(false);
    const timeRangeRef = useRef(null);

    // Nashik Ward Snapshots State
    const [selectedWard, setSelectedWard] = useState("all");
    const [wardSnapshots, setWardSnapshots] = useState([]);
    const [wardCounts, setWardCounts] = useState({});
    const [loadingSnapshots, setLoadingSnapshots] = useState(true);
    const [modalSnapshot, setModalSnapshot] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'cleaned'
    const [verifyOfficer, setVerifyOfficer] = useState("Kiran Jadhav (Sanitary Inspector)");
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [afterImageFile, setAfterImageFile] = useState(null);
    const [wardLeaderboard, setWardLeaderboard] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(true);
    const [recordings, setRecordings] = useState([]);
    const [activeRecInfo, setActiveRecInfo] = useState({});
    const [selectedVideoModal, setSelectedVideoModal] = useState(null);

    const fetchRecordings = async () => {
      try {
        const res = await fetch(`/api/recordings?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            setRecordings(data.recordings || []);
            setActiveRecInfo(data.active_recording || {});
          }
        }
      } catch (e) {
        console.warn("Could not fetch recordings:", e);
      }
    };

    const fetchWardLeaderboard = async () => {
      try {
        const res = await fetch(`/api/dashboard/ward_leaderboard?city=Nashik&_t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success") {
            setWardLeaderboard(json.leaderboard || []);
          }
        }
      } catch (e) {
        console.warn("Could not fetch ward leaderboard:", e);
      }
    };

    const fetchWardSnapshots = async (ward = selectedWard) => {
      try {
        const res = await fetch(`/api/dashboard/ward_snapshots?city=Nashik&ward=${ward}&_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Pragma": "no-cache" }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success") {
            setWardSnapshots(json.snapshots || []);
            setWardCounts(json.ward_counts || {});
          }
        }
      } catch (e) {
        console.warn("Could not fetch ward snapshots:", e);
      } finally {
        setLoadingSnapshots(false);
      }
    };

    const handleVerifyCleaning = async (detId, officerName = verifyOfficer, file = afterImageFile) => {
      setVerifyLoading(true);
      try {
        const formData = new FormData();
        formData.append("officer_name", officerName || "Kiran Jadhav (Sanitary Inspector)");
        if (file) {
          formData.append("after_image", file);
        }
        const res = await fetch(`/api/detections/${detId}/verify_cleaning`, {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success") {
            await fetchWardSnapshots(selectedWard);
            if (modalSnapshot && (modalSnapshot.id === detId || modalSnapshot.tracking_id === detId)) {
              setModalSnapshot(prev => ({
                ...prev,
                status: "Cleaned",
                after_image_snapshot: data.verification.after_image_snapshot,
                cleaned_at_formatted: data.verification.cleaned_at,
                cleaning_officer: data.verification.cleaning_officer,
                resolution_time_minutes: data.verification.resolution_time_minutes,
                is_verified: true
              }));
            }
            setAfterImageFile(null);
          } else {
            alert("Verification failed: " + (data.message || "Unknown error"));
          }
        }
      } catch (err) {
        console.error("Verification submit error:", err);
      } finally {
        setVerifyLoading(false);
      }
    };

    const filteredSnapshots = useMemo(() => {
      if (statusFilter === "pending") {
        return wardSnapshots.filter(s => s.status !== "Cleaned");
      }
      if (statusFilter === "cleaned") {
        return wardSnapshots.filter(s => s.status === "Cleaned");
      }
      return wardSnapshots;
    }, [wardSnapshots, statusFilter]);

    const handleDeleteSnapshot = async (id, trackingId, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!window.confirm(`Are you sure you want to delete this snapshot (${trackingId || 'incident'})?`)) {
        return;
      }
      try {
        const res = await fetch(`/api/dashboard/snapshots/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          if (modalSnapshot && (modalSnapshot.id === id || modalSnapshot.tracking_id === id)) {
            setModalSnapshot(null);
          }
          setWardSnapshots(prev => prev.filter(s => s.id !== id && s.tracking_id !== id));
          fetchWardSnapshots(selectedWard);
        } else {
          alert("Failed to delete snapshot.");
        }
      } catch (err) {
        console.error("Delete snapshot error:", err);
      }
    };

    useEffect(() => {
      fetchWardSnapshots(selectedWard);
      fetchWardLeaderboard();
      fetchRecordings();
      const interval = setInterval(() => {
        fetchWardSnapshots(selectedWard);
        fetchWardLeaderboard();
        fetchRecordings();
      }, 4000);
      return () => clearInterval(interval);
    }, [selectedWard]);

    useEffect(() => {
      function handleClickOutside(event) {
        if (timeRangeRef.current && !timeRangeRef.current.contains(event.target)) {
          setChartMenuOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const currentUser = localStorage.getItem('currentUser') || "Alex";

    return <div className="page-content">
        <div className="welcome-row">
          <div style={{display: 'flex', alignItems: 'center', gap: '14px'}}>
             <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)'}}>
                <Sun size={26} color="#F59E0B" />
             </div>
             <div>
                <div className="welcome-title">Good morning, {currentUser}</div>
                <div className="welcome-sub">Here's what your AI + IoT network found today.</div>
             </div>
          </div>
          <div style={{display: 'flex', gap: '8px', zIndex: 1}}>
             <Button kind="secondary" onClick={() => navigate("Reports")}><FileBarChart size={17} /> Generate report</Button>
             <Button onClick={() => navigate("Detection")}><Plus size={17} /> New detection</Button>
          </div>
        </div>
        
        <div className="stats-grid">
          <StatCard 
            label="Active users now" 
            value="12" 
            change="+2" 
            detail={<span style={{display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px'}}>vs yesterday <span style={{width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted-2)'}}></span> <b style={{color: 'var(--ink)'}}>3</b> Inactive</span>} 
            icon={Users} 
            tone="blue" 
            onClick={() => navigate("UserManagement")}
            options={[
              { label: "View User List", onClick: () => navigate("UserManagement") },
              { label: "Add New User", onClick: () => navigate("UserManagement") },
              { label: "Manage Roles", onClick: () => navigate("UserManagement") },
              { label: "Deactivate User...", danger: true, onClick: () => navigate("UserManagement") }
            ]}
          />
          <StatCard label="Total garbage" value="1,248" change="12.5%" detail="vs 1,109 last week" icon={Trash2} tone="purple" onClick={() => navigate("Analytics")} />
          <StatCard label="Plastic items" value="476" change="8.2%" detail="vs 440 last week" icon={Recycle} tone="green" onClick={() => navigate("History", "Plastic")} />
          <StatCard label="Organic waste" value="337 kg" change="5.7%" detail="vs 318 kg last week" icon={Leaf} tone="orange" onClick={() => navigate("History", "Organic")} />
          <StatCard label="Detection accuracy" value="96.8%" change="1.4%" detail="Consistent High Avg." icon={Zap} tone="red" onClick={() => navigate("Detection")} />
        </div>
        
        <div className="dashboard-grid">
          {/* Ward Cleanliness Performance Index (CPI) Leaderboard Card (Pillar 5) */}
          <Card className="span-two" style={{ gridColumn: '1 / -1', padding: '20px 22px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#10B981" />
                  <b style={{ fontSize: '16px', color: 'var(--ink)' }}>NMC Ward Cleanliness Performance Index (प्रभाग स्वच्छता निर्देशांक - CPI)</b>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                    SWACHH-AI LEADERBOARD
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Algorithmic cleanliness audit ranking across all 6 Nashik Municipal Corporation administrative wards with real-time hotspot tracking.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {showLeaderboard ? <ChevronDown size={14} /> : <Minus size={14} />} {showLeaderboard ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={fetchWardLeaderboard}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Refresh CPI Leaderboard"
                >
                  <RefreshCw size={13} /> Refresh CPI
                </button>
              </div>
            </div>

            {showLeaderboard && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', borderBottom: '1.5px solid var(--line)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', borderRadius: '8px 0 0 8px' }}>Rank & Ward</th>
                      <th style={{ padding: '10px 14px' }}>Key Areas / Loci</th>
                      <th style={{ padding: '10px 14px' }}>Sanitary Inspector</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Active Incidents</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Cleaned & Verified</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Chronic Hotspots</th>
                      <th style={{ padding: '10px 14px', minWidth: '160px' }}>Cleanliness Index (CPI)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wardLeaderboard.map((w, idx) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--ink)' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#FEF3C7' : (idx === 1 ? '#E2E8F0' : 'var(--surface-2)'),
                            color: idx === 0 ? '#D97706' : (idx === 1 ? '#475569' : 'var(--muted)'),
                            fontSize: '11px',
                            fontWeight: 800,
                            marginRight: '8px'
                          }}>
                            #{idx + 1}
                          </span>
                          {w.name}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '12px' }}>{w.sub_areas}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--ink)', fontSize: '12px', fontWeight: 500 }}>{w.officer}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            background: w.active > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                            color: w.active > 0 ? '#DC2626' : '#059669',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '11px'
                          }}>
                            {w.active}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '3px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '11px' }}>
                            {w.cleaned}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {w.hotspots > 0 ? (
                            <span style={{ background: '#DC2626', color: '#fff', padding: '2px 7px', borderRadius: '10px', fontWeight: 800, fontSize: '11px' }}>
                              {w.hotspots}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: 'var(--surface-2)', height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${w.cpi}%`,
                                height: '100%',
                                background: w.cpi >= 85 ? '#10B981' : (w.cpi >= 65 ? '#F59E0B' : '#DC2626'),
                                borderRadius: '4px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                            <b style={{ fontSize: '12px', fontFamily: 'monospace', color: w.cpi >= 85 ? '#059669' : (w.cpi >= 65 ? '#D97706' : '#DC2626'), minWidth: '42px' }}>
                              {w.cpi}%
                            </b>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{
                            background: w.cpi >= 85 ? 'rgba(16, 185, 129, 0.15)' : (w.cpi >= 65 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                            color: w.cpi >= 85 ? '#059669' : (w.cpi >= 65 ? '#D97706' : '#DC2626'),
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>
                            {w.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* AI Dashcam Ride Video Archive Card */}
          <Card className="span-two" style={{ gridColumn: '1 / -1', padding: '18px 22px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={20} color="#3B82F6" />
                  <b style={{ fontSize: '16px', color: 'var(--ink)' }}>AI Dashcam Field Video Archive (सवारी व्हिडिओ रेकॉर्डिंग्ज)</b>
                  {activeRecInfo.is_recording ? (
                    <span style={{ background: '#DC2626', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} /> RECORDING LIVE ({activeRecInfo.duration_seconds || 0}s)
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563EB', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                      {recordings.length} VIDEOS ARCHIVED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Continuous dashcam MP4 video footage recorded from the mobile streamer with burned-in GPS HUD & AI waste bounding boxes for benchmark accuracy audits.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={fetchRecordings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Refresh video list"
                >
                  <RefreshCw size={13} /> Refresh Videos
                </button>
              </div>
            </div>

            {/* Video List Grid */}
            <div style={{ marginTop: '14px' }}>
              {recordings.length === 0 ? (
                <div style={{ padding: '18px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: '10px', fontSize: '13px' }}>
                  <Video size={24} color="var(--muted-2)" style={{ marginBottom: '6px' }} />
                  <div>No ride videos recorded yet. Videos record automatically as soon as mobile camera streams on <code>/cam</code>.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {recordings.slice(0, 6).map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--line)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <b style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: 'monospace' }}>{rec.filename}</b>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{rec.modified_at}</div>
                        </div>
                        <span style={{ background: '#3B82F6', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>
                          {rec.size_mb} MB
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => setSelectedVideoModal(rec)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: '#10B981',
                            color: '#fff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={12} /> Play Video
                        </button>
                        <a
                          href={rec.download_url}
                          download={rec.filename}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            color: 'var(--ink)',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Download size={12} /> Save
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Nashik Wards AI Snapshots Section (Full Width) */}
          <Card className="span-two" style={{ gridColumn: '1 / -1', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={20} color="#10B981" />
                  <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Nashik Ward AI Incident Snapshots (नाशिक प्रभागनिहाय कचरा शोधन)</b>
                  <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                    LIVE GEOLOCATION
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  AI mobile camera snapshots tagged with exact GPS coordinates across Nashik Municipal Corporation (NMC) wards.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => fetchWardSnapshots(selectedWard)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Refresh snapshots"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <Button kind="secondary" onClick={() => navigate("Map")}>
                  <Map size={14} /> Open GIS Map
                </Button>
              </div>
            </div>

            {/* Ward Filter Pills / Tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '18px' }}>
              {NASHIK_WARD_TABS.map(tab => {
                const isSelected = selectedWard === tab.id;
                const count = wardCounts[tab.id] ?? 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedWard(tab.id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid #10B981' : '1px solid var(--line)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                      color: isSelected ? '#059669' : 'var(--muted)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      background: isSelected ? '#10B981' : 'var(--surface-2)',
                      color: isSelected ? '#fff' : 'var(--muted)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Status Filter Sub-Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '18px', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginRight: '4px' }}>Status Filter:</span>
                {[
                  { id: 'all', label: 'All Incidents (सर्व घटना)', count: wardSnapshots.length },
                  { id: 'pending', label: 'Pending Cleaning (सफाई प्रलंबित)', count: wardSnapshots.filter(s => s.status !== 'Cleaned').length },
                  { id: 'cleaned', label: 'Cleaned & Verified (Before vs After)', count: wardSnapshots.filter(s => s.status === 'Cleaned').length }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: statusFilter === f.id ? (f.id === 'cleaned' ? '#10B981' : (f.id === 'pending' ? '#F59E0B' : 'var(--ink)')) : 'transparent',
                      color: statusFilter === f.id ? '#fff' : 'var(--muted)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{f.label}</span>
                    <span style={{
                      opacity: 0.9,
                      background: 'rgba(255,255,255,0.22)',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '10px'
                    }}>{f.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Showing <b>{filteredSnapshots.length}</b> records
              </div>
            </div>

            {/* Snapshots Grid */}
            {loadingSnapshots ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Loading Nashik Ward incident snapshots...
              </div>
            ) : filteredSnapshots.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: '12px' }}>
                <Camera size={36} color="var(--muted-2)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>No incidents found for this filter</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Try switching the ward or status filter above to inspect municipal incidents.
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {filteredSnapshots.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      border: item.status === 'Cleaned' ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--line)',
                      overflow: 'hidden',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)';
                    }}
                  >
                    {/* Snapshot Photo Container */}
                    <div
                      style={{ position: 'relative', height: '180px', background: '#0f172a', cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => setModalSnapshot(item)}
                      title="Click to inspect Before & After"
                    >
                      {item.image_snapshot ? (
                        <img
                          src={item.image_snapshot}
                          alt={`AI Detection Snapshot ${item.tracking_id}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <Camera size={32} />
                        </div>
                      )}

                      {/* Corner Badges */}
                      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: item.severity === 'Critical' ? '#DC2626' : (item.severity === 'High' ? '#EA580C' : '#2563EB'),
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          letterSpacing: '0.4px'
                        }}>
                          {item.waste_type || item.type} · {item.confidence}
                        </span>
                        {item.after_image_snapshot && (
                          <span style={{
                            background: '#059669',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '3px 6px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <CheckCircle size={10} /> AFTER PROOF
                          </span>
                        )}
                        {item.is_hotspot && (
                          <span style={{
                            background: '#DC2626',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '3px 6px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <AlertTriangle size={10} /> CHRONIC HOTSPOT ({item.recurrence_count || 3}x)
                          </span>
                        )}
                      </div>

                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          background: item.status === 'Cleaned' ? '#10B981' : '#F59E0B',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}>
                          {item.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSnapshot(item.id || item.tracking_id, item.tracking_id, e)}
                          title="Delete snapshot"
                          style={{
                            background: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            color: '#fff',
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#DC2626'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Enlarge / Compare Hint Pill */}
                      <div style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        background: 'rgba(15, 23, 42, 0.88)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {item.after_image_snapshot ? (
                          <>
                            <CheckCircle size={10} color="#4ade80" /> Before vs After
                          </>
                        ) : (
                          <>
                            <Maximize2 size={10} /> Inspect
                          </>
                        )}
                      </div>
                    </div>

                    {/* Incident Meta & Geolocation */}
                    <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {item.ward?.marathi_name || 'नाशिक महानगरपालिका'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                          {item.location_name || item.location}
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '3px', background: 'var(--surface-2)', padding: '8px 10px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>GPS Location:</span>
                          <b style={{ color: '#2563EB', fontFamily: 'monospace' }}>
                            {Number(item.lat || item.latitude).toFixed(5)}°N, {Number(item.lng || item.longitude).toFixed(5)}°E
                          </b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Unit:</span>
                          <b style={{ color: 'var(--ink)' }}>{item.assigned_vehicle || 'MH-17-AG-501 (Ghanta Gadi)'}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Incident Time:</span>
                          <span>{item.date || 'Today'} · {item.time || 'Live'}</span>
                        </div>
                        {item.recurrence_count > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', fontWeight: 700 }}>
                            <span>Spatial Deduplication:</span>
                            <span>{item.recurrence_count} hits merged (25m radius)</span>
                          </div>
                        )}
                        {item.after_image_snapshot && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                            <span>Cleaned In:</span>
                            <span>{item.resolution_time_minutes || 95} mins (SLA Met)</span>
                          </div>
                        )}
                      </div>

                      {/* Primary Verification Action Button */}
                      <div style={{ marginTop: 'auto', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {item.status === 'Cleaned' && item.after_image_snapshot ? (
                          <button
                            type="button"
                            onClick={() => setModalSnapshot(item)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '7px 10px',
                              borderRadius: '7px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#059669',
                              border: '1.5px solid #10B981',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <CheckCircle size={13} color="#10B981" /> Inspect Before vs After (तुलना पहा)
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setModalSnapshot(item)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '7px 10px',
                              borderRadius: '7px',
                              background: '#10B981',
                              color: '#fff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <ShieldCheck size={13} /> Verify & Record Cleaned (स्वच्छता नोंदवा)
                          </button>
                        )}

                        {/* Secondary Quick Action Buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => navigate("Map")}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#2563EB',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <MapPin size={11} /> View Map
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${item.lat || item.latitude},${item.lng || item.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: 'var(--surface-2)',
                              color: 'var(--ink)',
                              border: '1px solid var(--line)',
                              fontSize: '11px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            <ExternalLink size={11} /> Maps
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSnapshot(item.id || item.tracking_id, item.tracking_id, e)}
                            title="Delete snapshot"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#DC2626',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="span-two">
            <SectionHead 
              title={`${timeRange === 'Today' ? 'Hourly' : timeRange === 'This month' ? 'Monthly' : timeRange === 'This year' ? 'Yearly' : 'Weekly'} detections`}
              detail="Detected vs Cleaned items across all zones" 
              action={
                <div style={{display: 'flex', gap: '14px', alignItems: 'center'}}>
                  <div style={{display: 'flex', gap: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => navigate("History", "", "All statuses")}><span style={{width: '12px', height: '12px', borderRadius: '3px', background: '#3B82F6'}}></span> Detected</div>
                  <div style={{display: 'flex', gap: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => navigate("History", "", "Cleaned")}><span style={{width: '12px', height: '12px', borderRadius: '3px', background: '#6ee7b7'}}></span> Cleaned</div>
                  <div ref={timeRangeRef} style={{position: 'relative'}}>
                    <div className="select-pill" style={{cursor: 'pointer', fontSize: '14px', padding: '10px 12px'}} onClick={() => setChartMenuOpen(!chartMenuOpen)}>{timeRange} <ChevronDown size={14} /></div>
                    {chartMenuOpen && (
                      <div style={{ position: "absolute", top: "100%", right: "0", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px", padding: "6px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 50, minWidth: "120px", marginTop: "4px" }}>
                        {["Today", "This week", "This month", "This year"].map(opt => (
                           <button 
                             key={opt}
                             onClick={() => { setTimeRange(opt); setChartMenuOpen(false); }}
                             style={{ display: "block", width: "100%", textAlign: "left", padding: "10px", fontSize: '14px', fontWeight: "600", background: "transparent", border: "none", cursor: "pointer", borderRadius: "5px", color: "var(--muted)" }}
                             onMouseOver={(e) => e.currentTarget.style.background = "var(--surface-2)"}
                             onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                           >
                             {opt}
                           </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              } 
            />
            <DetectionChart range={timeRange} />
          </Card>
          
          <Card>
            <SectionHead title="Garbage categories" detail="Distribution this month" />
            <DonutChart compact />
          </Card>
          
          <Card className="span-two">
            <SectionHead title="Recent detections" detail="Latest AI-verified events" action={<button className="text-button" onClick={() => navigate("History")}>View all history <ArrowRight size={14} /></button>} />
            <div className="detection-list">
              {[
                 {type: "Plastic", location: "Riverside Park", confidence: "96%", time: "10:42 AM", status: "Detected", icon: Recycle},
                 {type: "Organic", location: "Market Street", confidence: "92%", time: "09:18 AM", status: "Cleaning", icon: Leaf},
                 {type: "Paper", location: "Central Station", confidence: "89%", time: "04:56 PM", status: "Cleaned", icon: Paperclip},
                 {type: "Glass", location: "Harbor Avenue", confidence: "94%", time: "01:06 PM", status: "Reported", icon: Trash2}
              ].map((item, i) => <div className="detection-row" key={i} style={{cursor: "pointer"}} onClick={() => navigate("History")}>
                <div className={`type-icon ${item.type.toLowerCase()}`}><item.icon size={17} /></div>
                <div className="detection-main">
                   <b>{item.type} waste</b>
                   <span><MapPin size={13} /> {item.location}</span>
                </div>
                <div className="detection-status" style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
                   <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="detection-time">
                   <b>{item.confidence}</b>
                   <span>{item.time}</span>
                </div>
              </div>)}
            </div>
          </Card>
          
          <Card>
            <SectionHead title="Live location map" detail="Active IoT zones & hot-spots" action={<button className="text-button" onClick={() => navigate("Map")}>Expand</button>} />
            <div className="map-canvas" style={{height: '240px', margin: '0 20px 20px'}}>
              <div className="map-water" />
              <div className="map-road road-one" />
              <div className="map-road road-two" />
              <div className="map-road road-three" />
              <div className="marker" style={{ top: '40%', left: '20%' }}><Trash2 size={11} /></div>
              <div className="marker" style={{ top: '65%', left: '45%' }}><Camera size={11} /></div>
              <div className="marker warning" style={{ top: '30%', right: '35%' }}><Trash2 size={11} /></div>
              <div className="marker clean" style={{ top: '70%', right: '20%' }}><Check size={11} /></div>
              <div className="map-legend" style={{bottom: '10px', left: '10px'}}>
                 <span><i className="alert-dot" /> Hotspot</span>
                 <span><i className="warning-dot" /> Active</span>
                 <span><i className="clean-dot" /> Clean</span>
              </div>
            </div>
          </Card>
          
          <Card className="span-two">
            <SectionHead title="Recent login activity" detail="Latest user sessions" action={<button className="text-button" onClick={() => navigate("Login Activity")}>View all activity <ArrowRight size={14} /></button>} />
            <div className="activity-list">
              {[
                { name: "Alex Morgan", initials: "AM", role: "System Administrator", time: "Today, 10:42 AM", device: "Desktop", status: "Active" },
                { name: "Priya Sharma", initials: "PS", role: "Operator", time: "Today, 09:18 AM", device: "Mobile", status: "Active" },
                { name: "Rahul Patil", initials: "RP", role: "Supervisor", time: "Yesterday, 06:35 PM", device: "Desktop", status: "Logged out" }
              ].map((act, i) => (
                <div className="activity-row" key={i}>
                  <div className="activity-row-main">
                    <div className="avatar">{act.initials}</div>
                    <div className="activity-details">
                      <b>{act.name}</b>
                      <span>{act.role} • {act.device === "Mobile" ? <Smartphone size={10} style={{display:'inline', verticalAlign:'middle'}}/> : <Monitor size={10} style={{display:'inline', verticalAlign:'middle'}}/>} {act.device}</span>
                    </div>
                  </div>
                  <div className="activity-meta">
                    <span className={`status-indicator ${act.status === "Active" ? "active" : "offline"}`}>{act.status}</span>
                    <span style={{fontSize: '14px', color: 'var(--muted)', marginTop: '4px'}}>{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
             <SectionHead title="AI Detection Health" detail="System performance metrics" />
             <div className="health-grid">
               <div className="health-item">
                 <div className="h-icon"><Cpu size={16}/></div>
                 <div className="h-data"><span>Model Accuracy</span><b>98.4%</b></div>
               </div>
               <div className="health-item">
                 <div className="h-icon"><Focus size={16}/></div>
                 <div className="h-data"><span>Avg Confidence</span><b>92.1%</b></div>
               </div>
               <div className="health-item">
                 <div className="h-icon"><Database size={16}/></div>
                 <div className="h-data"><span>Total Detections</span><b>34,921</b></div>
               </div>
               <div className="health-item">
                 <div className="h-icon"><RefreshCw size={16}/></div>
                 <div className="h-data"><span>Last Update</span><b>2 hrs ago</b></div>
               </div>
             </div>
          </Card>
          
          <Card className="span-two">
             <SectionHead title="IoT Network Status" detail="Connected edge devices" />
             <div className="iot-grid">
               <div className="iot-card online">
                 <div className="iot-icon"><Server size={20}/></div>
                 <div className="iot-info"><span>Connected Nodes</span><b>124</b></div>
               </div>
               <div className="iot-card online">
                 <div className="iot-icon"><Camera size={20}/></div>
                 <div className="iot-info"><span>Active Cameras</span><b>89</b></div>
               </div>
               <div className="iot-card offline">
                 <div className="iot-icon"><AlertTriangle size={20}/></div>
                 <div className="iot-info"><span>Offline Cameras</span><b>3</b></div>
               </div>
               <div className="iot-card online">
                 <div className="iot-icon"><Activity size={20}/></div>
                 <div className="iot-info"><span>Active Sensors</span><b>32</b></div>
               </div>
             </div>
          </Card>
        </div>

        {/* Fullscreen / High-Res Incident Snapshot Modal */}
        {modalSnapshot && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setModalSnapshot(null)}
          >
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--line)',
                maxWidth: modalSnapshot.after_image_snapshot ? '960px' : '780px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'max-width 0.2s ease'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--surface-2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: modalSnapshot.status === 'Cleaned' ? '#10B981' : '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    {modalSnapshot.status === 'Cleaned' ? <CheckCircle size={18} /> : <Camera size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                      {modalSnapshot.status === 'Cleaned' ? 'Sanitary Audit: Before vs After Verification' : 'AI Waste Incident Snapshot'} · {modalSnapshot.tracking_id}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {modalSnapshot.ward?.name || 'Nashik Municipal Corporation'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setModalSnapshot(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: Either Side-by-Side (Before & After) OR Single Snapshot with Verification Form */}
              {modalSnapshot.after_image_snapshot ? (
                /* SIDE-BY-SIDE BEFORE & AFTER COMPARISON */
                <div style={{ background: '#090d16', padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* LEFT: BEFORE (कचऱ्याचा ढीग) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: '#DC2626', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>
                          🔴 BEFORE: कचऱ्याचा ढीग (Detected Dump)
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {modalSnapshot.date} · {modalSnapshot.time}
                        </span>
                      </div>
                      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(239, 68, 68, 0.6)', background: '#000' }}>
                        <img
                          src={modalSnapshot.image_snapshot}
                          alt="Before Cleaning"
                          style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    </div>

                    {/* RIGHT: AFTER (स्वच्छ रस्ता) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: '#10B981', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.4px' }}>
                          🟢 AFTER: स्वच्छ रस्ता (Verified Cleaned)
                        </span>
                        <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>
                          ⏱️ Cleaned in {modalSnapshot.resolution_time_minutes || 95}m
                        </span>
                      </div>
                      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(16, 185, 129, 0.6)', background: '#000' }}>
                        <img
                          src={modalSnapshot.after_image_snapshot}
                          alt="After Cleaning"
                          style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SINGLE BEFORE SNAPSHOT */
                <div style={{ position: 'relative', background: '#090d16', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={modalSnapshot.image_snapshot}
                    alt={`Incident ${modalSnapshot.tracking_id}`}
                    style={{
                      width: '100%',
                      maxHeight: '440px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                </div>
              )}

              {/* Modal Details Grid */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Ward (प्रभाग):</div>
                    <b style={{ color: '#10B981', fontSize: '13px' }}>{modalSnapshot.ward?.marathi_name || modalSnapshot.ward?.name || 'Nashik Ward'}</b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Street Location:</div>
                    <b style={{ color: 'var(--ink)', fontSize: '13px' }}>{modalSnapshot.location_name || modalSnapshot.location}</b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>GPS Geolocation:</div>
                    <b style={{ color: '#2563EB', fontFamily: 'monospace', fontSize: '13px' }}>
                      {Number(modalSnapshot.lat || modalSnapshot.latitude).toFixed(6)}°N, {Number(modalSnapshot.lng || modalSnapshot.longitude).toFixed(6)}°E
                    </b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Class & Severity:</div>
                    <b style={{ color: '#DC2626', fontSize: '13px' }}>{modalSnapshot.waste_type || modalSnapshot.type} ({modalSnapshot.confidence || '95%'})</b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Cleanliness Status:</div>
                    <b style={{ color: modalSnapshot.status === 'Cleaned' ? '#10B981' : '#F59E0B', fontSize: '13px' }}>
                      {modalSnapshot.status} {modalSnapshot.after_image_snapshot ? '· Audited Proof' : ''}
                    </b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>{modalSnapshot.status === 'Cleaned' ? 'Cleaned Timestamp:' : 'Detected Timestamp:'}</div>
                    <b style={{ color: 'var(--ink)', fontSize: '13px' }}>
                      {modalSnapshot.cleaned_at_formatted || modalSnapshot.date || 'Today'} · {modalSnapshot.time || ''}
                    </b>
                  </div>
                  {modalSnapshot.cleaning_officer && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--muted)' }}>Sanitary Verification Officer:</div>
                      <b style={{ color: '#059669', fontSize: '13px' }}>
                        🛡️ {modalSnapshot.cleaning_officer} (SLA: {modalSnapshot.resolution_time_minutes || 95} mins achieved)
                      </b>
                    </div>
                  )}
                </div>

                {/* Verification Action Form if not cleaned yet */}
                {modalSnapshot.status !== 'Cleaned' && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1.5px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="#10B981" />
                      <b style={{ color: 'var(--ink)', fontSize: '14px' }}>
                        Record Sanitary Cleaning Verification (स्वच्छता पडताळणी नोंदवा)
                      </b>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Confirm that the municipal sanitation crew has cleaned this roadside waste. You can upload an "After" photo or submit an official verified clean audit stamp.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          Sanitary Inspector / Officer Name:
                        </label>
                        <input
                          type="text"
                          value={verifyOfficer}
                          onChange={(e) => setVerifyOfficer(e.target.value)}
                          placeholder="e.g. Kiran Jadhav (Sanitary Inspector)"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            background: 'var(--surface)',
                            color: 'var(--ink)',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          Upload "After Cleaning" Photo (Optional):
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAfterImageFile(e.target.files[0])}
                          style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button
                        type="button"
                        disabled={verifyLoading}
                        onClick={() => handleVerifyCleaning(modalSnapshot.id || modalSnapshot.tracking_id, verifyOfficer, afterImageFile)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          background: '#10B981',
                          color: '#fff',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: verifyLoading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <CheckCircle size={16} /> {verifyLoading ? 'Recording Verification...' : '✅ Verify Cleaned & Generate Audit Proof (स्वच्छता पूर्ण झाली)'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(modalSnapshot.id || modalSnapshot.tracking_id, modalSnapshot.tracking_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#DC2626',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={15} /> Delete Snapshot
                  </button>
                  <Button kind="secondary" onClick={() => setModalSnapshot(null)}>
                    Close
                  </Button>
                  <button
                    onClick={() => {
                      setModalSnapshot(null);
                      navigate("Map");
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563EB',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <MapPin size={15} /> Locate on GIS Map
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${modalSnapshot.lat || modalSnapshot.latitude},${modalSnapshot.lng || modalSnapshot.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#10B981',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={15} /> Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashcam Video Playback Modal */}
        {selectedVideoModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedVideoModal(null)}
          >
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                maxWidth: '850px',
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b style={{ fontSize: '15px', color: 'var(--ink)' }}>📹 Ride Video Playback: {selectedVideoModal.filename}</b>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Recorded Field Stream · {selectedVideoModal.size_mb} MB · {selectedVideoModal.modified_at}</div>
                </div>
                <button
                  onClick={() => setSelectedVideoModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '16px', background: '#000', display: 'flex', justifyContent: 'center' }}>
                <video
                  controls
                  autoPlay
                  src={selectedVideoModal.stream_url}
                  style={{ width: '100%', maxHeight: '500px', borderRadius: '8px' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>;
}
