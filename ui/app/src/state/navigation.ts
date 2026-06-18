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

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "imports", label: "Imports" },
  { id: "retrieval", label: "Retrieval" },
  { id: "organized-output", label: "Organized Output" },
  { id: "datasets", label: "Datasets" },
  { id: "tiered-db", label: "Tiered DB" },
  { id: "review-queue", label: "Review Queue" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "governance", label: "Governance" },
  { id: "settings", label: "Settings" }
];
