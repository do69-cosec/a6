import React from "react";
import Script from "next/script";
import { auth } from "@/lib/auth";
import "./style.css";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="marketing-root">
      {/* Page Loader — Premium Branded Splash */}
      <div className="page-loader" id="page-loader">
        <div className="loader-bg-glow"></div>
        <div className="loader-center">
          <div className="loader-wordmark-wrap">
            <span className="loader-logo-icon" style={{ color: "var(--blue)", display: "block", margin: "0 auto 15px" }}>
              <svg viewBox="0 0 60 40" fill="currentColor" style={{ height: "48px", width: "auto" }}>
                <path d="M5 5 L28 20 L5 35 Z" />
                <path d="M31 5 L54 20 L31 35 Z" />
              </svg>
            </span>
          </div>
          <p className="loader-tagline">Where Brands Blink &amp; Boom</p>
        </div>
        <div className="loader-bottom">
          <div className="loader-counter"><span id="loader-percent">0</span>%</div>
          <div className="loader-bar-track">
            <div className="loader-bar-fill" id="loader-bar-fill"></div>
          </div>
          <div className="loader-loading-text">[Loading...]</div>
        </div>
      </div>

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
            {session ? (
              <a href="/dashboard" className="nav-cta">Dashboard</a>
            ) : (
              <a href="/login" className="nav-cta">Login</a>
            )}
          </div>
          <button className="hamburger" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="marketing-main">{children}</main>

      {/* FOOTER */}
      <footer className="footer" id="site-footer">
        <div className="lamp" id="footer-lamp">
          <div className="lamp__glow"></div>
          <div className="lamp__line"></div>
        </div>

        <div className="footer-content">
          <div className="container">
            <div className="footer-top">
              <div className="footer-col footer-about">
                <div className="footer-logo">BLINK <span>BEYOND</span></div>
                <p className="footer-tagline">Where brands blink and boom. We craft digital experiences that drive real growth.</p>
                <div className="footer-social-links">
                  <a href="https://instagram.com/blinkbeyond" target="_blank" rel="noopener" aria-label="Instagram" className="social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                    </svg>
                  </a>
                  <a href="https://linkedin.com/company/blinkbeyond" target="_blank" rel="noopener" aria-label="LinkedIn" className="social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                      <rect x="2" y="9" width="4" height="12"/>
                      <circle cx="4" cy="4" r="2"/>
                    </svg>
                  </a>
                  <a href="https://facebook.com/blinkbeyond" target="_blank" rel="noopener" aria-label="Facebook" className="social-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                  </a>
                </div>
              </div>
              <div className="footer-col footer-links-col">
                <h4 className="footer-col-title">Quick Links</h4>
                <a href="/">Home</a>
                <a href="/services">Services</a>
                <a href="/about">About Us</a>
                <a href="/contact">Contact</a>
              </div>
              <div className="footer-col footer-services-col">
                <h4 className="footer-col-title">Services</h4>
                <a href="/services">Web Development</a>
                <a href="/services">Social Media Marketing</a>
                <a href="/services">Performance Marketing</a>
                <a href="/services">UI/UX Design</a>
              </div>
              <div className="footer-col footer-contact-col">
                <h4 className="footer-col-title">Get In Touch</h4>
                <p><span className="footer-contact-label">Address</span>Palghar - 401404,<br/>Mumbai-Maharashtra.</p>
                <p><span className="footer-contact-label">Phone</span><a href="tel:+919545556009">+91 95455 56009</a></p>
                <p><span className="footer-contact-label">Email</span><a href="mailto:support@blinkbeyond.co.in">support@blinkbeyond.co.in</a></p>
              </div>
            </div>
          </div>
          <div className="footer-brand-wrap" id="footer-brand-wrap">
            <canvas id="footer-brand-canvas"></canvas>
            <span className="footer-brand-text">BLINK BEYOND</span>
          </div>
          <div className="footer-bottom">
            <div className="container footer-bottom-inner">
              <p>© 2026 Blink Beyond. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Action Buttons: AI Agent & WhatsApp */}
      <div className="fab-container">
        <div className="fab-options">
          {/* WhatsApp Option */}
          <a href="https://wa.me/919545556009" target="_blank" rel="noopener" className="fab-option whatsapp-btn" aria-label="Chat on WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
          {/* AI Agent Option */}
          <button id="ai-agent-btn" className="fab-option state-idle ai-btn" aria-label="Talk to AI Agent" title="Talk to Blink Beyond AI">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
        </div>
        {/* Main Toggle Button */}
        <button className="fab-toggle" aria-label="Open Actions">
          <svg className="icon-chat" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8"/>
            <rect width="16" height="12" x="4" y="8" rx="2"/>
            <path d="M2 14h2"/>
            <path d="M20 14h2"/>
            <path d="M15 13v2"/>
            <path d="M9 13v2"/>
          </svg>
          <svg className="icon-close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* SCRIPTS */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Draggable.min.js" strategy="afterInteractive" />
      <Script src="/js/main.js" strategy="lazyOnload" />
      <Script src="/js/agent.js" strategy="lazyOnload" />
    </div>
  );
}
