import { motion } from "framer-motion";
import { List, Map } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
interface ViewToggleProps {
  view: "list" | "map";
  onChange: (view: "list" | "map") => void;
}
const ViewToggle = ({
  view,
  onChange
}: ViewToggleProps) => {
  const {
    t
  } = useLanguage();
  return (
    <div className="flex items-center gap-1 bg-primary rounded-full p-1">
      <button 
        onClick={() => onChange("map")} 
        className={`transition-all flex items-center justify-center p-2 rounded-full ${view === "map" ? "bg-white/25" : ""}`} 
        aria-label="Map view"
      >
        <Map className="w-5 h-5 text-white" />
      </button>
      <button 
        onClick={() => onChange("list")} 
        className={`transition-all flex items-center justify-center p-2 rounded-full ${view === "list" ? "bg-white/25" : ""}`} 
        aria-label="List view"
      >
        <List className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};
export default ViewToggle;