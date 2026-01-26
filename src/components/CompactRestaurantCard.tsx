import { motion } from "framer-motion";
import { Star, Heart, MapPin } from "lucide-react";

interface DeliveryApp {
  name: string;
  color: string;
  url?: string;
}

interface CompactRestaurantCardProps {
  name: string;
  cuisine?: string;
  image: string;
  rating: number;
  distance: string;
  mapUrl?: string | null;
  deliveryApps: DeliveryApp[];
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
  onMapClick?: () => void;
  onClick?: () => void;
}

const CompactRestaurantCard = ({
  name,
  cuisine,
  image,
  rating,
  distance,
  mapUrl,
  deliveryApps,
  isFavorite = false,
  onFavoriteClick,
  onMapClick,
  onClick,
}: CompactRestaurantCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-row-reverse items-center gap-3 p-3 bg-card rounded-2xl shadow-card hover:shadow-elevated transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Left Side: Rating, Heart, Map (Vertical) */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-lg">
          <span className="text-xs font-bold">{rating.toFixed(1)}</span>
          <Star className="w-3 h-3 fill-accent text-accent" />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick?.();
          }}
          className="p-1"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
              }`}
          />
        </button>

        {/* Always show map icon - opens Google Maps search */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onMapClick) {
              onMapClick();
            } else if (mapUrl) {
              const url = mapUrl.startsWith('http') ? mapUrl : `https://${mapUrl}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              // Open Google Maps with restaurant name search
              const searchQuery = encodeURIComponent(name);
              window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank', 'noopener,noreferrer');
            }
          }}
          className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <MapPin className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Content: Name, Cuisine, Delivery Apps */}
      <div className="flex-1 min-w-0 text-start">
        <h4 className="font-bold text-base truncate mb-0.5">{name}</h4>
        {cuisine && (
          <p className="text-xs text-muted-foreground mb-2">{cuisine}</p>
        )}

        {/* Delivery Apps */}
        {deliveryApps.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap flex-row-reverse justify-end">
            {deliveryApps.slice(0, 3).map((app) => (
              <button
                key={app.name}
                onClick={(e) => {
                  e.stopPropagation();
                  if (app.url) {
                    const url = app.url.startsWith('http') ? app.url : `https://${app.url}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold border hover:opacity-80 transition-opacity"
                style={{ borderColor: app.color, color: app.color }}
              >
                {app.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Image */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    </motion.div>
  );
};

export default CompactRestaurantCard;
