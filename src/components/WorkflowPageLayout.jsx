export default function WorkflowPageLayout({ children }) {
  return (
    <div className="premarket-page hybrid-page home-page--loop workflow-page--loop">
      <div className="home-page-glow" aria-hidden="true" />
      <div className="workflow-page-inner">{children}</div>
    </div>
  );
}
