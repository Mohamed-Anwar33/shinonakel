import { motion } from "framer-motion";
import { MapPin, Navigation, Star } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
  image: string;
  rating: number;
  distance: string;
  cuisine: string;
  position: { top: string; right: string };
}

interface MapViewProps {
  restaurants: Restaurant[];
  onRestaurantClick?: (id: number) => void;
}

const MapView = ({ restaurants, onRestaurantClick }: MapViewProps) => {
  return (
    <div className="relative w-full h-[400px] bg-secondary rounded-2xl overflow-hidden">
      {/* Map Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Streets simulation */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 right-0 h-3 bg-muted-foreground/10 -translate-y-1/2" />
        <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-muted-foreground/10 -translate-x-1/2" />
        <div className="absolute top-1/4 left-0 right-0 h-2 bg-muted-foreground/5" />
        <div className="absolute top-3/4 left-0 right-0 h-2 bg-muted-foreground/5" />
      </div>

      {/* Current Location */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <div className="relative">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-elevated animate-pulse-soft">
            <Navigation className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45" />
        </div>
        <p className="text-xs font-medium text-center mt-2 text-foreground">موقعك</p>
      </motion.div>

      {/* Restaurant Markers */}
      {restaurants.map((restaurant, index) => (
        <motion.button
          key={restaurant.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.3 }}
          onClick={() => onRestaurantClick?.(restaurant.id)}
          className="absolute group"
          style={{ top: restaurant.position.top, right: restaurant.position.right }}
        >
          {/* Marker */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-card shadow-elevated overflow-hidden group-hover:scale-110 transition-transform">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Rating badge */}
            <div className="absolute -bottom-1 -left-1 bg-card px-1.5 py-0.5 rounded-full shadow-soft flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span className="text-[10px] font-bold">{restaurant.rating}</span>
            </div>
          </div>

          {/* Tooltip */}
          <div className="absolute top-full right-1/2 translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-card rounded-lg shadow-elevated px-3 py-2 whitespace-nowrap">
              <p className="text-xs font-bold">{restaurant.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {restaurant.distance}
              </p>
            </div>
          </div>
        </motion.button>
      ))}

      {/* Map Attribution */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded">
        📍 الكويت، الكويت
      </div>
    </div>
  );
};

export default MapView;
