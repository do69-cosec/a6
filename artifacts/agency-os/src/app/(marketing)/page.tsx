import React from "react";

export default function HomePage() {
  return (
    <>
      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
          <span className="ticker-item">we commit we deliver</span><span className="ticker-dot"> ✳ </span>
        </div>
      </div>

      {/* HERO (OSMO STYLE) */}
      <section className="hero-page" id="hero">
        <div className="hero-text">
          <p className="hero-location">Digital Marketing Agency · Palghar, Maharashtra</p>
          <h1 className="hero-headline">
            <span className="headline-part">Think You've Seen Growth?</span>
            <span className="hero-logo-icon">
              <svg viewBox="0 0 60 40" fill="currentColor">
                <path d="M5 5 L28 20 L5 35 Z" />
                <path d="M31 5 L54 20 L31 35 Z" />
              </svg>
            </span>
            <span className="headline-part">Not Yet</span>
          </h1>
          <p className="hero-sub">
            Results-driven strategies that scale your business.
          </p>
          <div className="hero-pills">
            <span className="pill">Performance Ads</span> <span className="pill">SEO</span>
            <span className="pill">Creative Content</span> <span className="pill">Social Media</span>
          </div>
        </div>

        {/* ARC */}
        <div className="arc-scene" id="arcScene">
          <svg className="arc-orbit-path" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <circle cx="50" cy="50" r="49.5" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="0.08" strokeDasharray="0.3 0.3" />
          </svg>

          <div className="arc-ring" id="arcRing">
            <div className="a-card" style={{ background: "#f5f0e8" }}>
              <div className="card-inner" style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", padding: "18px", gap: "8px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "34px", fontWeight: 800, color: "#111", lineHeight: 1 }}>MatterJS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "4px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#4CAF50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🙂</div>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#FFEB3B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🙂</div>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#FF9800", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🙂</div>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#e91e63", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🙂</div>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#2196F3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🙂</div>
                </div>
                <div className="card-label" style={{ background: "linear-gradient(transparent,rgba(245,240,232,0.95))", color: "#111" }}>Falling 2D Objects (MatterJS)</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#0a0a0a" }}>
              <div className="card-inner">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", padding: "14px", width: "100%", height: "100%" }}>
                  <div style={{ background: "#1a2535", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🌌</div>
                  <div style={{ background: "#251535", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🌃</div>
                  <div style={{ background: "#152535", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🌉</div>
                  <div style={{ background: "#352515", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🌆</div>
                </div>
                <div className="card-label">3D Image Carousel</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#c8cfc0" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "16px", alignItems: "flex-start", justifyContent: "flex-start" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "#111", lineHeight: 1, letterSpacing: "-0.02em" }}>LOCO<br />MOTIVE</div>
                <div style={{ marginTop: "10px", width: "100px", height: "80px", background: "rgba(0,0,0,0.12)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>🌿</div>
                <div className="card-label" style={{ background: "linear-gradient(transparent,rgba(180,188,170,0.95))", color: "#111" }}>Locomotive Smooth Scroll Setup</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#0d0d0d" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "18px", alignItems: "flex-start", justifyContent: "flex-start", gap: "10px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "#4a9eff", fontSize: "12px", fontWeight: 600 }}>Webflow</span>
                  <span style={{ color: "#ccc", fontSize: "12px" }}>Behance</span>
                  <span style={{ color: "#ccc", fontSize: "12px" }}>asana</span>
                  <span style={{ color: "white", fontSize: "14px" }}>✳</span>
                  <span style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>android</span>
                  <span style={{ color: "#ccc", fontSize: "16px" }}>🦋</span>
                </div>
                <div className="card-label">Logo Wall Cycle</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#111" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "14px", alignItems: "flex-start", justifyContent: "flex-start", gap: "6px" }}>
                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <div style={{ flex: 1, background: "#252525", borderRadius: "10px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>👤</div>
                  <div style={{ flex: 1, background: "#252525", borderRadius: "10px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>👤</div>
                </div>
                <div className="card-label">Momentum Based Hover (Inertia)</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "linear-gradient(145deg,#0d1a4a,#1040a0)" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "20px", alignItems: "flex-start", justifyContent: "flex-start" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 800, color: "white", lineHeight: 1.1 }}>Pixelate<br />Render</div>
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "2px", width: "80px", imageRendering: "pixelated" }}>
                  <div style={{ width: "12px", height: "12px", background: "#1a4ae0" }}></div>
                  <div style={{ width: "12px", height: "12px", background: "#4a8aff" }}></div>
                  <div style={{ width: "12px", height: "12px", background: "#1a4ae0" }}></div>
                </div>
                <div className="card-label">Pixelate Image Render Effect</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#111" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "14px", gap: "5px" }}>
                <div style={{ width: "100%", background: "#1a1a1a", borderRadius: "8px", padding: "10px 8px", fontFamily: "var(--font-body)", fontSize: "10px", color: "#777" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #252525" }}><span>Site of the Day</span><span style={{ color: "var(--blue)" }}>FlowPort</span><span>2025</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #252525" }}><span>Developer Award</span><span style={{ color: "white" }}>FlowPort</span><span>2025</span></div>
                </div>
                <div className="card-label">Award Winners 2025</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#1a1a2e" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "18px", alignItems: "flex-start", justifyContent: "flex-start", gap: "10px" }}>
                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <div style={{ flex: 1, background: "linear-gradient(135deg,#e74c3c,#c0392b)", borderRadius: "10px", height: "55px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <div style={{ fontSize: "24px" }}>🃏</div>
                  </div>
                  <div style={{ flex: 1, background: "linear-gradient(135deg,#3498db,#2980b9)", borderRadius: "10px", height: "55px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <div style={{ fontSize: "24px" }}>🎴</div>
                  </div>
                  <div style={{ flex: 1, background: "linear-gradient(135deg,#2ecc71,#27ae60)", borderRadius: "10px", height: "55px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <div style={{ fontSize: "24px" }}>🃏</div>
                  </div>
                </div>
                <div className="card-label">Flick Cards Slider</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#2d1b4e" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "18px", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#8e44ad,#9b59b6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", border: "2px solid rgba(255,255,255,0.15)" }}>👁️</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Interactive</div>
                <div className="card-label">Face Follow Cursor</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#0a2a1a" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "16px", alignItems: "flex-start", justifyContent: "flex-start", gap: "6px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, color: "var(--blue)", lineHeight: 1, letterSpacing: "-0.02em", textTransform: "uppercase" }}>Scroll<br />Velocity</div>
                <div style={{ display: "flex", gap: "3px", marginTop: "6px" }}>
                  <div style={{ width: "40px", height: "4px", background: "var(--blue)", borderRadius: "2px" }}></div>
                  <div style={{ width: "25px", height: "4px", background: "rgba(61,61,255,0.4)", borderRadius: "2px" }}></div>
                  <div style={{ width: "15px", height: "4px", background: "rgba(61,61,255,0.2)", borderRadius: "2px" }}></div>
                </div>
                <div className="card-label" style={{ background: "linear-gradient(transparent,rgba(10,42,26,0.95))", color: "var(--blue)" }}>Scroll Velocity Text</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "linear-gradient(145deg,#1a1a2e,#16213e)" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "14px", gap: "5px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", width: "100%" }}>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "6px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>📐</div>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>📐</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", width: "100%" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>📐</div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "6px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>📐</div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>📐</div>
                </div>
                <div className="card-label">GSAP Flip Layout</div>
              </div>
            </div>

            <div className="a-card" style={{ background: "#0d0d0d" }}>
              <div className="card-inner" style={{ flexDirection: "column", padding: "18px", alignItems: "flex-start", justifyContent: "flex-start", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>Page Flow</div>
                </div>
                <div style={{ width: "100%", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: "65%", height: 100, background: "var(--blue)", borderRadius: "2px" }}></div>
                </div>
                <div className="card-label">Smooth Page Transitions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Inner text sitting below the arc, similar to Osmo */}
        <div className="hero-inner-text">
          <div className="play-reel-btn">
            <span className="play-text" id="wPlay">Play</span>
            <div id="card-anchor"></div>
            <span className="reel-text" id="wReel">Reel</span>
          </div>
        </div>

        {/* Expanding card */}
        <div id="card">
          <div className="card-scanlines"></div>
          <div className="card-glow-inner"></div>
          {/* YouTube Video background */}
          <div className="reel-grid" style={{ display: "block", overflow: "hidden", padding: 0, background: "#000" }}>
            <iframe
              src="https://www.youtube.com/embed/RvreULjnzFo?autoplay=1&mute=1&controls=0&loop=1&playlist=RvreULjnzFo&showinfo=0&rel=0&modestbranding=1"
              style={{ position: "absolute", top: "50%", left: "50%", width: "100vw", height: "56.25vw", minWidth: "177.77vh", minHeight: "100vh", transform: "translate(-50%, -50%)", pointerEvents: "none", border: "none", filter: "contrast(1.05) saturate(1.1)" }}
              allow="autoplay; fullscreen; picture-in-picture"
            ></iframe>
          </div>
          <div className="play-circle" id="play-circle">
            <svg id="play-svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 2.5L12.5 8L5 13.5V2.5Z" fill="#fff" />
            </svg>
          </div>

          <div className="fs-ui" id="fs-ui">
            <div className="fs-close" id="fs-close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </div>
            <div className="fs-progress"><div className="fs-fill" id="fs-fill"></div></div>
          </div>
        </div>
      </section>

      {/* BLINK */}
      <section className="parallax-word-section" id="section-blink">
        <div className="parallax-sticky">
          <div className="parallax-text-content">
            <div className="service-word-wrap">
              <span className="script-label top-left">Attention</span>
              <div className="service-big-word">BLINK</div>
              <span className="script-label bottom-right">Visibility</span>
            </div>
            <p className="service-word-desc">We grab attention with eye-catching visuals, smart content, and scroll-stopping strategies that make brands noticeable.</p>
          </div>
          <div className="parallax-images">
            <div className="parallax-img pimg-1" data-speed="0.9">
              <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80" alt="Retro neon tech" />
            </div>
            <div className="parallax-img pimg-2" data-speed="0.5">
              <img src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&q=80" alt="Social media apps" />
            </div>
            <div className="parallax-img pimg-3" data-speed="1.0">
              <img src="https://images.unsplash.com/photo-1559028012-481c04fa702d?w=500&q=80" alt="Creative design" />
            </div>
            <div className="parallax-img pimg-4" data-speed="0.6">
              <img src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=500&q=80" alt="Mobile interface" />
            </div>
            <div className="parallax-img pimg-5" data-speed="0.75">
              <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&q=80" alt="Tech workspace" />
            </div>
            <div className="parallax-img pimg-6" data-speed="0.45">
              <img src="https://images.unsplash.com/photo-1535303311164-664fc9ec6532?w=500&q=80" alt="Phone photography" />
            </div>
          </div>
        </div>
      </section>

      {/* BUILD */}
      <section className="parallax-word-section" id="section-build">
        <div className="parallax-sticky">
          <div className="parallax-text-content">
            <div className="service-word-wrap">
              <span className="script-label top-left">Creation</span>
              <div className="service-big-word">BUILD</div>
              <span className="script-label bottom-right">Structure</span>
            </div>
            <p className="service-word-desc">We design and develop strong digital foundations through websites, platforms, and systems that are fast, functional, and scalable.</p>
          </div>
          <div className="parallax-images">
            <div className="parallax-img pimg-1" data-speed="0.8">
              <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&q=80" alt="Coding on laptop" />
            </div>
            <div className="parallax-img pimg-2" data-speed="0.5">
              <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&q=80" alt="Analytics dashboard" />
            </div>
            <div className="parallax-img pimg-3" data-speed="0.95">
              <img src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&q=80" alt="Web development" />
            </div>
            <div className="parallax-img pimg-4" data-speed="0.6">
              <img src="https://images.unsplash.com/photo-1547658719-da2b51169166?w=500&q=80" alt="Design workspace" />
            </div>
            <div className="parallax-img pimg-5" data-speed="0.7">
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80" alt="Code editor" />
            </div>
            <div className="parallax-img pimg-6" data-speed="0.4">
              <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&q=80" alt="Architecture plan" />
            </div>
          </div>
        </div>
      </section>

      {/* BOOM */}
      <section className="parallax-word-section" id="section-boom">
        <div className="parallax-sticky">
          <div className="parallax-text-content">
            <div className="service-word-wrap">
              <span className="script-label top-left">Growth</span>
              <div className="service-big-word">BOOM</div>
              <span className="script-label bottom-right">Results</span>
            </div>
            <p className="service-word-desc">We scale your brand using data-driven strategies that convert attention into leads, sales, and long-term business growth.</p>
          </div>
          <div className="parallax-images">
            <div className="parallax-img pimg-1" data-speed="0.85">
              <img src="https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=500&q=80" alt="Marketing strategy" />
            </div>
            <div className="parallax-img pimg-2" data-speed="0.5">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80" alt="Data analytics" />
            </div>
            <div className="parallax-img pimg-3" data-speed="1.0">
              <img src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=500&q=80" alt="Dashboard metrics" />
            </div>
            <div className="parallax-img pimg-4" data-speed="0.6">
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&q=80" alt="Team collaboration" />
            </div>
            <div className="parallax-img pimg-5" data-speed="0.7">
              <img src="https://images.unsplash.com/photo-1553484771-047a44eee27b?w=500&q=80" alt="Rocket launch" />
            </div>
            <div className="parallax-img pimg-6" data-speed="0.45">
              <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&q=80" alt="Business meeting" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY CLIENTS */}
      <section className="trusted-section section-pad" id="trusted-clients">
        <div className="container">
          <div className="trusted-header reveal">
            <span className="trusted-label">Trusted by</span>
            <h2 className="trusted-title">Industry Leaders</h2>
            <p className="trusted-subtitle">We've partnered with forward-thinking brands to deliver exceptional digital experiences.</p>
          </div>
        </div>
        <div className="trusted-marquee-wrap">
          <div className="trusted-marquee-track">
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="18" fontWeight="800" letterSpacing="2">TECHVISTA</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="700" letterSpacing="1">NOVACORE</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="800" letterSpacing="3">ZENITH</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontWeight="700" letterSpacing="1">BRIGHTPATH</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="800" letterSpacing="2">FLOWPORT</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="700" letterSpacing="2">NEXAGEN</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontWeight="800" letterSpacing="1">LUMINARY</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="700" letterSpacing="2">CRESTAL</text></svg>
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="18" fontWeight="800" letterSpacing="2">TECHVISTA</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="700" letterSpacing="1">NOVACORE</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="800" letterSpacing="3">ZENITH</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontWeight="700" letterSpacing="1">BRIGHTPATH</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="800" letterSpacing="2">FLOWPORT</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="15" fontWeight="700" letterSpacing="2">NEXAGEN</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontWeight="800" letterSpacing="1">LUMINARY</text></svg>
            </div>
            <div className="trusted-logo-item">
              <svg className="trusted-logo-svg" viewBox="0 0 120 40" fill="currentColor"><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fontWeight="700" letterSpacing="2">CRESTAL</text></svg>
            </div>
          </div>
        </div>
        <div className="trusted-stats reveal">
          <div className="trusted-stat">
            <span className="trusted-stat-num" data-count="20">0</span><span className="trusted-stat-suffix">+</span>
            <span className="trusted-stat-label">Projects Delivered</span>
          </div>
          <div className="trusted-stat-divider"></div>
          <div className="trusted-stat">
            <span className="trusted-stat-num" data-count="98">0</span><span className="trusted-stat-suffix">%</span>
            <span className="trusted-stat-label">Client Satisfaction</span>
          </div>
          <div className="trusted-stat-divider"></div>
          <div className="trusted-stat">
            <span className="trusted-stat-num" data-count="3">0</span><span className="trusted-stat-suffix">+</span>
            <span className="trusted-stat-label">Years of Excellence</span>
          </div>
          <div className="trusted-stat-divider"></div>
          <div className="trusted-stat">
            <span className="trusted-stat-num" data-count="15">0</span><span className="trusted-stat-suffix">+</span>
            <span className="trusted-stat-label">Happy Clients</span>
          </div>
        </div>
      </section>

      {/* ABOUT US / OUR SERVICES CARDS */}
      <section className="cards-section section-pad">
        <div className="container">
          <div className="cards-grid">
            {/* About Us Card */}
            <a href="/about" className="info-card reveal magnetic-card">
              <div className="info-card-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=75')" }}></div>
              <div className="card-base-layer">
                <div className="info-card-content">
                  <h3 className="info-card-title">About<br />Us</h3>
                  <p className="info-card-subtitle">Who we are.</p>
                  <p className="info-card-body">We are a passionate team of <strong>innovators</strong> and <strong>creators</strong>. We don't just build websites; we craft immersive digital journeys that leave a lasting impact.</p>
                </div>
              </div>
              {/* Magnetic Reveal Layer */}
              <div className="magnetic-reveal">
                <div className="magnetic-reveal-inner">
                  <div className="magnetic-reveal-content">
                    <span className="reveal-icon">👥</span>
                    <span className="reveal-title">MEET THE TEAM</span>
                    <span className="reveal-subtitle">Discover the creative minds behind Blink Beyond</span>
                    <span className="reveal-cta">Explore →</span>
                  </div>
                </div>
              </div>
            </a>
            {/* Our Services Card */}
            <a href="/services" className="info-card reveal reveal-delay-2 magnetic-card">
              <div className="info-card-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=75')" }}></div>
              <div className="card-base-layer">
                <div className="info-card-content">
                  <h3 className="info-card-title">Our<br />Services</h3>
                  <p className="info-card-subtitle">What we do.</p>
                  <p className="info-card-body">From <strong>brand identity</strong> to <strong>high-performance marketing</strong>, we provide end-to-end solutions that elevate your business to the next level.</p>
                </div>
              </div>
              {/* Magnetic Reveal Layer */}
              <div className="magnetic-reveal">
                <div className="magnetic-reveal-inner">
                  <div className="magnetic-reveal-content">
                    <span className="reveal-icon">🚀</span>
                    <span className="reveal-title">OUR SERVICES</span>
                    <span className="reveal-subtitle">Web • Social Media • Performance Marketing</span>
                    <span className="reveal-cta">View All →</span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* TEAM SHOWCASE */}
      <section className="team-showcase-section" id="team-showcase">
        <div className="team-sticky-container">
          <div className="team-overlay-text">
            <h2>CREATIVE<br />MINDS</h2>
          </div>
        </div>
        <div className="team-grid">
          <div className="team-item t-1"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80" className="team-img" alt="Team 1" /></div></div>
          <div className="team-item t-2"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80" className="team-img" alt="Team 2" /></div></div>
          <div className="team-item t-3"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80" className="team-img" alt="Team 3" /></div></div>
          <div className="team-item t-4"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80" className="team-img" alt="Team 4" /></div></div>
          <div className="team-item t-5"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80" className="team-img" alt="Team 5" /></div></div>
          <div className="team-item t-6"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" className="team-img" alt="Team 6" /></div></div>
          <div className="team-item t-7"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80" className="team-img" alt="Team 7" /></div></div>
          <div className="team-item t-8"><div className="team-img-wrap"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80" className="team-img" alt="Team 8" /></div></div>
        </div>
      </section>
    </>
  );
}
