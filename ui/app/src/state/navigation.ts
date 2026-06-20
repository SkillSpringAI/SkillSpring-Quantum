export type ScreenId =
  | "dashboard"
  | "imports"
  | "retrieval"
  | "organized-output"
  | "datasets"
  | "tiered-db"
  | "review-queue"
  | "diagnostics"
  | "governance"
  | "settings";

export interface NavItem {
  id: ScreenId;
  label: string;
}

export const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard: "Dashboard",
  imports: "Imports",
  retrieval: "Find Imports",
  "organized-output": "Readable Archive",
  datasets: "Datasets",
  "tiered-db": "Tiered DB",
  "review-queue": "Review Queue",
  diagnostics: "Diagnostics",
  governance: "Governance",
  settings: "Settings"
};

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: SCREEN_LABELS.dashboard },
  { id: "imports", label: SCREEN_LABELS.imports },
  { id: "retrieval", label: SCREEN_LABELS.retrieval },
  { id: "organized-output", label: SCREEN_LABELS["organized-output"] },
  { id: "datasets", label: SCREEN_LABELS.datasets },
  { id: "tiered-db", label: SCREEN_LABELS["tiered-db"] },
  { id: "review-queue", label: SCREEN_LABELS["review-queue"] },
  { id: "diagnostics", label: SCREEN_LABELS.diagnostics },
  { id: "governance", label: SCREEN_LABELS.governance },
  { id: "settings", label: SCREEN_LABELS.settings }
];

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "imports", label: "Imports" },
  { id: "retrieval", label: "Find Imports" },
  { id: "organized-output", label: "Readable Archive" },
  { id: "datasets", label: "Datasets" },
  { id: "diagnostics", label: "Diagnostics" }
];

export const ADVANCED_NAV_ITEMS: NavItem[] = [
  { id: "tiered-db", label: "Tiered DB" },
  { id: "review-queue", label: "Review Queue" },
  { id: "governance", label: "Governance" },
  { id: "settings", label: "Settings" }
];
