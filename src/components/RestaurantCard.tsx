import { motion } from "framer-motion";
import { Star, Heart, MapPin } from "lucide-react";

interface DeliveryApp {
  name: string;
  color: string;
}

interface RestaurantCardProps {
  name: string;
  image: string;
  rating: number;
  distance: string;
  cuisine: string;
  isOpen?: boolean;
  isSponsored?: boolean;
  deliveryApps: DeliveryApp[];
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string | null;
  onClick?: () => void;
}

const RestaurantCard = ({
  name,
  image,
  rating,
  distance,
  cuisine,
  isOpen = true,
  isSponsored = false,
  deliveryApps,
  latitude,
  longitude,
  mapsUrl,
  onClick,
  isFavorite = false,
  onFavoriteClick,
}: RestaurantCardProps) => {
  const hasMapLink = mapsUrl || (latitude && longitude);
  
  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapsUrl) {
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } else if (latitude && longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank', 'noopener,noreferrer');
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
      onClick={onClick}
      dir="rtl"
    >
      <div className="flex">
        {/* Image Section */}
        <div className="relative w-28 h-28 shrink-0">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3">
          {/* Name */}
          <h3 className="font-bold text-base leading-tight truncate mb-1">{name}</h3>

          {/* Cuisine */}
          <p className="text-sm text-muted-foreground mb-2">{cuisine}</p>

          {/* Distance */}
          {distance && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 text-primary" />
              <span>{distance}</span>
            </div>
          )}

          {/* Delivery Apps */}
          {deliveryApps.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {deliveryApps.slice(0, 2).map((app) => (
                <span
                  key={app.name}
                  className="inline-flex items-center justify-center px-2 h-5 rounded-full text-xs font-semibold border leading-none"
                  style={{ borderColor: app.color, color: app.color }}
                >
                  {app.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Column */}
        <div className="flex flex-col items-center justify-between p-2">
          {/* Rating */}
          <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-lg">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
          </div>

          {/* Favorite */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteClick?.();
            }}
            className="p-1"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
              }`}
            />
          </button>

          {/* Map */}
          <button
            onClick={handleMapClick}
            disabled={!hasMapLink}
            className={`p-1 ${!hasMapLink ? "opacity-30" : ""}`}
          >
            <MapPin className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RestaurantCard;
