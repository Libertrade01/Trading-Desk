export default function LandingBrandWordmark({ className = "", size = "default" }) {
  return (
    <div
      className={`landing-brand-wordmark landing-brand-wordmark--${size}${className ? ` ${className}` : ""}`}
      aria-label="Libertrade Loop"
    >
      <div className="landing-brand-wordmark-primary">Libertrade</div>
      <div className="landing-brand-wordmark-loop">Loop</div>
    </div>
  );
}
