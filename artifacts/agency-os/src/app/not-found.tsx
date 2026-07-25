import React from "react";
import "./(marketing)/style.css";

export default function NotFound() {
  return (
    <div className="marketing-root" style={{ background: "#000", minHeight: "100vh" }}>
      {/* NAVIGATION */}
      <nav className="navbar">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <svg viewBox="0 0 60 40" fill="currentColor" style={{ height: "24px", width: "auto" }}>
              <path d="M5 5 L28 20 L5 35 Z" />
              <path d="M31 5 L54 20 L31 35 Z" />
            </svg>
          </a>
          <div className="nav-links">
            <a href="/">Home</a>
            <a href="/services">Services</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </nav>

      {/* 404 HERO */}
      <section className="not-found-section" style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 5vw",
        background: "#000",
        position: "relative"
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .not-found-section::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(61,61,255,0.10) 0%, transparent 70%);
            pointer-events: none;
          }
          .not-found-num {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: clamp(120px, 20vw, 240px);
            font-weight: 900;
            color: #ffffff;
            line-height: 1;
            letter-spacing: -4px;
            margin: 0;
            z-index: 1;
          }
          .not-found-msg {
            font-family: 'Caveat', cursive;
            font-size: 28px;
            color: rgba(255,255,255,0.5);
            margin: 16px 0 40px;
            z-index: 1;
          }
          .not-found-btn {
            display: inline-block;
            background: #3D3DFF;
            color: #ffffff;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            padding: 16px 40px;
            border-radius: 50px;
            text-decoration: none;
            transition: background 0.3s ease, transform 0.2s ease;
            z-index: 1;
          }
          .not-found-btn:hover {
            background: #5555ff;
            transform: translateY(-3px);
          }
        `}} />
        <h1 className="not-found-num">404</h1>
        <p className="not-found-msg">Page not found.</p>
        <a href="/" className="not-found-btn">Take me home</a>
      </section>
    </div>
  );
}
