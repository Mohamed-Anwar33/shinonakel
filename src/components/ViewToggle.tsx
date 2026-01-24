import { motion } from "framer-motion";
import { List, Map } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ViewToggleProps {
  view: "list" | "map";
  onChange: (view: "list" | "map") => void;
}

const ViewToggle = ({ view, onChange }: ViewToggleProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center bg-muted rounded-xl p-1">
      <button
        onClick={() => onChange("list")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          view === "list"
            ? "bg-card text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="w-4 h-4" />
        <span>{t("قائمة", "List")}</span>
      </button>
      <button
        onClick={() => onChange("map")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          view === "map"
            ? "bg-card text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Map className="w-4 h-4" />
        <span>{t("خريطة", "Map")}</span>
      </button>
    </div>
  );
};

export default ViewToggle;
