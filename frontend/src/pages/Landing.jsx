import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import { useTheme } from '../hooks/useTheme';
import '../styles/Landing.css';

/* ----------------------------- reveal ----------------------------- */
function useReveal(threshold = 0.16) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const [ref, visible] = useReveal();
  return React.createElement(
    Tag,
    { ref, className: `rv ${visible ? 'rv-in' : ''} ${className}`, style: { transitionDelay: `${delay}ms` } },
    children,
  );
}

/* ------------------------ live reading card ------------------------ */
function Reading() {
  return (
    <figure className="lp-read" aria-label="Sample air-quality reading, Hyderabad">
      <div className="lp-read-top">
        <span className="lp-read-loc">Hyderabad · IN</span>
        <span className="lp-read-live"><i aria-hidden="true" />LIVE</span>
      </div>
      <div className="lp-read-num">
        <span className="lp-read-aqi">156</span>
        <span className="lp-read-cat">Unhealthy<br /><em>PM2.5 dominant</em></span>
      </div>
      <div className="lp-read-band" aria-hidden="true">
        <span className="lp-read-marker" style={{ left: '62%' }} />
      </div>
      <dl className="lp-read-rows">
        <div><dt>PM2.5</dt><dd>78</dd></div>
        <div><dt>PM10</dt><dd>64</dd></div>
        <div><dt>O₃</dt><dd>34</dd></div>
      </dl>
      <figcaption className="lp-read-src">SOURCE · who_air_quality_guidelines.md</figcaption>
    </figure>
  );
}

/* ------------------------------ data ------------------------------ */
const STEPS = [
  { n: '01', t: 'Tell us about you', d: 'Add your conditions and optionally upload a recent report. The text is extracted and indexed privately — scoped to your account alone.' },
  { n: '02', t: 'We read the air', d: 'Live AQI for your location, the last 24 hours, and an hourly forecast — all on one interactive map.' },
  { n: '03', t: 'Get verifiable advice', d: 'Guidance tuned to your conditions, shown with the exact documents it was built on, plus an agent that reveals its reasoning.' },
];

const FEATURES = [
  { t: 'Source-cited recommendations', d: 'Every answer cites the specific WHO, EPA and clinical passages used to write it. No black-box output.' },
  { t: 'Agentic analysis', d: 'A LangGraph agent picks its own tools, pulls live AQI, retrieves guidelines, and shows each step.' },
  { t: 'History & forecast', d: '24 hours of trend and an hourly outlook — so you see a spike coming, not just the current number.' },
  { t: 'Personal health profile', d: 'Conditions, vitals and blood type all factor into the guidance you receive.' },
  { t: 'Privacy by scope', d: 'Uploaded reports become a private namespace only your account can ever retrieve from.' },
  { t: 'Live air-quality map', d: 'Real-time AQI on an interactive map, with the nearest hospitals when the air turns hazardous.' },
];

const BANDS = ['GOOD', 'MODERATE', 'UNHEALTHY (SG)', 'UNHEALTHY', 'VERY UNHEALTHY', 'HAZARDOUS'];
const SOURCES = ['WHO', 'US EPA', 'AHA', 'NHLBI', 'American Lung Assoc.'];

/* ------------------------------ page ------------------------------ */
export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) navigate('/app', { replace: true });
  }, [navigate]);

  const handleLoginSuccess = (loginData) => {
    const { token, user } = loginData || {};
    if (token) localStorage.setItem('authToken', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    setShowLogin(false);
    navigate('/app');
  };

  const openSignup = () => { setShowLogin(false); setShowSignup(true); };
  const openLogin = () => { setShowSignup(false); setShowLogin(true); };
  const enterApp = () => navigate('/app');

  return (
    <div className="lp" id="top">
      <div className="lp-grain" aria-hidden="true" />

      <header className="lp-nav">
        <a className="lp-brand" href="#top">Breathe<span>Smart</span><i className="lp-brand-dot" aria-hidden="true" /></a>
        <div className="lp-nav-r">
          <button type="button" className="lp-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? 'LIGHT' : 'DARK'}
          </button>
          <button type="button" className="lp-link" onClick={openLogin}>Log in</button>
          <button type="button" className="lp-btn" onClick={enterApp}>Open app <span aria-hidden="true">→</span></button>
        </div>
      </header>

      <main className="lp-main">
        {/* ===== HERO ===== */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <Reveal as="p" className="lp-eyebrow">Personalised air-quality intelligence — est. 2026</Reveal>
            <Reveal as="h1" className="lp-title" delay={70}>
              Know the air.<br />
              <span className="lp-title-em">Trust</span> the advice.
            </Reveal>
            <Reveal as="p" className="lp-lede" delay={150}>
              Live AQI paired with retrieval-grounded health guidance. Every recommendation is
              tuned to your conditions — and shows the source document it was built on.
            </Reveal>
            <Reveal className="lp-actions" delay={220}>
              <button type="button" className="lp-btn lg" onClick={enterApp}>Open the app <span aria-hidden="true">→</span></button>
              <button type="button" className="lp-ghost lg" onClick={openLogin}>I have an account</button>
            </Reveal>
          </div>
          <Reveal className="lp-hero-fig" delay={120}><Reading /></Reveal>
        </section>

        {/* ===== TICKER ===== */}
        <div className="lp-ticker" aria-hidden="true">
          <div className="lp-ticker-tape">
            {[...BANDS, ...BANDS, ...BANDS].map((b, i) => (
              <span key={i} className="lp-tick"><i className={`d d${i % BANDS.length}`} />{b}</span>
            ))}
          </div>
        </div>

        {/* ===== HOW ===== */}
        <section className="lp-sec" aria-labelledby="how">
          <p className="lp-kick">／ how it works</p>
          <h2 id="how" className="lp-h2">Three steps to advice you can verify.</h2>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} className="lp-step" delay={i * 80}>
                <span className="lp-step-n">{s.n}</span>
                <div className="lp-step-b">
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="lp-sec" aria-labelledby="feat">
          <p className="lp-kick">／ what you get</p>
          <h2 id="feat" className="lp-h2">Built for people who actually need clean air.</h2>
          <div className="lp-grid">
            {FEATURES.map((f, i) => (
              <Reveal as="article" key={f.t} className="lp-card" delay={(i % 3) * 60}>
                <span className="lp-card-i">{String(i + 1).padStart(2, '0')}</span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===== TRUST ===== */}
        <section className="lp-trust">
          <p className="lp-kick center">／ grounded in</p>
          <div className="lp-srcs">
            {SOURCES.map((s) => <span key={s}>{s}</span>)}
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="lp-final">
          <div className="lp-final-band" aria-hidden="true" />
          <Reveal as="h2" className="lp-final-t">
            Start breathing<br /><span className="lp-title-em">smarter</span> today.
          </Reveal>
          <Reveal className="lp-actions center" delay={120}>
            <button type="button" className="lp-btn lg" onClick={enterApp}>Open the app <span aria-hidden="true">→</span></button>
            <button type="button" className="lp-ghost lg" onClick={openSignup}>Create an account</button>
          </Reveal>
          <p className="lp-fineprint">Free during the dev preview · no credit card · your health data stays on your account.</p>
        </section>
      </main>

      <footer className="lp-footer">
        <span className="lp-brand sm">Breathe<span>Smart</span><i className="lp-brand-dot" aria-hidden="true" /></span>
        <span className="lp-foot-tag">Air-quality intelligence, with sources.</span>
        <span className="lp-foot-meta">2026 — built with React · Spring · FastAPI · Groq</span>
      </footer>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} onSwitchToSignup={openSignup} />
      )}
      {showSignup && (
        <SignupModal onClose={() => setShowSignup(false)} onSwitchToLogin={openLogin} />
      )}
    </div>
  );
}
