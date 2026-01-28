// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract coordinates from various Google Maps URL formats
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Pattern 1: !3d and !4d in URL (data parameter) - MOST ACCURATE for Place URLs
    // Example: ...!3d29.3759!4d47.9774...
    const dataPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
    const dataMatch = url.match(dataPattern);
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
    }

    // Pattern 2: @lat,lng in URL (viewport center, less accurate for Place URLs)
    // Example: https://www.google.com/maps/place/.../@29.3759,47.9774,17z/...
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const atMatch = url.match(atPattern);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 3: ll= or q= parameter
    // Example: https://maps.google.com/?ll=29.3759,47.9774
    const llPattern = /[?&](?:ll|q)=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const llMatch = url.match(llPattern);
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }

    // Pattern 4: place/ followed by coordinates
    // Example: /place/29.3759,47.9774/
    const placePattern = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const placeMatch = url.match(placePattern);
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    }

    return null;
  } catch {
    return null;
  }
}

// Validate coordinates are within valid range
function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mapsUrl } = await req.json();

    if (!mapsUrl || typeof mapsUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'mapsUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalUrl = mapsUrl;

    // If it's a shortened URL, follow redirects to get the full URL
    if (mapsUrl.includes('maps.app.goo.gl') || mapsUrl.includes('goo.gl/maps')) {
      try {
        const response = await fetch(mapsUrl, {
          method: 'HEAD',
          redirect: 'follow',
        });
        finalUrl = response.url;
        console.log('Resolved shortened URL to:', finalUrl);
      } catch (fetchError) {
        console.error('Error following redirect:', fetchError);
        // Try with GET request as fallback
        try {
          const response = await fetch(mapsUrl, {
            method: 'GET',
            redirect: 'follow',
          });
          finalUrl = response.url;
          await response.text(); // Consume body
          console.log('Resolved with GET to:', finalUrl);
        } catch {
          console.error('Fallback GET also failed');
        }
      }
    }

    // Extract coordinates from the final URL
    const coords = extractCoordsFromUrl(finalUrl);

    if (coords && isValidCoordinate(coords.lat, coords.lng)) {
      console.log('Extracted coordinates:', coords);
      return new Response(
        JSON.stringify({
          success: true,
          latitude: coords.lat,
          longitude: coords.lng,
          resolvedUrl: finalUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If extraction failed, return error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Could not extract coordinates from URL',
        resolvedUrl: finalUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
