import React from "react";

export default function AboutPage() {
  return (
    <>
      {/* WHO WE ARE */}
      <section className="who-section section-pad" style={{ paddingTop: "calc(var(--nav-height) + 80px)" }}>
        <div className="container">
          <div className="who-grid">
            <div className="who-left-text reveal">
              WHERE <span className="blue">STRATEGY,</span><br />
              <span className="blue">DESIGN,</span> <span className="lower">and</span><br />
              <span className="blue">GROWTH</span><br />
              <span className="lower">come</span><br />together.
            </div>
            <div className="who-right reveal reveal-delay-2">
              <div className="who-orbit-container">
                {/* Orbit path (SVG circle) */}
                <svg className="who-orbit-path" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50%" cy="50%" r="175" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                </svg>
                {/* Orbiting words */}
                <div className="who-orbit-item" style={{ "--duration": "30", "--radius": "175", "--delay": "0" } as React.CSSProperties}>WHO</div>
                <div className="who-orbit-item" style={{ "--duration": "30", "--radius": "175", "--delay": "-10" } as React.CSSProperties}>WE</div>
                <div className="who-orbit-item" style={{ "--duration": "30", "--radius": "175", "--delay": "-20" } as React.CSSProperties}>ARE?</div>
                {/* Inner paragraph */}
                <div className="who-inner-text">
                  <p>We are a results-driven digital marketing agency focused on building brands that stand out and grow. Our team blends strategy, design, and marketing to turn ideas into measurable business outcomes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="whatwedo-section">
        <div className="container whatwedo-inner">
          <div className="whatwedo-label reveal">WHAT WE DO ?</div>
          <div className="whatwedo-display reveal">
            {/* Decorative ovals */}
            <div className="deco-oval deco-oval-1"></div>
            <div className="deco-oval deco-oval-2"></div>
            <div className="deco-oval deco-oval-3"></div>
            <h2>
              <span className="we-line">we</span>
              <span className="turn-line">TURN</span>
              <span className="attention-line">ATTENTION</span>
              <span className="into-line">INTO</span>
              <span className="growth-line">GROWTH.</span>
            </h2>
          </div>
          <div className="whatwedo-body reveal reveal-delay-2">
            We work as a collaborative team to understand your brand and goals. Together, we design smart strategies, clean visuals, and high-performing digital systems. Our teamwork turns ideas into measurable growth and real results.
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="howwework-section section-pad">
        <div className="container">
          <div className="howwework-grid">
            <div className="howwework-left reveal">
              <div className="howwework-title">HOW WE<br />WORK?</div>
            </div>
            <div className="howwework-steps reveal reveal-delay-2">
              <div className="step-item">
                <span className="step-num">01</span>
                <div className="step-content">
                  <h4>Discovery</h4>
                  <p>understanding your goals and target audience.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-num">02</span>
                <div className="step-content">
                  <h4>Strategy</h4>
                  <p>creating a roadmap for success.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-num">03</span>
                <div className="step-content">
                  <h4>Design</h4>
                  <p>Crafting beautiful, functional interfaces.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-num">04</span>
                <div className="step-content">
                  <h4>Development</h4>
                  <p>Building with modern technologies.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-num">05</span>
                <div className="step-content">
                  <h4>Launch</h4>
                  <p>Developing and monitoring performance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDERS */}
      <section className="team-section section-pad">
        <div className="container">
          <h2 className="team-section-title reveal">Founders</h2>
          <div className="team-grid">
            {/* Founder 1 */}
            <div className="team-card reveal">
              <div className="card-base-layer" style={{ width: "100%" }}>
                <div className="team-avatar" style={{ backgroundImage: "url('/assets/images/nilesh-rajput.jpg')", backgroundSize: "cover", backgroundPosition: "center", borderRadius: "50%" }}>
                  <img src="/assets/images/nilesh-rajput.jpg" alt="Nilesh Rajput" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0 }} />
                </div>
                <div className="team-info">
                  <h3>Nilesh Rajput <span>· AI/ML Engineer</span></h3>
                  <div className="about-label">About</div>
                  <p>AI/ML Engineer overseeing all technical operations and architecture, including website and application development across departments.</p>
                  <p style={{ marginTop: "8px" }}>Bringing dynamic expertise with 4 years of experience in the stock market, a background in tutoring, and a proven track record of successfully delivering over 50+ technical projects.</p>
                </div>
              </div>
            </div>
            {/* Founder 2 */}
            <div className="team-card right reveal reveal-delay-2">
              <div className="card-base-layer" style={{ width: "100%" }}>
                <div className="team-avatar" style={{ background: "#3D3DFF", color: "#fff", fontSize: "24px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed',sans-serif" }}>G</div>
                <div className="team-info">
                  <h3>Gaurav <span>· Strategy &amp; Research</span></h3>
                  <div className="about-label">About</div>
                  <p>Scripting, asset research &amp; brand strategy. Builds the thinking behind the work.</p>
                  <p style={{ marginTop: "8px" }}>A storyteller at heart, Gaurav shapes how Blink Beyond speaks — from the first touchpoint to the final campaign asset.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
