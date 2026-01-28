import { motion } from "framer-motion";
import { Star, Heart, MapPin, Trash2, Navigation } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  onDeliveryAppClick?: (app: DeliveryApp) => void;
  isSponsored?: boolean;
  // For My List page - show delete instead of favorite
  showDelete?: boolean;
  onDeleteClick?: () => void;
  // Location status
  locationAvailable?: boolean;
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
  onDeliveryAppClick,
  isSponsored = false,
  showDelete = false,
  onDeleteClick,
  locationAvailable = true
}: CompactRestaurantCardProps) => {
  const { t } = useLanguage();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex flex-row-reverse items-center gap-3 p-3 bg-card rounded-2xl shadow-card hover:shadow-elevated transition-all cursor-pointer relative ${isSponsored ? 'ring-2 ring-primary/30' : ''}`}
      onClick={onClick}
    >
      {/* Sponsored Badge */}
      {isSponsored && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
          إعلان
        </div>
      )}

      {/* Left Side: Rating, Heart/Delete, Map (Vertical) */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="inline-flex items-center justify-center gap-1 bg-amber-100 px-2 pt-1.5 pb-1 rounded-lg">
          <span className="text-xs font-bold leading-none mb-0 mr-[3px] px-[2px] font-mono">{rating.toFixed(1)}</span>
          <Star className="w-3 h-3 fill-accent text-accent" />
        </div>

        {showDelete ? (
          <button
            onClick={e => {
              e.stopPropagation();
              onDeleteClick?.();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
          </button>
        ) : (
          <button
            onClick={e => {
              e.stopPropagation();
              onFavoriteClick?.();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/50 transition-colors"
          >
            <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        )}

        {/* Always show map icon - opens Google Maps search */}
        <button
          onClick={e => {
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
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors pt-0.5"
        >
          <MapPin className="w-4 h-4 text-primary py-0 px-0 mb-[4px]" />
        </button>
      </div>

      {/* Content: Name, Cuisine, Distance, Delivery Apps */}
      <div className="flex-1 min-w-0 text-start">
        <h4 className="font-bold text-base truncate mb-0.5">{name}</h4>
        
        {/* Cuisine and Distance Row */}
        <div className="flex items-center gap-2 mb-2 flex-row-reverse justify-end">
          {cuisine && <p className="text-xs text-muted-foreground">{cuisine}</p>}
          
          {/* Distance Display */}
          {distance ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span>{distance}</span>
            </div>
          ) : !locationAvailable ? (
            <span className="text-xs text-muted-foreground/60 italic">
              {t("المسافة غير معروفة", "Distance unknown")}
            </span>
          ) : null}
        </div>

        {/* Delivery Apps */}
        {deliveryApps.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap flex-row-reverse justify-end">
            {deliveryApps.map(app => (
              <button
                key={app.name}
                onClick={e => {
                  e.stopPropagation();
                  // Call the callback first for tracking
                  onDeliveryAppClick?.(app);
                  // Then open the URL
                  if (app.url) {
                    const url = app.url.startsWith('http') ? app.url : `https://${app.url}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="inline-flex items-center justify-center pt-1.5 pb-1 rounded-full text-[10px] font-bold hover:opacity-80 transition-opacity min-w-[50px] leading-none text-center px-[7px] font-sans border-2"
                style={{
                  borderColor: app.color,
                  color: app.color
                }}
              >
                {app.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Image */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
    </motion.div>
  );
};

export default CompactRestaurantCard;
