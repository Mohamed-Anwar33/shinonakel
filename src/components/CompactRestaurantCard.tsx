import { motion } from "framer-motion";
import { Star, Heart, MapPin, Trash2 } from "lucide-react";
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
  distance?: string;
  mapUrl?: string | null;
  deliveryApps: DeliveryApp[];
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
  onMapClick?: () => void;
  onClick?: () => void;
  // For My List page - show delete instead of favorite
  showDelete?: boolean;
  onDeleteClick?: () => void;
  // Optional notes for My List
  notes?: string;
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
  showDelete = false,
  onDeleteClick,
  notes
}: CompactRestaurantCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
      onClick={onClick}
      dir="rtl"
    >
      <div className="flex">
        {/* Image Section */}
        <div className="relative w-28 h-28 shrink-0">
          {image && image !== "/placeholder.svg" ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl">🍽️</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3">
          {/* Name */}
          <h3 className="font-bold text-base leading-tight truncate mb-1">{name}</h3>

          {/* Cuisine */}
          {cuisine && <p className="text-sm text-muted-foreground mb-2">{cuisine}</p>}

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
              {deliveryApps.map(app => (
                <button
                  key={app.name}
                  onClick={e => {
                    e.stopPropagation();
                    if (app.url) {
                      const url = app.url.startsWith('http') ? app.url : `https://${app.url}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="inline-flex items-center justify-center px-2 pt-1.5 pb-1 rounded-full text-xs font-semibold border leading-none"
                  style={{ borderColor: app.color, color: app.color }}
                >
                  {app.name}
                </button>
              ))}
            </div>
          )}

          {/* Notes */}
          {notes && <p className="text-xs text-primary truncate mt-1">🍽️ {notes}</p>}
        </div>

        {/* Action Buttons Column */}
        <div className="flex flex-col items-center justify-between p-2">
          {/* Rating */}
          <div className="flex items-center gap-1 bg-amber-100 px-2 pt-1.5 pb-1 rounded-lg">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-foreground leading-none font-mono">{rating.toFixed(1)}</span>
          </div>

          {/* Favorite or Delete */}
          {showDelete ? (
            <button
              onClick={e => {
                e.stopPropagation();
                onDeleteClick?.();
              }}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={e => {
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
          )}

          {/* Map */}
          <button
            onClick={e => {
              e.stopPropagation();
              if (onMapClick) {
                onMapClick();
              } else if (mapUrl) {
                const url = mapUrl.startsWith('http') ? mapUrl : `https://${mapUrl}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              } else {
                const searchQuery = encodeURIComponent(name);
                window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank', 'noopener,noreferrer');
              }
            }}
            className="p-1"
          >
            <MapPin className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
export default CompactRestaurantCard;