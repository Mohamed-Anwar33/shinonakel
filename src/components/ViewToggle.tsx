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
    <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-2">
      <button
        onClick={() => onChange("list")}
        className="transition-all flex items-center justify-center"
        aria-label="List view"
      >
        <List className={`w-5 h-5 flex-shrink-0 transition-colors ${view === "list" ? "text-white" : "text-white/50 hover:text-white/70"}`} />
      </button>
      <button
        onClick={() => onChange("map")}
        className="transition-all flex items-center justify-center"
        aria-label="Map view"
      >
        <Map className={`w-5 h-5 flex-shrink-0 transition-colors ${view === "map" ? "text-white" : "text-white/50 hover:text-white/70"}`} />
      </button>
    </div>
  );
};

export default ViewToggle;
