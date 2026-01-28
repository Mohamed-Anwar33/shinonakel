import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

declare var google: any;

interface MapControllerProps {
    branches: Array<{ lat: number; lng: number }>;
}

export const MapController = ({ branches }: MapControllerProps) => {
    const map = useMap();

    useEffect(() => {
        if (!map || branches.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        branches.forEach((branch) => {
            if (branch.lat && branch.lng) {
                bounds.extend({ lat: branch.lat, lng: branch.lng });
            }
        });

        map.fitBounds(bounds);

        // Optional: Avoid zooming in too much if only 1 marker
        if (branches.length === 1) {
            // We can't setZoom effectively immediately after fitBounds in some cases due to race conditions
            // But Google Maps typically handles single point bounds by zooming to max.
            // A listener is safer, but for now we trust fitBounds or adding padding.
            const listener = google.maps.event.addListenerOnce(map, "bounds_changed", () => {
                if (map.getZoom()! > 15) {
                    map.setZoom(15);
                }
            });
            return () => google.maps.event.removeListener(listener);
        }
    }, [map, branches]);

    return null;
};
