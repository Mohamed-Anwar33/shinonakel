import { describe, it, expect, vi } from "vitest";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: "1", ad_id: "ad-1", interaction_type: "view", created_at: "2026-01-20T10:00:00Z", user_id: "user-1" },
            { id: "2", ad_id: "ad-1", interaction_type: "view", created_at: "2026-01-20T14:00:00Z", user_id: "user-2" },
            { id: "3", ad_id: "ad-1", interaction_type: "click", created_at: "2026-01-20T14:30:00Z", user_id: "user-2" },
            { id: "4", ad_id: "ad-1", interaction_type: "view", created_at: "2026-01-21T09:00:00Z", user_id: "user-3" },
            { id: "5", ad_id: "ad-1", interaction_type: "click", created_at: "2026-01-21T09:15:00Z", user_id: "user-3" },
          ],
          error: null,
        })),
      })),
    })),
  },
}));

describe("Ad Report Calculations", () => {
  it("should calculate CTR correctly", () => {
    const totalViews = 100;
    const totalClicks = 25;
    const ctr = ((totalClicks / totalViews) * 100).toFixed(2);
    expect(ctr).toBe("25.00");
  });

  it("should handle zero views for CTR calculation", () => {
    const totalViews = 0;
    const totalClicks = 0;
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0.00";
    expect(ctr).toBe("0.00");
  });

  it("should correctly identify placement types", () => {
    const getPlacementLabel = (placement: string) => {
      if (placement === "weekly_picks") return "اختيارات الأسبوع";
      if (placement === "spin_popup_all") return "إعلان مثبت (الكل)";
      if (placement.startsWith("spin_popup_cuisine_")) {
        return `إعلان مثبت (${placement.replace("spin_popup_cuisine_", "")})`;
      }
      if (placement === "spin_popup") return "إعلان مثبت";
      return placement;
    };

    expect(getPlacementLabel("weekly_picks")).toBe("اختيارات الأسبوع");
    expect(getPlacementLabel("spin_popup_all")).toBe("إعلان مثبت (الكل)");
    expect(getPlacementLabel("spin_popup_cuisine_برجر")).toBe("إعلان مثبت (برجر)");
    expect(getPlacementLabel("spin_popup")).toBe("إعلان مثبت");
  });

  it("should correctly categorize hourly data", () => {
    const interactions = [
      { created_at: "2026-01-20T10:30:00Z", interaction_type: "view" },
      { created_at: "2026-01-20T10:45:00Z", interaction_type: "view" },
      { created_at: "2026-01-20T14:00:00Z", interaction_type: "click" },
      { created_at: "2026-01-20T22:30:00Z", interaction_type: "view" },
    ];

    const hourlyMap: { [key: string]: { views: number; clicks: number } } = {};
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      hourlyMap[hour] = { views: 0, clicks: 0 };
    }

    interactions.forEach(i => {
      const hour = new Date(i.created_at).getUTCHours().toString().padStart(2, '0');
      if (i.interaction_type === "view") {
        hourlyMap[hour].views++;
      } else if (i.interaction_type === "click") {
        hourlyMap[hour].clicks++;
      }
    });

    expect(hourlyMap["10"].views).toBe(2);
    expect(hourlyMap["14"].clicks).toBe(1);
    expect(hourlyMap["22"].views).toBe(1);
  });

  it("should correctly categorize daily data", () => {
    const interactions = [
      { created_at: "2026-01-20T10:00:00Z", interaction_type: "view" },
      { created_at: "2026-01-20T14:00:00Z", interaction_type: "view" },
      { created_at: "2026-01-20T14:30:00Z", interaction_type: "click" },
      { created_at: "2026-01-21T09:00:00Z", interaction_type: "view" },
      { created_at: "2026-01-21T09:15:00Z", interaction_type: "click" },
    ];

    const dailyMap: { [key: string]: { views: number; clicks: number } } = {};

    interactions.forEach(interaction => {
      const date = interaction.created_at.split("T")[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { views: 0, clicks: 0 };
      }
      if (interaction.interaction_type === "view") {
        dailyMap[date].views++;
      } else if (interaction.interaction_type === "click") {
        dailyMap[date].clicks++;
      }
    });

    expect(dailyMap["2026-01-20"].views).toBe(2);
    expect(dailyMap["2026-01-20"].clicks).toBe(1);
    expect(dailyMap["2026-01-21"].views).toBe(1);
    expect(dailyMap["2026-01-21"].clicks).toBe(1);
  });

  it("should identify all vs cuisine placements correctly", () => {
    const testCases = [
      { placement: "spin_popup_all", isAll: true, isCuisine: false },
      { placement: "weekly_picks", isAll: true, isCuisine: false },
      { placement: "spin_popup_cuisine_برجر", isAll: false, isCuisine: true },
      { placement: "spin_popup_cuisine_بيتزا", isAll: false, isCuisine: true },
      { placement: "spin_popup", isAll: false, isCuisine: false },
    ];

    testCases.forEach(({ placement, isAll, isCuisine }) => {
      const isAllPlacement = placement === "spin_popup_all" || placement === "weekly_picks";
      const isCuisinePlacement = placement.startsWith("spin_popup_cuisine_");
      
      expect(isAllPlacement).toBe(isAll);
      expect(isCuisinePlacement).toBe(isCuisine);
    });
  });
});
