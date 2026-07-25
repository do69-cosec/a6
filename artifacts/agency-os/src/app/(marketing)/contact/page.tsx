"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function ContactFormContent() {
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (searchParams && searchParams.get("success") === "true") {
      setSuccess(true);
    }
  }, [searchParams]);

  return (
    <div className="contact-card reveal reveal-delay-2">
      <h3>Tell us about your project</h3>
      {success && (
        <div 
          id="formSuccessMessage" 
          style={{ 
            padding: "15px", 
            marginBottom: "20px", 
            backgroundColor: "rgba(37, 211, 102, 0.1)", 
            color: "#25D366", 
            border: "1px solid #25D366", 
            borderRadius: "5px" 
          }}
        >
          Thank you! Your message has been sent successfully. We will get back to you shortly.
        </div>
      )}
      <form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
        <input type="hidden" name="_next" value="https://blinkbeyond.co.in/contact.html?success=true" />
        <input type="hidden" name="_subject" value="New inquiry from Blink Beyond website" />
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input type="text" id="fullName" name="fullName" placeholder="John Doe" required />
        </div>
        <div className="form-group">
          <label htmlFor="businessName">Business Name</label>
          <input type="text" id="businessName" name="businessName" placeholder="Your Company" />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email ID</label>
          <input type="email" id="email" name="email" placeholder="you@company.com" required />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Contact No.</label>
          <input type="tel" id="phone" name="phone" placeholder="+91 00000 00000" />
        </div>
        <div className="form-group">
          <label>What are you looking for?</label>
          <div className="checkbox-group">
            <label><input type="checkbox" name="service" value="website" /> Website</label>
            <label><input type="checkbox" name="service" value="branding" /> Branding</label>
            <label><input type="checkbox" name="service" value="ads" /> Ads / Growth</label>
            <label><input type="checkbox" name="service" value="unsure" /> Not sure yet</label>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="message">Have a question or idea?</label>
          <textarea id="message" name="message" placeholder="Tell us about your project..."></textarea>
        </div>
        <button type="submit" className="submit-btn">SEND</button>
      </form>
    </div>
  );
}

export default function ContactPage() {
  return (
    <section className="contact-section">
      <div className="container">
        <div className="contact-grid">
          {/* Left side */}
          <div className="contact-left reveal">
            <h2>
              LET'S WORK<br />
              <span className="blue">TOGETHER</span>
            </h2>
            <p className="contact-tagline">RESULTS · GROWTH · CLARITY</p>
          </div>
          {/* Right side — Form */}
          <Suspense fallback={<div className="contact-card">Loading Form...</div>}>
            <ContactFormContent />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
