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
    <div className="flex items-center gap-1 bg-white/20 rounded-full p-1">
      <button
        onClick={() => onChange("list")}
        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${view === "list"
            ? "bg-white text-primary shadow-sm"
            : "text-white/80 hover:text-white"
          }`}
        aria-label="List view"
      >
        <List className="w-5 h-5 flex-shrink-0" />
      </button>
      <button
        onClick={() => onChange("map")}
        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${view === "map"
            ? "bg-white text-primary shadow-sm"
            : "text-white/80 hover:text-white"
          }`}
        aria-label="Map view"
      >
        <Map className="w-5 h-5 flex-shrink-0" />
      </button>
    </div>
  );
};

export default ViewToggle;
