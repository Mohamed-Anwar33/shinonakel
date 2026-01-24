// Unified delivery apps configuration
export const DELIVERY_APPS = [
  { name: "Talabat", color: "#FF5A00" },
  { name: "Jahez", color: "#EF4444" },
  { name: "Keeta", color: "#FACC15" },
  { name: "Deliveroo", color: "#00CCBC" },
] as const;

export const DELIVERY_APP_COLORS: Record<string, string> = {
  "Talabat": "#FF5A00",
  "Jahez": "#EF4444",
  "Keeta": "#FACC15",
  "Deliveroo": "#00CCBC",
  // Arabic names mapping
  "طلبات": "#FF5A00",
  "جاهز": "#EF4444",
  "كيتا": "#FACC15",
  "ديليفرو": "#00CCBC",
};

export const getDeliveryAppColor = (appName: string): string => {
  return DELIVERY_APP_COLORS[appName] || "#888888";
};

export type DeliveryApp = {
  name: string;
  color: string;
  url?: string | null;
};
