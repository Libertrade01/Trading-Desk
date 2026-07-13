"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing-redesign.module.css";

const slides = ["performance", "journal"];

function PerformanceSlide() {
  return (
    <div className={styles.closeLoopSlide}>
      <div className={styles.closeSlideHead}>
        <div><strong>Performance</strong><small>The numbers from the session.</small></div>
        <span>1 OF 5</span>
      </div>
      <div className={styles.closePerformance}>
        <div className={styles.closePerformanceLead}>
          <span>SESSION STATS</span><strong>5 trades</strong><small>3 wins · 2 losses · 60% win rate</small>
        </div>
        <div><span>GROSS P&amp;L</span><strong>+$1,335</strong></div>
        <div><span>COMMISSIONS</span><strong>−$25</strong></div>
        <div><span>BEST WINNER</span><strong className={styles.closePositive}>+$720</strong></div>
        <div><span>WORST LOSS</span><strong className={styles.closeNegative}>−$240</strong></div>
      </div>
      <div className={styles.closePerformanceFoot}>
        <div><span>AVG WINNER</span><strong>+$600</strong><small>2.5R</small></div>
        <div><span>AVG LOSS</span><strong>−$233</strong><small>−0.97R</small></div>
        <div><span>PROFIT FACTOR</span><strong>3.86</strong><small>Session edge</small></div>
      </div>
    </div>
  );
}

function JournalSlide() {
  const prompts = [
    ["PLAN VS REALITY", "Planned to fade a failed break of ONL back to VWAP. First entry was early; second waited for confirmation and followed the playbook."],
    ["WHAT I DID WELL", "Kept size fixed and let the best trade reach 3R."],
    ["WHAT I CAN IMPROVE", "No entry before acceptance confirms."],
    ["ONE LESSON", "No confirmation, no trade. Let the A+ setup pay for the session."],
  ];

  return (
    <div className={styles.closeLoopSlide}>
      <div className={styles.closeSlideHead}>
        <div><strong>Journal</strong><small>Turn the session into one clear lesson.</small></div>
        <span>5 OF 5</span>
      </div>
      <div className={styles.closeJournalGrid}>
        {prompts.map(([label, text]) => (
          <section key={label}><span>{label}</span><p>{text}</p></section>
        ))}
      </div>
      <div className={styles.closeHabits}>
        <span>CLOSE-OUT HABITS</span>
        <div><strong><i>✓</i> A+ setup screenshots saved</strong><b>Complete</b></div>
        <div><strong><i>✓</i> One trade sequence reviewed in REPLAY</strong><b>Complete</b></div>
      </div>
    </div>
  );
}

export default function CloseLoopCarousel() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const carousel = useRef(null);
  const slide = slides[active];

  useEffect(() => {
    const node = carousel.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.55 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || paused) return undefined;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), 3200);
    return () => window.clearTimeout(timer);
  }, [active, inView, paused]);

  function move(direction) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  return (
    <div
      ref={carousel}
      className={`${styles.productWindow} ${styles.closeLoopWindow}`}
      aria-label="Close the LOOP product preview carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className={styles.windowBar}><i /><i /><i /><span>Monday, July 13</span></div>
      <div className={`${styles.mockBody} ${styles.closeLoopBody}`}>
        <div className={styles.closeLoopHead}>
          <div><p className={styles.mockLabel}>CLOSE THE LOOP</p><h3>Reality versus plan.</h3><p className={styles.mockIntro}>Review the outcome, own the process, carry one lesson forward.</p></div>
          <div className={styles.closeLoopResult}><span>NET P&amp;L</span><strong>+$1,310</strong><small>+5.5R</small></div>
        </div>

        <div className={styles.closeImport}><span>SESSION IMPORT <b>RTRADER</b></span><strong><i>✓</i> CSV uploaded</strong></div>

        <div className={styles.closeLoopSteps} aria-label="Close the LOOP steps">
          <button type="button" className={slide === "performance" ? styles.closeLoopStepActive : ""} onClick={() => setActive(0)}>PERFORMANCE</button>
          <span>PROCESS</span><span>ACCOUNTABILITY</span><span>CLOSE</span>
          <button type="button" className={slide === "journal" ? styles.closeLoopStepActive : ""} onClick={() => setActive(1)}>JOURNAL</button>
        </div>

        <div className={styles.closeLoopViewport} aria-live="polite">
          {slide === "performance" ? <PerformanceSlide /> : <JournalSlide />}
        </div>

        <div className={styles.carouselControls}>
          <button type="button" onClick={() => move(-1)} aria-label="Previous Close the LOOP preview">←</button>
          <div className={styles.carouselStatus}>
            <span>{slide === "performance" ? "PERFORMANCE" : "JOURNAL"} <b>{active + 1} OF {slides.length}</b></span>
            <i key={active} className={inView && !paused ? styles.carouselProgressActive : ""}><em /></i>
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Next Close the LOOP preview">→</button>
        </div>
      </div>
    </div>
  );
}
