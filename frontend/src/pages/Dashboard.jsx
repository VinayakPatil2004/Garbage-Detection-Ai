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

    const fetchWardSnapshots = async (ward = selectedWard) => {
      try {
        const res = await fetch(`/api/dashboard/ward_snapshots?city=Nashik&ward=${ward}`);
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

    useEffect(() => {
      fetchWardSnapshots(selectedWard);
      const interval = setInterval(() => fetchWardSnapshots(selectedWard), 3000);
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

            {/* Snapshots Grid */}
            {loadingSnapshots ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Loading Nashik Ward incident snapshots...
              </div>
            ) : wardSnapshots.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface-2)', borderRadius: '12px' }}>
                <Camera size={36} color="var(--muted-2)" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>No garbage detected in this ward yet</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Point mobile camera at street waste in this area to generate live snapshots with GPS coordinates.
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '16px'
              }}>
                {wardSnapshots.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      border: '1px solid var(--line)',
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
                      style={{ position: 'relative', height: '175px', background: '#0f172a', cursor: 'pointer', overflow: 'hidden' }}
                      onClick={() => setModalSnapshot(item)}
                      title="Click to enlarge snapshot photo"
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
                      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: '6px' }}>
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
                      </div>

                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
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
                      </div>

                      {/* Enlarge Hint Pill */}
                      <div style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Maximize2 size={10} /> Enlarge
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
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                        <button
                          onClick={() => navigate("Map")}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#2563EB',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <MapPin size={12} /> View on Map
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
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: '#10B981',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <ExternalLink size={12} /> Google Maps
                        </a>
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
                maxWidth: '780px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column'
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
                    background: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Camera size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                      AI Waste Incident Snapshot · {modalSnapshot.tracking_id}
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

              {/* Modal Image Body */}
              <div style={{ position: 'relative', background: '#090d16', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={modalSnapshot.image_snapshot}
                  alt={`Incident ${modalSnapshot.tracking_id}`}
                  style={{
                    width: '100%',
                    maxHeight: '480px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>

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
                    <div style={{ color: 'var(--muted)' }}>Class & Confidence:</div>
                    <b style={{ color: '#DC2626', fontSize: '13px' }}>{modalSnapshot.waste_type || modalSnapshot.type} ({modalSnapshot.confidence})</b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Assigned Vehicle:</div>
                    <b style={{ color: 'var(--ink)', fontSize: '13px' }}>{modalSnapshot.assigned_vehicle || 'MH-15-EM-4091 (Ghanta Gadi)'}</b>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Timestamp:</div>
                    <b style={{ color: 'var(--ink)', fontSize: '13px' }}>{modalSnapshot.date || 'Today'} · {modalSnapshot.time}</b>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
      </div>;
}
