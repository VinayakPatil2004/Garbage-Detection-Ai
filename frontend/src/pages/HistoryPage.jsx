import { useState, useEffect } from "react";
import {
  Calendar, ChevronDown, Download, Filter, MapPin, Plus, Search, Trash2, X, RefreshCw, Database, CheckCircle
} from "lucide-react";
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import { useLocation } from "react-router-dom";

export default function HistoryPage({ initialQuery = "", initialStatus = "All statuses" }) {
  const location = useLocation();
  const state = location.state || {};
  const [query, setQuery] = useState(state.filter || initialQuery);
  const [statusFilter, setStatusFilter] = useState(state.status || initialStatus);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbName, setDbName] = useState("MySQL (XAMPP)");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newType, setNewType] = useState("Plastic");
  const [newLocation, setNewLocation] = useState("Station Road Ward 4");

  const fetchDetections = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/history");
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setHistoryItems(json.data);
          if (json.database) setDbName(json.database);
        }
      }
    } catch (e) {
      console.warn("Could not fetch from MySQL API, keeping current records:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetections();
    const interval = setInterval(fetchDetections, 10000); // Live sync every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_name: newLocation,
          waste_type: newType,
          confidence: Math.floor(Math.random() * (99 - 85) + 85),
          severity: "Medium",
          status: "Pending",
          notes: "Manually submitted via History Portal"
        })
      });
      if (res.ok) {
        fetchDetections();
      }
    } catch (err) {
      console.error("Failed to add record:", err);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = async (idToDelete) => {
    try {
      await fetch(`http://localhost:5000/api/history/${idToDelete}`, { method: "DELETE" });
      setHistoryItems(prev => prev.filter(item => item.id !== idToDelete && item.tracking_id !== idToDelete));
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  const handleStatusToggle = async (item) => {
    const nextStatus = item.status === "Pending" ? "Assigned" : item.status === "Assigned" ? "Cleaned" : "Pending";
    try {
      await fetch(`http://localhost:5000/api/history/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchDetections();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filtered = historyItems.filter((item) => {
    const loc = item.location_name || item.location || "";
    const typ = item.waste_type || item.type || "";
    const matchesQuery = `${loc} ${typ}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All statuses" || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const statuses = ["All statuses", "Assigned", "Cleaned", "In Progress", "Pending"];

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="welcome-title">Detection History</div>
          <div className="welcome-sub">
            Review, filter and manage every verified AI detection synced with <b>{dbName}</b>.
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="status-pill" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Database size={14} /> XAMPP MySQL Live
          </div>
          <Button kind="secondary" onClick={fetchDetections}><RefreshCw size={15} /> Refresh</Button>
          <Button kind="primary" onClick={() => setIsAddModalOpen(true)}><Plus size={17} /> Add</Button>
          <Button kind="secondary" onClick={() => window.open("http://localhost:5000/api/reports/csv", "_blank")}>
            <Download size={17} /> Export CSV
          </Button>
        </div>
      </div>
      <Card>
        <div className="table-toolbar">
          <div className="search-box table-search">
            <Search size={17} />
            <input placeholder="Search by location or waste type..." value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} />
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ position: 'relative' }}>
              <div className="select-pill" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => setShowStatusMenu(!showStatusMenu)}>
                {statusFilter} <ChevronDown size={14} />
              </div>
              {showStatusMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '160px' }}>
                  {statuses.map(s => (
                    <button key={s} className="dropdown-item" onClick={() => { setStatusFilter(s); setShowStatusMenu(false); setCurrentPage(1); }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Garbage Type</th>
                <th>Confidence</th>
                <th>Assigned Fleet</th>
                <th>Status (Click to toggle)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && historyItems.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "24px" }}>Loading records from XAMPP MySQL...</td></tr>
              ) : paginated.map((item) => (
                <tr key={item.id}>
                  <td><code style={{ fontSize: "12px", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px" }}>{item.tracking_id || `DET-${item.id}`}</code></td>
                  <td><b>{item.date}</b> <span style={{ color: "var(--muted)", fontSize: "11px" }}>{item.time}</span></td>
                  <td><span className="location-cell"><MapPin size={14} /> {item.location_name || item.location}</span></td>
                  <td><span className={`type-tag ${(item.waste_type || item.type || "").toLowerCase()}`}>{item.waste_type || item.type}</span></td>
                  <td><b>{item.confidence}</b></td>
                  <td><span style={{ fontSize: "12px", color: "var(--muted)" }}>{item.assigned_vehicle || "Unassigned"}</span></td>
                  <td>
                    <button 
                      onClick={() => handleStatusToggle(item)}
                      title="Click to toggle status (Pending -> Assigned -> Cleaned)"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <span className={`status-tag ${(item.status || "").toLowerCase()}`}><i />{item.status}</span>
                    </button>
                  </td>
                  <td>
                    <button className="icon-button" style={{ color: "var(--red)" }} onClick={() => handleDelete(item.id)} title="Delete record from database">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && !loading && (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "24px" }}>No detection records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Showing {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} detections in XAMPP MySQL</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button kind="secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
            <Button kind="secondary" disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
      
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--surface)", padding: "24px", borderRadius: "12px", width: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", color: "var(--ink)" }}>
            <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>Add Citizen / Manual Report (XAMPP MySQL)</h3>
            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "var(--muted)", fontWeight: "bold" }}>Garbage Type</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
                  <option>Plastic</option>
                  <option>Cardboard</option>
                  <option>Metal</option>
                  <option>Paper</option>
                  <option>Organic</option>
                  <option>Mixed Waste</option>
                </select>
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "var(--muted)", fontWeight: "bold" }}>Location / Ward Name</label>
                <input value={newLocation} onChange={e => setNewLocation(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button kind="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button kind="primary" type="submit">Save to MySQL</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
