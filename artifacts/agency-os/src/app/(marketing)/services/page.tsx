import React from "react";

export default function ServicesPage() {
  return (
    <>
      {/* SERVICES HERO */}
      <div className="page-header">
        <h1>SERVICES</h1>
        <p className="page-subtitle">What We Do Best</p>
      </div>

      {/* SERVICE BLOCKS */}
      <section className="services-section">
        <div className="container">
          {/* Web Development */}
          <div className="service-block reveal">
            <div className="service-block-left">
              <div className="service-sub-grid">
                <div className="service-sub-block">
                  <h4>UI Design</h4>
                  <ul className="service-numbered-list">
                    <li>Prototyping</li>
                    <li>Mood Boarding</li>
                    <li>Design Systems</li>
                    <li>Design Accessibility</li>
                    <li>Responsive Design</li>
                  </ul>
                </div>
                <div className="service-sub-block">
                  <h4>UX Design</h4>
                  <ul className="service-numbered-list">
                    <li>User Research</li>
                    <li>UX Audits</li>
                    <li>UX Workshops</li>
                    <li>Information Architecture Revamp</li>
                    <li>Reports &amp; Analytics</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="service-block-right">
              <div className="service-block-header">
                <span className="service-badge">WEB DEV</span>
                <h3 className="service-block-title">WEB<br /><span className="blue-highlight">DEVELOPMENT</span></h3>
              </div>
              <p className="service-block-desc">Clean, intuitive, and conversion-focused interfaces.</p>
            </div>
          </div>

          {/* Social Media Marketing */}
          <div className="service-block reveal">
            <div className="service-block-left">
              <div className="service-block-header">
                <span className="service-badge">SOCIAL</span>
                <h3 className="service-block-title">SOCIAL<br />MEDIA<br /><span className="blue-highlight">MARKETING</span></h3>
              </div>
              <p className="service-block-desc">We help brands grow on social media through strategic content, creative design, and data-driven execution.</p>
            </div>
            <div className="service-block-right">
              <ul className="service-numbered-list">
                <li>Social Media Strategy &amp; Planning</li>
                <li>Content Creation (Posts, Reels, Stories)</li>
                <li>Graphic Design &amp; Video Creatives</li>
                <li>Caption Writing &amp; Hashtag Research</li>
                <li>Page / Account Management</li>
                <li>Community Management (Comments &amp; DMs)</li>
                <li>Paid Social Media Ads (Instagram / Facebook)</li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="services-cta reveal">
            <h3>LET'S WORK <span>TOGETHER</span></h3>
            <p className="cta-subtitle">Ready to bring your vision to life? We'd love to hear from you.</p>
            <a href="/contact" className="cta-btn">
              Get In Touch <span className="arrow">»</span>
            </a>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section section-pad">
        <div className="container">
          <div className="testimonials-header reveal">
            <div className="testimonial-big-word">Testimonial</div>
            <div className="testimonial-pill-overlay">RESULTS-DRIVEN</div>
          </div>

          {/* Floating parallax testimonial stack */}
          <div className="testimonial-stack" id="testimonial-stack">
            <article className="testimonial-card depth-1">
              <div className="testimonial-photo">
                <img src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&q=80" alt="Client portrait" />
              </div>
              <div className="testimonial-body">
                <p className="testimonial-quote">"Blink Beyond completely transformed our online presence. Their strategic approach to digital marketing helped us achieve a 3x increase in qualified leads within just three months."</p>
                <div className="testimonial-meta">
                  <div className="testimonial-name">Rajesh Sharma</div>
                  <div className="testimonial-role">CEO, TechVista Solutions</div>
                </div>
              </div>
            </article>

            <article className="testimonial-card depth-2">
              <div className="testimonial-photo">
                <img src="https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=200&q=80" alt="Client portrait" />
              </div>
              <div className="testimonial-body">
                <p className="testimonial-quote">"From the first strategy call, their team felt like an extension of our own. Our campaigns finally look and perform the way we always imagined."</p>
                <div className="testimonial-meta">
                  <div className="testimonial-name">Ananya Mehta</div>
                  <div className="testimonial-role">Marketing Head, NovaCore Labs</div>
                </div>
              </div>
            </article>

            <article className="testimonial-card depth-3">
              <div className="testimonial-photo">
                <img src="https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=200&q=80" alt="Client portrait" />
              </div>
              <div className="testimonial-body">
                <p className="testimonial-quote">"They rebuilt our website, refined our brand voice, and aligned every channel. The growth we’re seeing is both measurable and sustainable."</p>
                <div className="testimonial-meta">
                  <div className="testimonial-name">Arjun Patel</div>
                  <div className="testimonial-role">Founder, Crestal Studio</div>
                </div>
              </div>
            </article>
          </div>

          {/* See more CTA after a couple of scroll passes */}
          <div className="testimonials-see-more reveal" id="testimonials-see-more">
            <button className="cta-btn cta-btn--ghost" id="testimonials-see-more-btn">
              See More Stories <span className="arrow">»</span>
            </button>
          </div>
        </div>
      </section>

      {/* SERVICES CTA */}
      <section className="services-cta-banner">
        <div className="container">
          <div className="services-cta-label">Ready to grow your brand?</div>
          <h2 className="services-cta-heading">LET'S BUILD <span>SOMETHING GREAT.</span></h2>
          <a href="/contact" className="services-cta-btn">Start a Project →</a>
        </div>
      </section>
    </>
  );
}
