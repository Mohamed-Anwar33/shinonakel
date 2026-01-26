import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import logo from "@/assets/spin-logo.png";
interface Cuisine {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
}
interface SpinWheelProps {
  onResult: (category: string) => void;
  selectedCategory?: string;
  cuisines?: Cuisine[];
}
const defaultCuisines: Cuisine[] = [{
  id: "1",
  name: "الكل",
  emoji: "🍽️",
  sort_order: 0
}, {
  id: "2",
  name: "يابانية",
  emoji: "🍱",
  sort_order: 1
}, {
  id: "3",
  name: "إيطالية",
  emoji: "🍕",
  sort_order: 2
}, {
  id: "4",
  name: "حلويات",
  emoji: "🍰",
  sort_order: 3
}, {
  id: "5",
  name: "برجر",
  emoji: "🍔",
  sort_order: 4
}, {
  id: "6",
  name: "بحرية",
  emoji: "🦐",
  sort_order: 5
}];

// Map specific cuisines to specific colors
const cuisineColorMap: Record<string, string> = {
  "بحرية": "#1e3a5f",
  // Dark blue for seafood
  "بحري": "#1e3a5f",
  "يابانية": "#E84C5C",
  // Red
  "ياباني": "#E84C5C",
  "إيطالية": "#FFB347",
  // Orange
  "إيطالي": "#FFB347",
  "بيتزا": "#FFB347",
  // Orange (same as Italian)
  "حلويات": "#DDA0DD",
  // Purple/Pink
  "برجر": "#90EE90",
  // Green
  "خليجية": "#F4A460",
  // Sandy brown
  "خليجي": "#F4A460",
  "مكسيكية": "#FF6B6B",
  // Coral red
  "مكسيكي": "#FF6B6B",
  "هندية": "#9370DB",
  // Purple
  "هندي": "#9370DB",
  "صينية": "#FFD700",
  // Gold
  "صيني": "#FFD700",
  "تركية": "#E57373",
  // Light red
  "تركي": "#E57373",
  "لبنانية": "#81C784",
  // Light green
  "لبناني": "#81C784",
  "قهوة": "#8B4513",
  // Coffee brown
  "معجنات": "#D2691E",
  // Chocolate/pastry color
  "دايت": "#32CD32",
  // Lime green for healthy
  "وجبات سريعة": "#FF4500",
  // Orange-red for fast food
  "أخرى": "#A0A0A0",
  // Gray for other
  "منوع": "#87CEEB",
  // Sky blue for mixed
  "شاورما": "#CD853F",
  // Peru brown for shawarma
  "مشاوي": "#B22222",
  // Firebrick for grills
  "فطور": "#FFE4B5" // Moccasin for breakfast
};
const defaultWheelColors = ["#E84C5C", "#FFB347", "#87CEEB", "#DDA0DD", "#90EE90", "#ADD8E6", "#F4A460", "#9370DB"];

// Similar cuisines that should be merged (e.g., بيتزا = إيطالي)
const cuisineMergeMap: Record<string, string> = {
  "بيتزا": "إيطالي",
  "إيطالية": "إيطالي"
};
const SpinWheel = ({
  onResult,
  selectedCategory = "الكل",
  cuisines
}: SpinWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Use provided cuisines or fallback to defaults
  const availableCuisines = cuisines && cuisines.length > 0 ? cuisines : defaultCuisines;

  // Get the display categories based on selection
  const displayCategories = useMemo(() => {
    if (selectedCategory === "الكل") {
      // Show all different categories (excluding "الكل" itself)
      const filtered = availableCuisines.filter(c => c.name !== "الكل");

      // Remove duplicates and merge similar cuisines (e.g., بيتزا -> إيطالية)
      const seenNames = new Set<string>();
      const uniqueCuisines = filtered.filter(cuisine => {
        const normalizedName = cuisineMergeMap[cuisine.name] || cuisine.name;
        if (seenNames.has(normalizedName)) {
          return false;
        }
        seenNames.add(normalizedName);
        return true;
      });
      return uniqueCuisines.map((cuisine, index) => {
        const normalizedName = cuisineMergeMap[cuisine.name] || cuisine.name;
        return {
          name: normalizedName,
          color: cuisineColorMap[normalizedName] || defaultWheelColors[index % defaultWheelColors.length],
          icon: cuisine.emoji
        };
      });
    } else {
      // Show only the selected category's emoji on all segments
      const selectedCat = availableCuisines.find(c => c.name === selectedCategory);
      const icon = selectedCat?.emoji || "🍽️";
      const baseColor = cuisineColorMap[selectedCategory] || "#4A90D9";
      return defaultWheelColors.slice(0, 6).map((color, index) => ({
        name: selectedCategory,
        color: index % 2 === 0 ? baseColor : color,
        icon
      }));
    }
  }, [selectedCategory, availableCuisines]);
  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    // Increased rotations for a longer, smoother spin
    const rotations = 5;
    // If we are in single category view (not "الكل"), we want to land upright (multiple of 360)
    // Otherwise, for "الكل", we land on a random segment
    const extraDegrees = selectedCategory === "الكل" ? Math.random() * 360 : 0;
    const totalRotation = rotations * 360 + extraDegrees;

    // Calculate new rotation value BEFORE setting state
    const newRotation = rotation + totalRotation;
    setRotation(newRotation);
    setTimeout(() => {
      if (selectedCategory === "الكل") {
        const segmentAngle = 360 / displayCategories.length;
        // The wheel rotates clockwise from CSS perspective
        // Segments are drawn starting at -90 degrees (top) going clockwise
        // The pointer is at the top (12 o'clock position)
        // When wheel rotates by X degrees clockwise, segment at position (360 - X) is under the pointer
        const normalizedRotation = (newRotation % 360 + 360) % 360;
        // Calculate which segment is under the pointer
        // Segment 0 starts at top, so we need to find the segment based on how much the wheel rotated
        const index = Math.floor((360 - normalizedRotation + segmentAngle / 2) % 360 / segmentAngle) % displayCategories.length;
        onResult(displayCategories[index].name);
      } else {
        // If a specific category is selected, return that category
        onResult(selectedCategory);
      }
      setIsSpinning(false);
    }, 3000); // Wait 3 seconds for animation to finish
  };
  const segmentAngle = 360 / displayCategories.length;

  // Get the color and emoji for single category view
  const singleCategoryView = useMemo(() => {
    if (selectedCategory !== "الكل") {
      const selectedCat = availableCuisines.find(c => c.name === selectedCategory);
      const normalizedName = cuisineMergeMap[selectedCategory] || selectedCategory;

      // Try to get color from cuisineColorMap with various name formats
      const color = cuisineColorMap[selectedCategory] || cuisineColorMap[normalizedName] || cuisineColorMap[selectedCategory.replace(/ة$/, '')] ||
      // Remove feminine ending
      cuisineColorMap[selectedCategory.replace(/ي$/, 'ية')] ||
      // Add feminine ending
      defaultWheelColors[availableCuisines.findIndex(c => c.name === selectedCategory) % defaultWheelColors.length] || "#4A90D9";
      return {
        emoji: selectedCat?.emoji || "🍽️",
        color
      };
    }
    return null;
  }, [selectedCategory, availableCuisines]);
  return <div className="relative flex flex-col items-center">
      {/* Pointer - only show for multi-category wheel */}
      {!singleCategoryView && <div className="absolute -top-2 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>}

      {/* Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full bg-[#1e3a5f] p-2">
          {/* Wheel */}
          <motion.div ref={wheelRef} className="w-full h-full rounded-full overflow-hidden shadow-elevated relative" style={{
          rotate: rotation
        }} animate={{
          rotate: rotation
        }} transition={{
          duration: 3,
          ease: [0.15, 0.85, 0.35, 1]
        }}>
            {singleCategoryView ? (/* Single category view - emoji is the button */
          <button onClick={spinWheel} disabled={isSpinning} className="w-full h-full rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-70" style={{
            backgroundColor: singleCategoryView.color
          }}>
                <span className="drop-shadow-lg select-none text-center font-thin py-[24px] pt-0 mb-0 pb-0 pr-0 px-0 font-mono pl-0 mr-0 text-7xl" style={{
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                  {singleCategoryView.emoji}
                </span>
              </button>) : (/* Multi-category wheel view */
          <svg viewBox="0 0 100 100" className="w-full h-full">
                {displayCategories.map((category, index) => {
              // Offset by half a segment so segment centers align with the pointer at 12 o'clock.
              // Without this, the pointer lands on segment borders causing perceived mismatches.
              const startAngle = index * segmentAngle - 90 - segmentAngle / 2;
              const endAngle = startAngle + segmentAngle;
              const startRad = startAngle * Math.PI / 180;
              const endRad = endAngle * Math.PI / 180;
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              const largeArc = segmentAngle > 180 ? 1 : 0;
              const midAngle = (startAngle + endAngle) / 2;
              const midRad = midAngle * Math.PI / 180;
              const textX = 50 + 38 * Math.cos(midRad);
              const textY = 50 + 38 * Math.sin(midRad);
              return <g key={`${category.name}-${index}`}>
                      <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={category.color} stroke="white" strokeWidth="0.5" />
                      {/* Emoji only */}
                      <text x={textX} y={textY} dy="0.35em" textAnchor="middle" fill="white" fontSize="10" style={{
                  fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'
                }} transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}>
                        {category.icon}
                      </text>
                    </g>;
            })}
              </svg>)}
          </motion.div>
        </div>

        {/* Center button with logo - only show for multi-category wheel */}
        {!singleCategoryView && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button onClick={spinWheel} disabled={isSpinning} className="w-24 h-24 rounded-full shadow-elevated items-center justify-center z-10 transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 overflow-hidden pointer-events-auto p-0 border-0 bg-white">
              <motion.img src={logo} alt="Logo" className="w-full h-full rounded-full object-contain p-1" animate={isSpinning ? {
            rotate: 360
          } : {}} transition={isSpinning ? {
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          } : {}} />
            </button>
          </div>}
      </div>
    </div>;
};
export default SpinWheel;