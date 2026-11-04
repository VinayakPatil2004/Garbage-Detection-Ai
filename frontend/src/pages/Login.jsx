import { useState } from "react";
import {
  Leaf,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  User,
  Brain,
  Trash2,
  Building2
} from "lucide-react";

export default function Login({ onLogin }) {
  const [signup, setSignup] = useState(false);
  const [visible, setVisible] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert("Please enter both email and password.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("registeredUsers") || "{}");

    if (signup) {
      if (!name.trim()) {
        alert("Please enter your name.");
        return;
      }
      if (users[email]) {
        alert("Email is already registered. Please switch to Sign in.");
        return;
      }
      users[email] = { password, name };
      localStorage.setItem("registeredUsers", JSON.stringify(users));
      localStorage.setItem("currentUser", name);
      localStorage.setItem("currentUserEmail", email);
      onLogin();
    } else {
      // If user list is empty, create a default account or log in
      if (!users[email]) {
        // Allow instant sign-in for seamless first-time experience or check
        users[email] = { password, name: email.split("@")[0] };
        localStorage.setItem("registeredUsers", JSON.stringify(users));
      } else if (users[email].password !== password) {
        alert("Incorrect password. Please try again.");
        return;
      }
      localStorage.setItem("currentUser", users[email]?.name || email.split("@")[0]);
      localStorage.setItem("currentUserEmail", email);
      onLogin();
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Top Header Navigation */}
      <header className="login-top-bar">
        {/* Brand */}
        <div className="login-brand-group">
          <div className="brand-logo-circle">
            <Leaf size={22} className="text-white" strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-title-text">
              GarbageDetect <span className="text-emerald-500">AI</span>
            </div>
            <div className="brand-tagline-text">
              Smarter Cities • Cleaner Tomorrow
            </div>
          </div>
        </div>

        {/* Top Right Tag */}
        <div className="top-quote-tag">
          <span>Less Waste</span>
          <div className="quote-sub">
            More Green <Leaf size={16} className="inline text-emerald-500 ml-1" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="login-content-grid">
        {/* Left Side: Floating Auth Card */}
        <div className="login-card-container">
          <div className="login-auth-card">
            {/* Pill */}
            <div className="auth-card-pill">
              <Sparkles size={13} className="text-emerald-600" />
              <span>AI Powered Urban Care</span>
            </div>

            {/* Heading */}
            <h1 className="auth-card-heading">
              {signup ? "Create " : "Welcome "}
              <span className="text-emerald-500 font-extrabold">
                {signup ? "Account" : "Back"}
              </span>
            </h1>
            <p className="auth-card-subheading">
              {signup
                ? "Register to join the cleaner, smarter city movement."
                : "Sign in to monitor a cleaner, smarter city."}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form-fields">
              {signup && (
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="auth-input-element"
                  />
                </div>
              )}

              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input-element"
                />
              </div>

              <div className="auth-input-wrapper password-input-wrapper">
                <LockKeyhole size={18} className="auth-input-icon" />
                <input
                  type={visible ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input-element"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  className="auth-eye-btn"
                  title={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="auth-meta-row">
                <label className="auth-checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                {!signup && (
                  <button
                    type="button"
                    onClick={() => alert("Password reset link sent to your registered email.")}
                    className="auth-forgot-link"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <button type="submit" className="auth-submit-gradient-btn">
                <span>{signup ? "Register" : "Sign in"}</span>
                <ArrowRight size={18} strokeWidth={2.4} />
              </button>

              <div className="auth-switch-row">
                <span>{signup ? "Already have an account?" : "New user?"}</span>
                <button
                  type="button"
                  onClick={() => setSignup(!signup)}
                  className="auth-switch-link"
                >
                  {signup ? "Sign in" : "Register"}
                </button>
              </div>
            </form>

            <div className="auth-security-footer">
              <ShieldCheck size={15} className="text-slate-400" />
              <span>Protected with enterprise-grade security</span>
            </div>
          </div>
        </div>

        {/* Right Side: Headline and Feature Circles over background */}
        <div className="login-hero-showcase">
          <div className="hero-text-block">
            <h2 className="hero-main-title">
              AI for a <br />
              <span className="hero-highlight-title">Cleaner City</span>
            </h2>
            <p className="hero-subtitle">
              Detect • Classify • Build a Greener Future
            </p>
          </div>

          {/* 4 Feature Circles */}
          <div className="hero-features-row">
            <div className="feature-circle-item">
              <div className="feature-glass-circle circle-teal">
                <Brain size={22} className="text-white" />
              </div>
              <span className="feature-label">AI Powered<br />Detection</span>
            </div>

            <div className="feature-circle-item">
              <div className="feature-glass-circle circle-cyan">
                <Trash2 size={22} className="text-white" />
              </div>
              <span className="feature-label">Smart<br />Classification</span>
            </div>

            <div className="feature-circle-item">
              <div className="feature-glass-circle circle-emerald">
                <Leaf size={22} className="text-white" />
              </div>
              <span className="feature-label">Cleaner<br />Environment</span>
            </div>

            <div className="feature-circle-item">
              <div className="feature-glass-circle circle-blue">
                <Building2 size={22} className="text-white" />
              </div>
              <span className="feature-label">Sustainable<br />Cities</span>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Corner Leaf Shape */}
      <div className="corner-decorative-leaf" />
    </div>
  );
}
