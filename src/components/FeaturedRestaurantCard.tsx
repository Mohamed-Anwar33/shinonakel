import { motion } from "framer-motion";
import { Star, Heart, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DeliveryApp {
  name: string;
  color: string;
  url?: string | null;
}

interface FeaturedRestaurantCardProps {
  name: string;
  image: string;
  rating: number;
  distance: string;
  cuisine: string;
  mapUrl?: string | null;
  deliveryApps: DeliveryApp[];
  isFavorite?: boolean;
  isSponsored?: boolean;
  onFavoriteClick?: () => void;
  onMapClick?: () => void;
  onClick?: () => void;
}

const FeaturedRestaurantCard = ({
  name,
  image,
  rating,
  distance,
  cuisine,
  mapUrl,
  deliveryApps,
  isFavorite = false,
  isSponsored = false,
  onFavoriteClick,
  onMapClick,
  onClick,
}: FeaturedRestaurantCardProps) => {
  const { t, language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
      onClick={onClick}
    >
      {/* Featured Image Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-primary/20 to-primary/5 p-4 cursor-pointer">
        {/* Badges Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isSponsored && (
              <span className="inline-flex items-center justify-center px-3 pt-1.5 pb-1 bg-accent text-accent-foreground text-xs font-bold rounded-full leading-none">
                {t("إعلان مدفوع", "Sponsored")}
              </span>
            )}
            <span className="inline-flex items-center justify-center px-3 pt-1.5 pb-1 bg-success text-white text-xs font-bold rounded-full leading-none">
              {t("مفتوح الآن", "Open Now")}
            </span>
          </div>

          {/* Action Buttons: Favorite & Location */}
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteClick?.();
              }}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
                  }`}
              />
            </button>

            {/* Location Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMapClick) {
                  onMapClick();
                } else if (mapUrl) {
                  const url = mapUrl.startsWith('http') ? mapUrl : `https://${mapUrl}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                  const searchQuery = encodeURIComponent(name);
                  // Force search internally in Google Maps
                  window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank', 'noopener,noreferrer');
                }
              }}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-soft"
            >
              <MapPin className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>

        {/* Main Image */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />

          {/* Rating Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-3 pt-2 pb-1.5 rounded-full shadow-soft">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="text-sm font-bold leading-none">{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="text-center">
          <h3 className="font-bold text-xl mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground mb-1">
            {cuisine} • {distance && <span>{distance} {t("بعيداً", "away")}</span>}
          </p>
        </div>

        {/* Delivery Apps Section */}
        {deliveryApps.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground text-center mb-3">
              {t("اطلب الآن عبر التطبيقات", "Order now via apps")}
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {deliveryApps.map((app) => (
                <button
                  key={app.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (app.url) {
                      window.open(app.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="inline-flex items-center justify-center px-4 pt-2.5 pb-2 rounded-full text-sm font-bold border-2 bg-white transition-transform hover:scale-105 leading-none"
                  style={{ borderColor: app.color, color: app.color }}
                >
                  {app.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div >
  );
};

export default FeaturedRestaurantCard;
