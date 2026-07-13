"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing-redesign.module.css";

const slides = ["setups", "risk"];

function SetupSlide() {
  return (
    <div className={styles.planSlide}>
      <div className={styles.planSlideHead}>
        <div><strong>Setups</strong><small>Only trade what made the plan.</small></div>
        <span>3 OF 5</span>
      </div>

      <div className={styles.playbookPills} aria-label="Selected playbook setups">
        <span>Peak and Fail</span><span>Break and Retest</span><span>LVN continuation</span><span>VWAP in trend</span><span>+ Custom</span>
      </div>

      <section className={styles.setupCard}>
        <h4>Peak and Fail (PAF) of ONL</h4>
        <div className={styles.criteriaBox}>
          <span>ENTRY CRITERIA &amp; INVALIDATION</span>
          <p><b>Criteria:</b> Price unable to find seller interest / acceptance below overnight low.</p>
          <p><b>Invalidation:</b> Strong close back above ONL.</p>
        </div>
        <div className={styles.setupTargets}>
          <div><span>TARGET</span><strong>VWAP</strong></div>
          <div><span>STOP PLACEMENT</span><strong>Beyond swing low</strong></div>
        </div>
      </section>
    </div>
  );
}

function RiskSlide() {
  return (
    <div className={styles.planSlide}>
      <div className={styles.planSlideHead}>
        <div><strong>Risk plan</strong><small>Size, loss limit, and stop rules for today.</small></div>
        <span>4 OF 5</span>
      </div>

      <div className={styles.riskHighlights}>
        <div><span>DAILY LOSS LIMIT</span><strong>$750</strong><small>Full-size session limit</small></div>
        <div><span>SIZE PER TRADE</span><strong>$240</strong><small>Standard risk unit</small></div>
      </div>

      <div className={styles.riskFields}>
        <div><span>DRAWDOWN FROM PEAK</span><strong>10%</strong></div>
        <div><span>EXPECTED VOLATILITY</span><strong>Normal</strong></div>
        <div><span>TRADE CAP</span><strong>3 trade ideas</strong></div>
        <div><span>WHEN YOU STOP</span><strong>11:30am or mental capital spent</strong></div>
      </div>

      <div className={styles.riskRail}>
        <div><span>RISK RAIL</span><small>Confirmed before the session.</small></div>
        <strong><i>✓</i> Max DLL set in broker</strong>
      </div>
    </div>
  );
}

export default function SessionPlanCarousel() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const carousel = useRef(null);
  const touchStart = useRef(null);
  const slide = slides[active];

  useEffect(() => {
    const node = carousel.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.55 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || paused) return undefined;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [active, inView, paused]);

  function move(direction) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  function finishSwipe(event) {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 44) move(distance < 0 ? 1 : -1);
    touchStart.current = null;
  }

  return (
    <div
      ref={carousel}
      className={`${styles.productWindow} ${styles.planWindow}`}
      aria-label="Session Plan product preview carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onTouchStart={(event) => { setPaused(true); touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => { finishSwipe(event); setPaused(false); }}
    >
      <div className={styles.windowBar}><i /><i /><i /><span>Monday, July 13</span></div>
      <div className={`${styles.mockBody} ${styles.planCarouselBody}`}>
        <div className={styles.planCarouselHead}>
          <div>
            <p className={styles.mockLabel}>SESSION PLAN</p>
            <h3>Lock in the plan.</h3>
            <p className={styles.mockIntro}>Bias, setups, and risk before the open.</p>
          </div>
          <div className={styles.planSummary} aria-label="Plan completion summary">
            <span>CHART <b>3/3</b></span><span>RAILS <b>2/2</b></span><span>RULES <b>2/2</b></span>
          </div>
        </div>

        <div className={styles.planTabs} aria-label="Session plan steps">
          <span className={styles.planTabComplete}>Bias</span>
          <span className={styles.planTabComplete}>Levels</span>
          <button type="button" className={slide === "setups" ? styles.planTabActive : ""} onClick={() => setActive(0)} aria-pressed={slide === "setups"}>Setups</button>
          <button type="button" className={slide === "risk" ? styles.planTabActive : ""} onClick={() => setActive(1)} aria-pressed={slide === "risk"}>Risk</button>
          <span>Focus</span>
        </div>

        <div className={styles.planViewport} aria-live="polite">
          {slide === "setups" ? <SetupSlide /> : <RiskSlide />}
        </div>

        <div className={styles.carouselControls}>
          <button type="button" onClick={() => move(-1)} aria-label="Previous session plan preview">←</button>
          <div className={styles.carouselStatus}>
            <span>{slide === "setups" ? "SETUPS" : "RISK"} <b>{active + 1} OF {slides.length}</b></span>
            <i key={active} className={inView && !paused ? styles.carouselProgressActive : ""}><em /></i>
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Next session plan preview">→</button>
        </div>
      </div>
    </div>
  );
}
