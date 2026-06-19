export const DEFAULT_RISK_KEY = "libertrade_default_risk";

export {
  VALID_SETUPS,
  SETUP_IMPROVISED,
  SETUP_INVALID,
  SETUP_OPTIONS,
} from "./setup-options";

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
