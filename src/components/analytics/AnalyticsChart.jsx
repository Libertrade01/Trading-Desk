"use client";

import { useEffect, useRef } from "react";

export default function AnalyticsChart({ config, height = 160 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (cancelled || !canvasRef.current) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(canvasRef.current, config);
    })();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return (
    <div className="analytics-chart-wrap" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
