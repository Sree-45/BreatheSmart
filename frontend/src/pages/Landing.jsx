import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AirIcon from '@mui/icons-material/Air';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import TimelineIcon from '@mui/icons-material/Timeline';
import VerifiedIcon from '@mui/icons-material/Verified';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import SecurityIcon from '@mui/icons-material/Security';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import '../styles/Landing.css';

/* ----------------------------- helpers ----------------------------- */

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* --------------------------- mock previews --------------------------- */

function AqiRing({ value = 156, label = 'Unhealthy' }) {
  // Map AQI 0..500 onto the ring (clamped at 300 for visual breathing room).
  const pct = Math.max(0, Math.min(1, value / 300));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  return (
    <div className="aqi-ring-wrap" aria-hidden="true">
      <svg className="aqi-ring" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="aqiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} className="aqi-ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="aqi-ring-progress"
          stroke="url(#aqiGrad)"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="aqi-ring-text">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function HeroPreviewCard() {
  return (
    <div className="hero-preview" role="img" aria-label="Sample BreatheSmart air quality card">
      <div className="hero-preview-glow" aria-hidden="true" />
      <div className="hero-preview-card">
        <div className="hero-preview-head">
          <span className="hero-preview-dot" />
          <span className="hero-preview-loc">Live · Hyderabad</span>
          <span className="hero-preview-time">Updated 2 min ago</span>
        </div>
        <div className="hero-preview-body">
          <AqiRing value={156} label="Unhealthy" />
          <ul className="hero-preview-pollutants">
            <li><span className="pollutant-name">PM2.5</span><span className="pollutant-bar"><span style={{ width: '78%' }} className="pollutant-bar-fill bad" /></span><span className="pollutant-val">78</span></li>
            <li><span className="pollutant-name">PM10</span><span className="pollutant-bar"><span style={{ width: '64%' }} className="pollutant-bar-fill warn" /></span><span className="pollutant-val">64</span></li>
            <li><span className="pollutant-name">NO₂</span><span className="pollutant-bar"><span style={{ width: '22%' }} className="pollutant-bar-fill ok" /></span><span className="pollutant-val">22</span></li>
            <li><span className="pollutant-name">O₃</span><span className="pollutant-bar"><span style={{ width: '34%' }} className="pollutant-bar-fill ok" /></span><span className="pollutant-val">34</span></li>
          </ul>
        </div>
        <div className="hero-preview-tip">
          <BoltIcon fontSize="small" />
          <span>Asthma · keep your inhaler accessible and avoid outdoor exertion this afternoon.</span>
        </div>
      </div>
    </div>
  );
}

function SourcesMockup() {
  return (
    <div className="mock-sources" aria-hidden="true">
      <div className="mock-sources-toggle">
        <span><LibraryBooksIcon fontSize="small" /> Sources used (3)</span>
        <span className="mock-sources-latency">· 1.4s</span>
      </div>
      <div className="mock-sources-list">
        <div className="mock-source">
          <div className="mock-source-head">
            <span className="mock-source-title">who_air_quality_guidelines.md</span>
            <span className="mock-source-scope global">Global guideline</span>
            <span className="mock-source-score">match 84%</span>
          </div>
          <p>PM2.5 24-hour mean of 15 µg/m³ marks the WHO 2021 limit. Above 35 µg/m³ reduce outdoor exertion…</p>
        </div>
        <div className="mock-source">
          <div className="mock-source-head">
            <span className="mock-source-title">asthma_air_quality.md</span>
            <span className="mock-source-scope global">Global guideline</span>
            <span className="mock-source-score">match 79%</span>
          </div>
          <p>Asthmatics should carry rescue inhalers when AQI &gt; 100 and reschedule strenuous outdoor exercise…</p>
        </div>
        <div className="mock-source">
          <div className="mock-source-head">
            <span className="mock-source-title">your_report_2025-09.pdf</span>
            <span className="mock-source-scope user">Your uploaded report</span>
            <span className="mock-source-score">match 71%</span>
          </div>
          <p>Spirometry FEV1 92% predicted. Mild persistent asthma. Daily ICS controller, salbutamol PRN…</p>
        </div>
      </div>
    </div>
  );
}

function AgentMockup() {
  return (
    <div className="mock-agent" aria-hidden="true">
      <div className="mock-agent-header">
        <AutoAwesomeIcon fontSize="small" />
        <span>Agent · LangGraph</span>
      </div>
      <ol className="mock-agent-steps">
        <li><span className="mock-agent-step-num">1</span><div><strong>fetched live AQI</strong><small>tool · fetch_aqi_for_city("Hyderabad")</small></div></li>
        <li><span className="mock-agent-step-num">2</span><div><strong>ran RAG retrieval</strong><small>tool · get_health_recommendation</small></div></li>
        <li><span className="mock-agent-step-num">3</span><div><strong>answered</strong><small>grounded in 3 retrieved chunks</small></div></li>
      </ol>
    </div>
  );
}

function ProfilePreview() {
  return (
    <div className="mock-profile" aria-hidden="true">
      <div className="mock-profile-row">
        <span className="mock-profile-label">Conditions</span>
        <span className="mock-profile-pill">Asthma</span>
        <span className="mock-profile-pill">Hay fever</span>
      </div>
      <div className="mock-profile-row">
        <span className="mock-profile-label">Reports</span>
        <span className="mock-profile-pill subtle">spirometry_2025.pdf</span>
      </div>
      <div className="mock-profile-row">
        <span className="mock-profile-label">Personalisation</span>
        <span className="mock-profile-pill ok"><VerifiedIcon fontSize="inherit" /> 4 chunks indexed</span>
      </div>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */

export default function Landing() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) navigate('/app', { replace: true });
  }, [navigate]);

  const handleLoginSuccess = (loginData) => {
    // login() returns { token, user } — store both so /app sees an authenticated session.
    const { token, user } = loginData || {};
    if (token) localStorage.setItem('authToken', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    setShowLogin(false);
    navigate('/app');
  };

  const openSignup = () => { setShowLogin(false); setShowSignup(true); };
  const openLogin = () => { setShowSignup(false); setShowLogin(true); };

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-brand" href="#top">
          <AirIcon className="landing-brand-icon" />
          <span>BreatheSmart</span>
        </a>
        <nav className="landing-nav-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#sources">Trust</a>
        </nav>
        <div className="landing-nav-actions">
          <button type="button" className="landing-nav-btn ghost" onClick={openLogin}>
            Log in
          </button>
          <button type="button" className="landing-nav-btn primary" onClick={() => setShowSignup(true)}>
            Sign up
          </button>
        </div>
      </header>

      <main className="landing-main" id="top">
        {/* ============== HERO ============== */}
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <Reveal>
              <p className="landing-eyebrow">
                <span className="landing-eyebrow-dot" /> Personalised air-quality intelligence
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="landing-title">
                Air quality advice you can <span className="accent">verify</span>.
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p className="landing-subtitle">
                BreatheSmart pairs live AQI with retrieval-grounded health guidance.
                Every recommendation is tailored to your conditions and shows the source documents
                it was built on.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="landing-cta-row">
                <button type="button" className="landing-cta primary" onClick={() => setShowSignup(true)}>
                  Get started
                  <ArrowForwardIcon fontSize="small" />
                </button>
                <button type="button" className="landing-cta secondary" onClick={openLogin}>
                  I already have an account
                </button>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <ul className="landing-hero-bullets">
                <li><VerifiedIcon fontSize="inherit" /> Grounded in WHO, EPA &amp; AHA guidelines</li>
                <li><SecurityIcon fontSize="inherit" /> Your reports stay scoped to your account</li>
                <li><BoltIcon fontSize="inherit" /> Real-time AQI &amp; 24-hour forecasts</li>
              </ul>
            </Reveal>
          </div>

          <Reveal className="landing-hero-visual" delay={120}>
            <HeroPreviewCard />
          </Reveal>
        </section>

        {/* ============== STATS STRIP ============== */}
        <Reveal>
          <section className="landing-stats" aria-label="At a glance">
            <div className="landing-stat">
              <strong>99%</strong>
              <span>of people breathe air that exceeds WHO PM2.5 limits</span>
            </div>
            <div className="landing-stat">
              <strong>2.4×</strong>
              <span>higher asthma ED visits on high-pollution days</span>
            </div>
            <div className="landing-stat">
              <strong>0</strong>
              <span>recommendations without a verifiable source</span>
            </div>
          </section>
        </Reveal>

        {/* ============== BENTO FEATURES ============== */}
        <section className="landing-section" id="features">
          <Reveal>
            <header className="landing-section-head">
              <p className="landing-section-eyebrow">What you get</p>
              <h2>Built for people who actually need clean air.</h2>
              <p className="landing-section-sub">
                Not a generic AQI app — a coach that knows your conditions and explains its reasoning.
              </p>
            </header>
          </Reveal>

          <div className="bento">
            <Reveal className="bento-tile bento-tile--lg">
              <div className="bento-tile-text">
                <div className="bento-tile-icon"><LibraryBooksIcon /></div>
                <h3>Recommendations grounded in real medical guidelines.</h3>
                <p>
                  Every answer cites the specific WHO, EPA, asthma and cardiovascular reference chunks
                  used to produce it. No more black-box AI.
                </p>
              </div>
              <SourcesMockup />
            </Reveal>

            <Reveal className="bento-tile bento-tile--md" delay={80}>
              <div className="bento-tile-icon agent"><AutoAwesomeIcon /></div>
              <h3>Agentic analysis</h3>
              <p>A LangGraph agent picks its own tools and shows its reasoning.</p>
              <AgentMockup />
            </Reveal>

            <Reveal className="bento-tile bento-tile--sm" delay={120}>
              <div className="bento-tile-icon"><TimelineIcon /></div>
              <h3>24-hour history &amp; forecast</h3>
              <p>Spot trends before they spike — not just the current number.</p>
            </Reveal>

            <Reveal className="bento-tile bento-tile--sm" delay={160}>
              <div className="bento-tile-icon"><HealthAndSafetyIcon /></div>
              <h3>Personal health profile</h3>
              <p>Conditions, vitals, blood type — all factored into your guidance.</p>
            </Reveal>

            <Reveal className="bento-tile bento-tile--md" delay={200}>
              <div className="bento-tile-icon"><VisibilityOutlinedIcon /></div>
              <h3>Privacy by scope</h3>
              <p>
                Uploaded reports become a private vector namespace only your account can retrieve from.
              </p>
              <ProfilePreview />
            </Reveal>
          </div>
        </section>

        {/* ============== TRUST / SOURCES ============== */}
        <Reveal>
          <section className="landing-trust" id="sources">
            <div className="landing-trust-copy">
              <p className="landing-section-eyebrow">Where guidance comes from</p>
              <h2>Retrieval-grounded, not auto-generated.</h2>
              <p>
                Recommendations are retrieved from a curated reference corpus before the model writes a word.
                You see the sources that drove every answer.
              </p>
            </div>
            <div className="landing-trust-logos" aria-label="Reference sources">
              <span>WHO Global AQ Guidelines</span>
              <span>US EPA AQI</span>
              <span>American Heart Association</span>
              <span>NHLBI Asthma</span>
              <span>American Lung Association</span>
            </div>
          </section>
        </Reveal>

        {/* ============== HOW IT WORKS ============== */}
        <section className="landing-section" id="how">
          <Reveal>
            <header className="landing-section-head">
              <p className="landing-section-eyebrow">How it works</p>
              <h2>From sign-up to verifiable advice in three steps.</h2>
            </header>
          </Reveal>

          <ol className="landing-steps">
            <Reveal>
              <li>
                <span className="landing-step-num">1</span>
                <div>
                  <h4>Tell us about you</h4>
                  <p>Add a health profile and optionally upload a recent medical report. Text is extracted and indexed privately.</p>
                </div>
              </li>
            </Reveal>
            <Reveal delay={80}>
              <li>
                <span className="landing-step-num">2</span>
                <div>
                  <h4>We pull live air quality</h4>
                  <p>Real-time AQI for your saved location, 24-hour history, and a hourly forecast for the next day.</p>
                </div>
              </li>
            </Reveal>
            <Reveal delay={160}>
              <li>
                <span className="landing-step-num">3</span>
                <div>
                  <h4>Get grounded recommendations</h4>
                  <p>Personalised guidance with the source documents used to generate it, plus an agentic analysis option.</p>
                </div>
              </li>
            </Reveal>
          </ol>
        </section>

        {/* ============== FINAL CTA ============== */}
        <Reveal>
          <section className="landing-cta-card" aria-label="Final CTA">
            <h2>Start breathing smarter today.</h2>
            <p>Free during the dev preview · no credit card · health data stays on your account.</p>
            <div className="landing-cta-row centered">
              <button type="button" className="landing-cta primary" onClick={() => setShowSignup(true)}>
                Create your account <ArrowForwardIcon fontSize="small" />
              </button>
              <button type="button" className="landing-cta secondary" onClick={openLogin}>
                Log in instead
              </button>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-row">
          <div className="landing-brand">
            <AirIcon className="landing-brand-icon" />
            <span>BreatheSmart</span>
          </div>
          <span className="landing-footer-tagline">Air-quality intelligence, with sources.</span>
        </div>
        <div className="landing-footer-row landing-footer-tech" aria-label="Tech stack">
          <span className="landing-footer-stack-label">Built with</span>
          {[
            'React', 'Spring Boot', 'FastAPI', 'LangChain', 'LangGraph',
            'ChromaDB', 'Spring AI', 'MongoDB', 'Apache Tika',
          ].map((t) => (
            <span key={t} className="landing-tech-pill">{t}</span>
          ))}
        </div>
      </footer>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={openSignup}
        />
      )}
      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={openLogin}
        />
      )}
    </div>
  );
}
