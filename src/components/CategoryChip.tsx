import { motion } from "framer-motion";

interface CategoryChipProps {
  icon: string;
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const CategoryChip = ({ icon, label, isSelected = false, onClick }: CategoryChipProps) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 pt-3.5 pb-2.5 px-3 rounded-2xl transition-all min-w-[70px] ${isSelected
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-card text-foreground hover:bg-secondary"
        }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </motion.button>
  );
};

export default CategoryChip;
