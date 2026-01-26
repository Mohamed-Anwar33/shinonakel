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
  return <div className="flex items-center gap-2 bg-white/20 rounded-full px-[15px] py-0 my-0 mx-0">
      <button onClick={() => onChange("list")} className="transition-all flex items-center justify-center" aria-label="List view">
        <List className="" />
      </button>
      <button onClick={() => onChange("map")} className="transition-all flex items-center justify-center" aria-label="Map view">
        <Map className="" />
      </button>
    </div>;
};
export default ViewToggle;