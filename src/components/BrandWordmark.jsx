export default function BrandWordmark({ className = "", size = "default" }) {
  return (
    <div
      className={`brand-wordmark brand-wordmark--${size}${className ? ` ${className}` : ""}`}
      aria-label="Libertrade Loop"
    >
      <div className="brand-wordmark-line">
        <span className="brand-wordmark-liber">Liber</span>
        <span className="brand-wordmark-trade">trade</span>
      </div>
      <div className="brand-wordmark-loop">Loop</div>
    </div>
  );
}
