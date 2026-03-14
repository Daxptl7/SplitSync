"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const bgImages = [
  "/friendship-adventure-scaled.jpg",
  "/230725152449-01-group-friend-vacation-tips-top.jpg",
];

export default function LandingPage() {
  const [opacity, setOpacity] = useState(0.3);
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollFactor = Math.min(window.scrollY / 2000, 0.4);
      setOpacity(0.4 + scrollFactor);
    };
    window.addEventListener("scroll", handleScroll);

    const timer = setInterval(() => {
      setCurrentBg((prevBg) => (prevBg + 1) % bgImages.length);
    }, 5000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="home-wrapper bg-surface-bg">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="heroContainer">
        <div
          className="heroSliderTrack"
          style={{ transform: `translateX(-${currentBg * 100}vw)` }}
        >
          {bgImages.map((img, index) => (
            <div
              key={index}
              className="heroSlide"
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
        </div>

        <div
          className="heroContentOverlay"
          style={{ backgroundColor: `rgba(0,0,0, ${opacity})` }}
        >
          <div className="heroContent">
            <h1 className="heroTitle">Smart Expense Splitting</h1>
            <p className="heroSubtitle">
              Our intelligent settlement system provides real-time balance
              tracking, multi-mode splitting, and O(n log n) min-cash-flow
              optimization, helping you settle debts effortlessly and securely.
            </p>
            <div className="hero-buttons flex gap-4 mt-6">
              <Link href="/login?signup=true" className="btn-primary">
                Get Started
              </Link>
              <Link
                href="/login"
                className="btn-secondary !text-white !border-white hover:!bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="hero-bottom-bar">
            {/* Left Info Card */}
            <div className="hero-info-card">
              <div className="hero-info-thumb flex items-center justify-center">
                💸
              </div>
              <div className="hero-info-arrow text-white flex items-center justify-center">
                <i className="ri-arrow-right-up-line" />
              </div>
              <div className="hero-info-text text-left">
                <h4 className="text-white">Frictionless Settlements</h4>
                <p className="text-white/70">
                  AI-powered debt reduction ensures you make the absolute
                  minimum number of transfers to settle the group.
                </p>
              </div>
            </div>

            {/* Right Trust Badge */}
            <div className="hero-trust-badge text-right">
              <p className="trust-label text-white/90">
                Over 10,000 Users Trust SplitRight
              </p>
              <div className="trust-row flex items-center justify-end gap-3 mt-2">
                <div className="trust-avatars flex">
                  <span className="trust-avatar bg-brand-light text-white font-bold text-xs ring-2 ring-white">
                    JD
                  </span>
                  <span className="trust-avatar bg-accent-sky text-white font-bold text-xs ring-2 ring-white">
                    AK
                  </span>
                  <span className="trust-avatar bg-accent-sunset text-white font-bold text-xs ring-2 ring-white">
                    MS
                  </span>
                  <span className="trust-avatar bg-brand-pale text-brand-dark font-bold text-xs ring-2 ring-white">
                    99+
                  </span>
                </div>
                <span className="trust-rating text-white font-extrabold text-2xl">
                  ⭐ 4.9
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OUR FEATURES SECTION ===== */}
      <section className="services-section bg-[#1a1a1a] py-24">
        <div className="services-header text-center mb-16">
          <span className="services-eyebrow text-brand-light tracking-widest text-sm uppercase font-bold">
            Core Engine
          </span>
          <h2 className="services-title text-white text-4xl font-extrabold mt-2">
            Professional Splitting Tools
          </h2>
        </div>

        <div className="services-grid grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto px-6">
          {/* Feature 1 */}
          <div className="service-card text-center">
            <div className="service-img-wrapper w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-[#333] hover:border-brand-light transition-all duration-300 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800"
                alt="Smart Ledgers"
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-white text-xl font-bold mt-6 mb-2">
              Smart Ledgers
            </h4>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Track thousands of expenses across multiple groups with
              append-only immutable logs and full transparency.
            </p>
            <Link href="/login" className="service-read-more">
              Read More →
            </Link>
          </div>

          {/* Feature 2 */}
          <div className="service-card text-center">
            <div className="service-img-wrapper w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-[#333] hover:border-brand-light transition-all duration-300 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1616077168079-7e09a6a7cbbf?auto=format&fit=crop&q=80&w=800"
                alt="Min-Cash Flow"
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-white text-xl font-bold mt-6 mb-2">
              Debt Optimization
            </h4>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Our advanced O(n log n) algorithm reduces a complex web of debts
              into the fewest possible payments among members.
            </p>
            <Link href="/login" className="service-read-more">
              Read More →
            </Link>
          </div>

          {/* Feature 3 */}
          <div className="service-card text-center">
            <div className="service-img-wrapper w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-[#333] hover:border-brand-light transition-all duration-300 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800"
                alt="Instant Settlements"
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-white text-xl font-bold mt-6 mb-2">
              1-Click Settlements
            </h4>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Integrated with Razorpay and UPI deep-links so you can clear your
              dues instantly without leaving the platform.
            </p>
            <Link href="/login" className="service-read-more">
              Read More →
            </Link>
          </div>
        </div>

        <div className="services-dots flex justify-center gap-2 mt-12">
          <span className="dot active w-6 h-2 bg-brand-dark rounded-full" />
          <span className="dot w-2 h-2 bg-zinc-600 rounded-full" />
          <span className="dot w-2 h-2 bg-zinc-600 rounded-full" />
        </div>
      </section>

      {/* ===== ABOUT / WELCOME SECTION ===== */}
      <section className="about-section bg-white py-24 px-6 relative z-10">
        <div className="about-content max-w-6xl mx-auto flex flex-col md:flex-row gap-16 items-center">
          <div className="about-text flex-1">
            <span className="about-eyebrow text-brand-dark font-bold uppercase tracking-widest text-sm border-b-2 border-brand-light mb-4 inline-block pb-1">
              Welcome To SplitRight
            </span>
            <h2 className="about-title text-4xl font-extrabold text-gray-900 leading-tight mb-6">
              We eliminate the awkward money conversations.
            </h2>
            <p className="about-desc text-gray-600 mb-8 leading-relaxed">
              Our smart expense platform handles the math, the reminders, and
              the tracking. Whether it's a weekend getaway, shared apartment
              bills, or a dinner out, SplitRight ensures everyone pays their
              exact fair share. AES-256 encrypted and built for scale.
            </p>

            <div className="about-highlights flex flex-col sm:flex-row gap-4 mb-10">
              <div className="about-highlight-item bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <i className="ri-shield-keyhole-line text-brand-dark text-xl" />
                <span className="font-semibold text-gray-800 text-sm">
                  AES Encrypted
                </span>
              </div>
              <div className="about-highlight-item bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <i className="ri-pie-chart-line text-brand-dark text-xl" />
                <span className="font-semibold text-gray-800 text-sm">
                  5 Split Modes
                </span>
              </div>
              <div className="about-highlight-item bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <i className="ri-flash-light text-brand-dark text-xl" />
                <span className="font-semibold text-gray-800 text-sm">
                  Min Cash Flow
                </span>
              </div>
            </div>

            <Link
              href="/login?signup=true"
              className="about-cta btn-primary shadow-lg shadow-brand-dark/30"
            >
              Get Started Now
            </Link>
          </div>

          <div className="about-image-wrapper flex-1 relative">
            <img
              src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1200"
              alt="Friends checking expenses"
              className="about-image rounded-2xl border-4 border-brand-50 shadow-2xl w-full"
            />
            <div className="about-badge absolute -bottom-6 -left-6 bg-accent-golden text-white p-5 rounded-2xl shadow-xl border-4 border-white text-center">
              <div className="badge-icon text-3xl mb-1">🏦</div>
              <div className="badge-year text-3xl font-black text-gray-900">
                2026
              </div>
              <div className="badge-text text-[10px] font-bold uppercase tracking-wide text-gray-800">
                #1 Finance
                <br />
                Splitting Tool
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOGO CLOUD SECTION ===== */}
      <section className="logo-cloud-section bg-surface-50 py-20 text-center overflow-hidden">
        <h2 className="logo-cloud-title text-3xl font-extrabold text-gray-900 mb-2">
          Powered By Modern Tech
        </h2>
        <p className="logo-cloud-subtitle text-gray-500 mb-12 max-w-2xl mx-auto">
          Built on a robust stack ensuring speed, security, and reliability for
          all your transactions.
        </p>

        <div className="logo-scroll-container w-full relative">
          <div className="logo-scroll-track flex gap-20 items-center justify-center">
            <div className="logo-item text-4xl font-extrabold text-gray-400 flex items-center opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all">
              <i className="ri-reactjs-line mr-2" />
              Next.js
            </div>
            <div className="logo-item text-4xl font-extrabold text-gray-400 flex items-center opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all">
              <i className="ri-fire-line mr-2" />
              Firebase
            </div>
            <div className="logo-item text-4xl font-extrabold text-gray-400 flex items-center opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all">
              <i className="ri-database-2-line mr-2" />
              Postgres
            </div>
            <div className="logo-item text-4xl font-extrabold text-gray-400 flex items-center opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all">
              <i className="ri-bank-card-line mr-2" />
              Razorpay
            </div>
            <div className="logo-item text-4xl font-extrabold text-gray-400 flex items-center opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all">
              <i className="ri-edge-new-line mr-2" />
              Django
            </div>
          </div>
        </div>
      </section>

      {/* ===== REVIEWS SECTION ===== */}
      <section className="reviews-section bg-zinc-50 py-24">
        <div className="reviews-header text-center mb-16">
          <span className="about-eyebrow text-brand-dark font-bold uppercase tracking-widest text-sm border-b-2 border-brand-light mb-4 inline-block pb-1">
            What Our Users Say
          </span>
          <h2 className="about-title text-4xl font-extrabold text-gray-900 mt-2">
            Trusted By Friends Everywhere
          </h2>
        </div>

        <div className="reviews-grid max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Column 1 */}
          <div className="reviews-column flex flex-col gap-8">
            <div className="review-card bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col">
              <p className="review-text text-gray-600 leading-relaxed flex-1 mb-6">
                &quot;SplitRight is revolutionary. Tracking expenses for our Goa
                trip used to be a nightmare of Excel sheets. With the Debt
                Optimization engine, we settled 45 transactions with just 4
                payments. Highly recommend getting on board.&quot;
              </p>
              <div className="review-author flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-xl">
                  🚀
                </div>
                <div className="author-info flex-1 text-left">
                  <h4 className="font-bold text-gray-900 text-sm m-0">
                    Rahul Sharma
                  </h4>
                  <p className="text-xs text-gray-500 font-medium m-0">
                    Frequent Traveler
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="reviews-column flex flex-col gap-8">
            <div className="review-card bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="review-text text-gray-600 leading-relaxed mb-6">
                &quot;Living with 3 roommates means splitting everything from
                rent to midnight snacks. The 5 split modes handle every scenario
                perfectly.&quot;
              </p>
              <div className="review-author flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-xl bg-accent-sky/10 flex items-center justify-center text-xl">
                  👩‍💻
                </div>
                <div className="author-info flex-1 text-left">
                  <h4 className="font-bold text-gray-900 text-sm m-0">
                    Priya Patel
                  </h4>
                  <p className="text-xs text-gray-500 font-medium m-0">
                    Software Engineer
                  </p>
                </div>
              </div>
            </div>
            <div className="review-card bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="review-text text-gray-600 leading-relaxed">
                &quot;The instant Razorpay and UPI deep-linking integration is
                incredible. Settling up is literally a one-click process
                now.&quot;
              </p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="reviews-column flex flex-col gap-8">
            <div className="review-card bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="review-text text-gray-600 leading-relaxed mb-6">
                &quot;As an admin for college events, the ability to generate
                PDF reports and CSV logs gives us transparency for our
                treasury.&quot;
              </p>
              <div className="review-author flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-xl bg-accent-golden/10 flex items-center justify-center text-xl">
                  🎓
                </div>
                <div className="author-info flex-1 text-left">
                  <h4 className="font-bold text-gray-900 text-sm m-0">
                    Karan Singh
                  </h4>
                  <p className="text-xs text-gray-500 font-medium m-0">
                    University Treasurer
                  </p>
                </div>
              </div>
            </div>
            <div className="review-card image-card h-48 rounded-3xl overflow-hidden shadow-lg border-2 border-white">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800"
                alt="Friends"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
