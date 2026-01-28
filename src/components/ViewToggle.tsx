import { List, Map } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface ViewToggleProps {
  view: "list" | "map";
  onChange: (view: "list" | "map") => void;
}

const ViewToggle = ({ view, onChange }: ViewToggleProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleViewChange = (newView: "list" | "map") => {
    if (newView === "map") {
      // Navigate to dedicated map page with current filters
      const category = searchParams.get("category");
      const emoji = searchParams.get("emoji");
      
      const mapUrl = category 
        ? `/map?category=${encodeURIComponent(category)}&emoji=${encodeURIComponent(emoji || '')}`
        : '/map';
      
      navigate(mapUrl);
    } else {
      onChange(newView);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-primary rounded-full p-1">
      <button 
        onClick={() => handleViewChange("map")} 
        className={`transition-all flex items-center justify-center p-2 rounded-full ${view === "map" ? "bg-white/25" : ""}`} 
        aria-label="Map view"
      >
        <Map className="w-5 h-5 text-white" />
      </button>
      <button 
        onClick={() => handleViewChange("list")} 
        className={`transition-all flex items-center justify-center p-2 rounded-full ${view === "list" ? "bg-white/25" : ""}`} 
        aria-label="List view"
      >
        <List className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};

export default ViewToggle;
