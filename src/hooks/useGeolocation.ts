import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
  permissionDenied: boolean;
}

export const useGeolocation = (watchPosition: boolean = false) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
    permissionDenied: false,
  });
  
  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "المتصفح لا يدعم خدمات الموقع",
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          isLoading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMessage = "حدث خطأ في تحديد الموقع";
        let permissionDenied = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض إذن الموقع";
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "الموقع غير متاح";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب الموقع";
            break;
        }
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
          permissionDenied,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Watch position continuously for real-time updates
  useEffect(() => {
    if (!watchPosition || !navigator.geolocation) return;

    // Initial request
    requestLocation();

    // Set up watcher for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          isLoading: false,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMessage = "حدث خطأ في تحديد الموقع";
        let permissionDenied = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض إذن الموقع";
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "الموقع غير متاح";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب الموقع";
            break;
        }
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
          permissionDenied,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Cache for 30 seconds
      }
    );

    // Cleanup watcher on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [watchPosition, requestLocation]);

  return {
    ...state,
    requestLocation,
  };
};

// Calculate distance between two coordinates using Haversine formula (returns km)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};
