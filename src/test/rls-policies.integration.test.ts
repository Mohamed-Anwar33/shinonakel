import { describe, it, expect, beforeAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * Integration tests for Row-Level Security (RLS) policies
 * These tests verify that RLS policies are correctly configured
 * by making real database queries
 */
describe("RLS Policies Integration Tests", () => {
  describe("Profiles Table RLS", () => {
    it("should allow reading public profiles (is_private = false)", async () => {
      // Query profiles where is_private = false
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, is_private")
        .eq("is_private", false)
        .limit(5);

      // Should not error - public profiles are readable
      expect(error).toBeNull();
      
      // If there are results, all should be public
      if (data && data.length > 0) {
        data.forEach(profile => {
          expect(profile.is_private).toBe(false);
        });
      }
    });

    it("should return profiles with required fields", async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_private")
        .eq("is_private", false)
        .limit(1);

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const profile = data[0];
        expect(profile).toHaveProperty("id");
        expect(profile).toHaveProperty("username");
        expect(profile).toHaveProperty("is_private");
      }
    });
  });

  describe("Saved Restaurants Table RLS", () => {
    it("should respect can_view_restaurants function for public profiles", async () => {
      // First get a public profile
      const { data: publicProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("is_private", false)
        .limit(1);

      if (publicProfiles && publicProfiles.length > 0) {
        const publicUserId = publicProfiles[0].id;

        // Try to fetch their saved restaurants
        const { data: restaurants, error } = await supabase
          .from("saved_restaurants")
          .select("id, name, category")
          .eq("user_id", publicUserId)
          .limit(5);

        // Should not error for public profile's restaurants
        expect(error).toBeNull();
      }
    });

    it("should return saved restaurants with correct schema", async () => {
      // Get any accessible saved restaurants
      const { data, error } = await supabase
        .from("saved_restaurants")
        .select("id, name, category, rating, image_url, user_id")
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const restaurant = data[0];
        expect(restaurant).toHaveProperty("id");
        expect(restaurant).toHaveProperty("name");
        expect(restaurant).toHaveProperty("user_id");
      }
    });
  });

  describe("Restaurants Table RLS (Public Access)", () => {
    it("should allow anyone to view restaurants", async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, cuisine")
        .limit(5);

      // Restaurants table should be publicly readable
      expect(error).toBeNull();
    });

    it("should return restaurant data with all fields", async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, cuisine, image_url, phone, website")
        .limit(1);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        const restaurant = data[0];
        expect(restaurant).toHaveProperty("id");
        expect(restaurant).toHaveProperty("name");
        expect(restaurant).toHaveProperty("cuisine");
      }
    });
  });

  describe("Restaurant Branches Table RLS (Public Access)", () => {
    it("should allow anyone to view branches", async () => {
      const { data, error } = await supabase
        .from("restaurant_branches")
        .select("id, restaurant_id, latitude, longitude, address")
        .limit(5);

      expect(error).toBeNull();
    });
  });

  describe("Restaurant Delivery Apps Table RLS (Public Access)", () => {
    it("should allow anyone to view delivery apps", async () => {
      const { data, error } = await supabase
        .from("restaurant_delivery_apps")
        .select("id, restaurant_id, app_name, app_url")
        .limit(5);

      expect(error).toBeNull();
    });
  });

  describe("Cuisines Table RLS", () => {
    it("should allow viewing active cuisines", async () => {
      const { data, error } = await supabase
        .from("cuisines")
        .select("id, name, emoji, name_en")
        .eq("is_active", true)
        .limit(10);

      expect(error).toBeNull();

      if (data && data.length > 0) {
        data.forEach(cuisine => {
          expect(cuisine).toHaveProperty("name");
          expect(cuisine).toHaveProperty("emoji");
        });
      }
    });
  });

  describe("Friendships Table RLS", () => {
    it("should not expose friendships to unauthenticated users", async () => {
      // Without auth, friendships should return empty or error
      const { data, error } = await supabase
        .from("friendships")
        .select("id")
        .limit(1);

      // Either returns empty data or no error (RLS filters out all rows)
      if (data) {
        expect(data.length).toBe(0);
      }
    });
  });

  describe("Restaurant Ratings Table RLS (Public Read)", () => {
    it("should allow anyone to view ratings", async () => {
      const { data, error } = await supabase
        .from("restaurant_ratings")
        .select("id, restaurant_id, rating, comment")
        .limit(5);

      expect(error).toBeNull();
    });
  });

  describe("Database Functions", () => {
    it("should be able to call get_restaurant_avg_rating function", async () => {
      // First get a restaurant id
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id")
        .limit(1);

      if (restaurants && restaurants.length > 0) {
        const { data, error } = await supabase.rpc("get_restaurant_avg_rating", {
          restaurant_uuid: restaurants[0].id,
        });

        expect(error).toBeNull();
        // Should return a number (rating) or 0
        expect(typeof data).toBe("number");
      }
    });

    it("should be able to call get_restaurant_rating_count function", async () => {
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id")
        .limit(1);

      if (restaurants && restaurants.length > 0) {
        const { data, error } = await supabase.rpc("get_restaurant_rating_count", {
          restaurant_uuid: restaurants[0].id,
        });

        expect(error).toBeNull();
        expect(typeof data).toBe("number");
      }
    });
  });

  describe("Advertisements Table RLS", () => {
    it("should allow viewing active advertisements", async () => {
      const { data, error } = await supabase
        .from("advertisements")
        .select("id, restaurant_id, placement, is_active")
        .eq("is_active", true)
        .limit(5);

      // Should not error for active ads within date range
      expect(error).toBeNull();
    });
  });

  describe("Profile Query by Username", () => {
    it("should find public profile by username", async () => {
      // Get any public profile
      const { data: profiles } = await supabase
        .from("profiles")
        .select("username")
        .eq("is_private", false)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const username = profiles[0].username;

        // Now query by username (as the app does)
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_private")
          .eq("username", username)
          .maybeSingle();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.username).toBe(username);
      }
    });
  });

  describe("can_view_restaurants Function", () => {
    it("should allow viewing restaurants for public profiles", async () => {
      // Get a public profile
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_private", false)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const ownerId = profiles[0].id;

        // The can_view_restaurants function should return true for public profiles
        const { data, error } = await supabase.rpc("can_view_restaurants", {
          owner_id: ownerId,
        });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });
  });
});
