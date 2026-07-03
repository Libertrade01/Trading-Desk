"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  CheckInPreview,
  CloseLoopPreview,
  SessionPlanPreview,
} from "./LandingWorkflowPreviews";

const SLIDES = [
  {
    id: "check-in",
    step: "01",
    title: "Check-in",
    body: "Score readiness, note context, and set intent before the open.",
    image: "/landing/check-in.png",
    imageAlt: "Libertrade Loop check-in screen",
    Preview: CheckInPreview,
  },
  {
    id: "session-plan",
    step: "02",
    title: "Session plan",
    body: "Define levels, setups, and risk before you click buy or sell.",
    image: "/landing/session-plan.png",
    imageAlt: "Libertrade Loop session plan screen",
    Preview: SessionPlanPreview,
  },
  {
    id: "close-loop",
    step: "03",
    title: "Close loop",
    body: "Review execution, adherence, and lessons while the session is fresh.",
    image: "/landing/close-loop.png",
    imageAlt: "Libertrade Loop close loop screen",
    Preview: CloseLoopPreview,
  },
];

function SlideViewport({ slide, useImage }) {
  const { Preview, image, imageAlt, title } = slide;

  return (
    <div className="landing-carousel-viewport">
      <div className="landing-carousel-browser-chrome" aria-hidden="true">
        <span className="landing-carousel-browser-dot" />
        <span className="landing-carousel-browser-dot" />
        <span className="landing-carousel-browser-dot" />
      </div>
      <div className="landing-carousel-screen">
        {useImage ? (
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="landing-carousel-image"
            sizes="(max-width: 900px) 100vw, 920px"
            priority={slide.id === "check-in"}
          />
        ) : (
          <div className="landing-carousel-preview-wrap">
            <Preview />
          </div>
        )}
      </div>
      <p className="landing-carousel-screen-label">{title}</p>
    </div>
  );
}

export default function LandingWorkflowCarousel() {
  const [index, setIndex] = useState(0);
  const [imageAvailable, setImageAvailable] = useState({});
  const slide = SLIDES[index];
  const count = SLIDES.length;

  useEffect(() => {
    let cancelled = false;

    async function probeImages() {
      const entries = await Promise.all(
        SLIDES.map(
          (item) =>
            new Promise((resolve) => {
              const img = new window.Image();
              img.onload = () => resolve([item.id, true]);
              img.onerror = () => resolve([item.id, false]);
              img.src = item.image;
            })
        )
      );
      if (!cancelled) {
        setImageAvailable(Object.fromEntries(entries));
      }
    }

    probeImages();
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback((nextIndex) => {
    setIndex((nextIndex + count) % count);
  }, [count]);

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  return (
    <div className="landing-carousel">
      <div className="landing-carousel-tabs" role="tablist" aria-label="Workflow screens">
        {SLIDES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`landing-carousel-tab-${item.id}`}
            aria-selected={i === index}
            aria-controls={`landing-carousel-panel-${item.id}`}
            className={`landing-carousel-tab${i === index ? " landing-carousel-tab--active" : ""}`}
            onClick={() => goTo(i)}
          >
            <span className="landing-carousel-tab-step">{item.step}</span>
            {item.title}
          </button>
        ))}
      </div>

      <div
        className="landing-carousel-stage landing-glass-card"
        role="tabpanel"
        id={`landing-carousel-panel-${slide.id}`}
        aria-labelledby={`landing-carousel-tab-${slide.id}`}
      >
        <button
          type="button"
          className="landing-carousel-arrow landing-carousel-arrow--prev"
          onClick={goPrev}
          aria-label="Previous screen"
        >
          ‹
        </button>

        <SlideViewport slide={slide} useImage={Boolean(imageAvailable[slide.id])} />

        <button
          type="button"
          className="landing-carousel-arrow landing-carousel-arrow--next"
          onClick={goNext}
          aria-label="Next screen"
        >
          ›
        </button>
      </div>

      <div className="landing-carousel-copy">
        <p className="landing-carousel-step">{slide.step}</p>
        <h3 className="landing-card-title">{slide.title}</h3>
        <p className="landing-card-body">{slide.body}</p>
      </div>

      <div className="landing-carousel-dots" aria-label="Carousel pagination">
        {SLIDES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`landing-carousel-dot${i === index ? " landing-carousel-dot--active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Show ${item.title}`}
            aria-current={i === index ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
