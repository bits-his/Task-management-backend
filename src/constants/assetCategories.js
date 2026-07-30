/** Shared with FE taxonomy — keep slugs in sync with frontend assetShared.js */
export const ASSET_CATEGORY_META = {
  laptop: { label: "Laptop", assignable: true, group: "IT Equipment" },
  desktop: { label: "Desktop", assignable: true, group: "IT Equipment" },
  monitor: { label: "Monitor", assignable: true, group: "IT Equipment" },
  keyboard: { label: "Keyboard", assignable: true, group: "IT Equipment" },
  mouse: { label: "Mouse", assignable: true, group: "IT Equipment" },
  printer: { label: "Printer", assignable: true, group: "IT Equipment" },
  ups: { label: "UPS", assignable: false, group: "IT Equipment" },
  router: { label: "Router", assignable: false, group: "IT Equipment" },
  switch: { label: "Switch", assignable: false, group: "IT Equipment" },
  server: { label: "Server", assignable: false, group: "IT Equipment" },
  "office-chair": {
    label: "Office Chair",
    assignable: true,
    group: "Office Equipment",
  },
  desk: { label: "Desk", assignable: false, group: "Office Equipment" },
  projector: {
    label: "Projector",
    assignable: true,
    group: "Office Equipment",
  },
  whiteboard: {
    label: "Whiteboard",
    assignable: false,
    group: "Office Equipment",
  },
  "air-conditioner": {
    label: "Air Conditioner",
    assignable: false,
    group: "Office Equipment",
  },
  "microsoft-365": { label: "Microsoft 365", assignable: true, group: "Software" },
  "figma-license": { label: "Figma License", assignable: true, group: "Software" },
  "github-team": { label: "GitHub Team", assignable: true, group: "Software" },
  cursor: { label: "Cursor", assignable: true, group: "Software" },
  "chatgpt-team": { label: "ChatGPT Team", assignable: true, group: "Software" },
  "adobe-license": { label: "Adobe License", assignable: true, group: "Software" },
  "company-id": { label: "Company ID", assignable: true, group: "Other" },
  "access-card": { label: "Access Card", assignable: true, group: "Other" },
  "power-bank": { label: "Power Bank", assignable: true, group: "Other" },
  "internet-modem": {
    label: "Internet Modem",
    assignable: false,
    group: "Other",
  },
};

export function isCategoryAssignable(category) {
  if (!category) return true;
  const meta = ASSET_CATEGORY_META[String(category)];
  if (!meta) return true;
  return Boolean(meta.assignable);
}

export function categoryDisplayName(category) {
  if (!category) return "Uncategorized";
  const meta = ASSET_CATEGORY_META[String(category)];
  if (!meta) return String(category).replace(/-/g, " ");
  return `${meta.group} · ${meta.label}`;
}
