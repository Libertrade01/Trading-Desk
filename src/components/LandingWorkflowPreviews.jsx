export function CheckInPreview() {
  return (
    <div className="landing-slide-preview-page premarket-page hybrid-page workflow-page--loop">
      <div className="home-page-glow" aria-hidden="true" />
      <div className="workflow-page-inner">
        <div className="pm-topbar">
          <span>Wednesday, July 3, 2026</span>
        </div>
        <div className="pm-checkin-layout pm-checkin-layout--loop">
          <div className="pm-checkin-intro">
            <header className="pm-checkin-header">
              <h2 className="hybrid-page-title">Check-in.</h2>
              <p className="pm-subtitle">Be honest before the open. Your score updates as you go.</p>
            </header>
            <div className="landing-slide-mock-stepper" aria-hidden="true">
              <span className="landing-slide-mock-step landing-slide-mock-step--active">Physical</span>
              <span className="landing-slide-mock-step">Mental</span>
              <span className="landing-slide-mock-step">Context</span>
              <span className="landing-slide-mock-step">Desk</span>
            </div>
          </div>
          <div className="pm-checkin-stage">
            <div className="pm-section-panel checkin-section-panel">
              <div className="pm-section-panel-head checkin-section-panel-head">
                <div>
                  <h3 className="pm-section-title hybrid-section-title">Physical state</h3>
                  <p className="pm-section-desc">Sleep, energy, and how your body feels going into the session.</p>
                </div>
              </div>
              <div className="pm-section-panel-body">
                <div className="pm-field">
                  <div className="pm-field-top">
                    <div className="pm-field-label hybrid-label">Energy</div>
                    <div className="pm-field-value" style={{ color: "var(--green)" }}>
                      8
                    </div>
                  </div>
                  <div className="landing-slide-mock-slider" aria-hidden="true">
                    <span className="landing-slide-mock-slider-fill" style={{ width: "78%" }} />
                  </div>
                </div>
                <div className="pm-field">
                  <div className="pm-field-top">
                    <div className="pm-field-label hybrid-label">Focus</div>
                    <div className="pm-field-value" style={{ color: "var(--brand)" }}>
                      7
                    </div>
                  </div>
                  <div className="landing-slide-mock-slider" aria-hidden="true">
                    <span className="landing-slide-mock-slider-fill" style={{ width: "67%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SessionPlanPreview() {
  return (
    <div className="landing-slide-preview-page premarket-page hybrid-page workflow-page--loop">
      <div className="home-page-glow" aria-hidden="true" />
      <div className="workflow-page-inner">
        <div className="pm-topbar">
          <span>Wednesday, July 3, 2026</span>
        </div>
        <div className="daily-plan-content">
          <header className="pm-checkin-header">
            <h2 className="hybrid-page-title">Session plan.</h2>
            <p className="pm-subtitle">Define bias, levels, setups, and risk before you trade.</p>
          </header>
          <div className="landing-slide-mock-stepper landing-slide-mock-stepper--plan" aria-hidden="true">
            <span className="landing-slide-mock-step landing-slide-mock-step--active">Bias</span>
            <span className="landing-slide-mock-step">Levels</span>
            <span className="landing-slide-mock-step">Setups</span>
            <span className="landing-slide-mock-step">Risk</span>
          </div>
          <div className="pm-section-panel">
            <div className="pm-section-panel-head">
              <h3 className="pm-section-title hybrid-section-title">Market bias</h3>
            </div>
            <div className="pm-section-panel-body">
              <div className="landing-slide-mock-chips" aria-hidden="true">
                <span className="landing-slide-mock-chip landing-slide-mock-chip--on">Trend day</span>
                <span className="landing-slide-mock-chip">Range</span>
                <span className="landing-slide-mock-chip">News-driven</span>
              </div>
              <div className="landing-slide-mock-levels" aria-hidden="true">
                <div className="landing-slide-mock-level">
                  <span className="hybrid-label">PDH</span>
                  <strong>5,432.50</strong>
                </div>
                <div className="landing-slide-mock-level">
                  <span className="hybrid-label">VWAP</span>
                  <strong>5,418.25</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CloseLoopPreview() {
  return (
    <div className="landing-slide-preview-page premarket-page hybrid-page workflow-page--loop">
      <div className="home-page-glow" aria-hidden="true" />
      <div className="workflow-page-inner">
        <div className="pm-topbar">
          <span>Wednesday, July 3, 2026</span>
        </div>
        <div className="pm-closeout-layout">
          <div className="pm-closeout-main">
            <header className="pm-checkin-header">
              <h2 className="hybrid-page-title">Close loop.</h2>
              <p className="pm-subtitle">Review the session while it is still fresh.</p>
            </header>
            <div className="landing-slide-mock-stepper landing-slide-mock-stepper--close" aria-hidden="true">
              <span className="landing-slide-mock-step landing-slide-mock-step--done">Import</span>
              <span className="landing-slide-mock-step landing-slide-mock-step--active">Review</span>
              <span className="landing-slide-mock-step">Reflect</span>
            </div>
            <div className="pm-section-panel">
              <div className="pm-section-panel-body">
                <div className="pm-field">
                  <div className="pm-field-top">
                    <div className="pm-field-label hybrid-label">Execution quality</div>
                    <div className="pm-field-value" style={{ color: "var(--green)" }}>
                      8
                    </div>
                  </div>
                  <div className="landing-slide-mock-slider" aria-hidden="true">
                    <span className="landing-slide-mock-slider-fill" style={{ width: "78%" }} />
                  </div>
                </div>
                <div className="landing-slide-mock-note" aria-hidden="true">
                  Followed A+ opening drive setup. Took one impulsive add — note for tomorrow.
                </div>
              </div>
            </div>
          </div>
          <aside className="pm-closeout-metrics landing-slide-mock-metrics" aria-hidden="true">
            <div className="pm-closeout-metrics-pnl">
              <span className="pm-closeout-metrics-label hybrid-label-sm">Net P&amp;L</span>
              <span className="pm-closeout-metrics-pnl-value" style={{ color: "var(--green)" }}>
                +$842
              </span>
            </div>
            <div className="landing-slide-mock-metric-row">
              <span className="hybrid-label-sm">Win rate</span>
              <strong>67%</strong>
            </div>
            <div className="landing-slide-mock-metric-row">
              <span className="hybrid-label-sm">Playbook</span>
              <strong style={{ color: "var(--green)" }}>4 / 5</strong>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
