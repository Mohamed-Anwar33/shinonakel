import { Phone, MapPin, Globe, ExternalLink, Star, X, Navigation, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDeliveryAppColor, type DeliveryApp } from "@/lib/deliveryApps";
import { Link } from "react-router-dom";

interface Restaurant {
  id: string;
  name: string;
  name_en?: string | null;
  image: string;
  rating: number;
  distance?: string;
  cuisine: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  deliveryApps?: DeliveryApp[];
  website?: string | null;
  isGeocoded?: boolean;
}

interface MapRestaurantSheetProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
}

export function MapRestaurantSheet({ isOpen, onClose, restaurant }: MapRestaurantSheetProps) {
  const { language, t } = useLanguage();

  if (!restaurant) return null;

  const displayName = language === "en" && restaurant.name_en 
    ? restaurant.name_en 
    : restaurant.name;

  // Check if restaurant has valid location for directions
  const hasValidLocation = restaurant.mapsUrl || (restaurant.latitude && restaurant.longitude && !restaurant.isGeocoded);

  const handleGetDirections = () => {
    if (restaurant.mapsUrl) {
      window.open(restaurant.mapsUrl, '_blank', 'noopener,noreferrer');
    } else if (restaurant.latitude && restaurant.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const handleCall = () => {
    if (restaurant.phone) {
      window.location.href = `tel:${restaurant.phone}`;
    }
  };

  const handleDeliveryClick = (url: string | null | undefined) => {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative pb-2">
          <DrawerClose className="absolute left-4 top-4 p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </DrawerClose>
          <DrawerTitle className="sr-only">{displayName}</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
          {/* Restaurant Header */}
          <div className="flex gap-4">
            {/* Image */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-soft">
              <img
                src={restaurant.image}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl truncate">{displayName}</h2>
              <p className="text-sm text-muted-foreground mb-1">{restaurant.cuisine}</p>
              
              {/* Distance */}
              {restaurant.distance && (
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  {restaurant.distance}
                </p>
              )}
              
              {/* Rating */}
              <div className="inline-flex items-center gap-1.5 bg-amber-100 px-2.5 py-1 rounded-full">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-sm">{restaurant.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          {restaurant.address && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">{restaurant.address}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {hasValidLocation && (
              <Button
                onClick={handleGetDirections}
                className="flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                {t("الاتجاهات", "Directions")}
              </Button>
            )}
            
            {restaurant.phone && (
              <Button
                variant="outline"
                onClick={handleCall}
                className="flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                {t("اتصال", "Call")}
              </Button>
            )}
          </div>

          {/* Delivery Apps */}
          {restaurant.deliveryApps && restaurant.deliveryApps.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                {t("اطلب عبر", "Order via")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {restaurant.deliveryApps.map((app, index) => (
                  <button
                    key={`${app.name}-${index}`}
                    onClick={() => handleDeliveryClick(app.url)}
                    disabled={!app.url}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      borderColor: getDeliveryAppColor(app.name), 
                      color: getDeliveryAppColor(app.name) 
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* View Details Button */}
          <Link 
            to={`/restaurant/${restaurant.id}`}
            onClick={onClose}
            className="w-full"
          >
            <Button
              variant="outline"
              className="w-full flex items-center justify-between gap-2"
            >
              {t("عرض التفاصيل", "View Details")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>

          {/* Website */}
          {restaurant.website && (
            <Button
              variant="ghost"
              className="w-full flex items-center gap-2 text-muted-foreground"
              onClick={() => window.open(restaurant.website!, '_blank', 'noopener,noreferrer')}
            >
              <Globe className="w-4 h-4" />
              {t("زيارة الموقع", "Visit Website")}
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
