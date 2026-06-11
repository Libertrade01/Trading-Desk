export const DEFAULT_RISK_KEY = "libertrade_default_risk";

export const SETUP_OPTIONS = [
  { value: "", label: "—" },
  { value: "HVE Fade", label: "HVE" },
  { value: "Imbalance Pullback", label: "Im.PB" },
  { value: "Peak & Fail", label: "P&F" },
  { value: "Break & Retest", label: "B&R" },
  { value: "VWAP Retest", label: "VWAP" },
  { value: "OR Mid (5m)", label: "OR Mid" },
  { value: "No Setup / Improvised", label: "Improv." },
];

export const MGMT_OPTIONS = [
  { value: "", label: "—" },
  { value: "Managed Well", label: "Mgd Well" },
  { value: "Closed Early", label: "Early" },
  { value: "Closed Late", label: "Late" },
  { value: "Exited Early — Ran (2R+)", label: "Exit→2R+" },
];

export const POST_EXIT_OPTIONS = [
  { value: "", label: "—" },
  { value: "ran_1r", label: "Ran 1R+" },
  { value: "ran_2r", label: "Ran 2R+" },
  { value: "ran_3r", label: "Ran 3R+" },
];

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "eval", label: "Eval" },
  { value: "funded", label: "Funded" },
  { value: "cash", label: "Cash" },
];
