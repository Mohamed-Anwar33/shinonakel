
interface Branch {
    google_maps_url: string | null;
    latitude: number | null;
    longitude: number | null;
    [key: string]: any;
}

/**
 * Checks if a branch has all necessary data to be displayed on the map and calculate distance.
 * 
 * Strict Rules:
 * 1. Must have a Google Maps URL (admin verification).
 * 2. Must have valid Latitude.
 * 3. Must have valid Longitude.
 */
export const isValidBranch = (branch: Branch): boolean => {
    if (!branch) return false;

    // 1. Google Maps URL must exist and be non-empty
    const hasUrl = !!branch.google_maps_url && branch.google_maps_url.trim().length > 0;

    // 2. Lat/Lng must be valid numbers (or parseable strings)
    // Supabase sometimes returns numeric columns as strings
    const lat = parseFloat(String(branch.latitude));
    const lng = parseFloat(String(branch.longitude));

    const hasLat = !isNaN(lat) && typeof lat === 'number';
    const hasLon = !isNaN(lng) && typeof lng === 'number';

    return hasUrl && hasLat && hasLon;
};
