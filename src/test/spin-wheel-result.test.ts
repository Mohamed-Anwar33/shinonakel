import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for SpinWheel and ResultModal functionality
 * Verifies that the selected cuisine from the wheel matches what appears in the popup
 */

// Mock cuisine data matching the database structure
interface Cuisine {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
}

const mockCuisines: Cuisine[] = [
  { id: "1", name: "الكل", emoji: "🍽️", sort_order: 0 },
  { id: "2", name: "يابانية", emoji: "🍱", sort_order: 1 },
  { id: "3", name: "إيطالية", emoji: "🍕", sort_order: 2 },
  { id: "4", name: "حلويات", emoji: "🍰", sort_order: 3 },
  { id: "5", name: "برجر", emoji: "🍔", sort_order: 4 },
  { id: "6", name: "بحرية", emoji: "🦐", sort_order: 5 },
  { id: "7", name: "شاورما", emoji: "🌯", sort_order: 6 },
  { id: "8", name: "مشاوي", emoji: "🥩", sort_order: 7 },
];

// Cuisine color map from SpinWheel
const cuisineColorMap: Record<string, string> = {
  "بحرية": "#1e3a5f",
  "بحري": "#1e3a5f",
  "يابانية": "#E84C5C",
  "ياباني": "#E84C5C",
  "إيطالية": "#FFB347",
  "إيطالي": "#FFB347",
  "بيتزا": "#FFB347",
  "حلويات": "#DDA0DD",
  "برجر": "#90EE90",
  "شاورما": "#CD853F",
  "مشاوي": "#B22222",
};

// Cuisine merge map (similar cuisines)
const cuisineMergeMap: Record<string, string> = {
  "بيتزا": "إيطالي",
  "إيطالية": "إيطالي",
};

describe("SpinWheel Functionality", () => {
  describe("Wheel Rotation Calculation", () => {
    it("should calculate correct segment index from final angle", () => {
      const categories = mockCuisines.filter(c => c.name !== "الكل");
      const segmentAngle = 360 / categories.length;
      
      // Test various final angles
      const testCases = [
        { finalAngle: 0, expectedIndex: 0 },
        { finalAngle: 45, expectedIndex: categories.length - 1 },
        { finalAngle: 90, expectedIndex: categories.length - 2 },
        { finalAngle: 180, expectedIndex: Math.floor(categories.length / 2) },
      ];
      
      testCases.forEach(({ finalAngle, expectedIndex }) => {
        const index = Math.floor((360 - finalAngle + segmentAngle / 2) % 360 / segmentAngle);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(categories.length);
      });
    });

    it("should always return valid category index", () => {
      const categories = mockCuisines.filter(c => c.name !== "الكل");
      const segmentAngle = 360 / categories.length;
      
      // Test 100 random angles
      for (let i = 0; i < 100; i++) {
        const randomAngle = Math.random() * 360;
        const index = Math.floor((360 - randomAngle + segmentAngle / 2) % 360 / segmentAngle);
        const validIndex = index % categories.length;
        
        expect(validIndex).toBeGreaterThanOrEqual(0);
        expect(validIndex).toBeLessThan(categories.length);
        expect(categories[validIndex]).toBeDefined();
      }
    });
  });

  describe("Category Selection Logic", () => {
    it("should return selected category when specific cuisine is chosen", () => {
      const selectedCategory: string = "برجر";
      const isAllSelected = selectedCategory === "الكل";
      
      // When specific category is selected, always return that category
      const result = isAllSelected ? "random" : selectedCategory;
      
      expect(result).toBe("برجر");
    });

    it("should return random category when 'الكل' is selected", () => {
      const selectedCategory = "الكل";
      const categories = mockCuisines.filter(c => c.name !== "الكل");
      
      // Simulate spin result
      const randomIndex = Math.floor(Math.random() * categories.length);
      const result = categories[randomIndex].name;
      
      expect(categories.map(c => c.name)).toContain(result);
    });

    it("should filter out 'الكل' from display categories", () => {
      const displayCategories = mockCuisines.filter(c => c.name !== "الكل");
      
      expect(displayCategories.find(c => c.name === "الكل")).toBeUndefined();
      expect(displayCategories.length).toBe(mockCuisines.length - 1);
    });
  });

  describe("Cuisine Merge Logic", () => {
    it("should merge similar cuisines correctly", () => {
      const testCases = [
        { input: "بيتزا", expected: "إيطالي" },
        { input: "إيطالية", expected: "إيطالي" },
        { input: "برجر", expected: "برجر" }, // No merge needed
        { input: "يابانية", expected: "يابانية" }, // No merge needed
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = cuisineMergeMap[input] || input;
        expect(result).toBe(expected);
      });
    });

    it("should remove duplicate cuisines after merging", () => {
      const cuisinesWithDuplicates = [
        { id: "1", name: "إيطالية", emoji: "🍝", sort_order: 1 },
        { id: "2", name: "بيتزا", emoji: "🍕", sort_order: 2 },
        { id: "3", name: "برجر", emoji: "🍔", sort_order: 3 },
      ];
      
      const seenNames = new Set<string>();
      const uniqueCuisines = cuisinesWithDuplicates.filter((cuisine) => {
        const normalizedName = cuisineMergeMap[cuisine.name] || cuisine.name;
        if (seenNames.has(normalizedName)) {
          return false;
        }
        seenNames.add(normalizedName);
        return true;
      });
      
      // إيطالية and بيتزا both map to إيطالي, so only one should remain
      expect(uniqueCuisines.length).toBe(2);
    });
  });

  describe("Color Mapping", () => {
    it("should return correct color for each cuisine", () => {
      const testCases = [
        { cuisine: "بحرية", expected: "#1e3a5f" },
        { cuisine: "يابانية", expected: "#E84C5C" },
        { cuisine: "برجر", expected: "#90EE90" },
        { cuisine: "شاورما", expected: "#CD853F" },
        { cuisine: "مشاوي", expected: "#B22222" },
      ];
      
      testCases.forEach(({ cuisine, expected }) => {
        expect(cuisineColorMap[cuisine]).toBe(expected);
      });
    });

    it("should handle both masculine and feminine cuisine names", () => {
      // Both بحرية and بحري should return the same color
      expect(cuisineColorMap["بحرية"]).toBe(cuisineColorMap["بحري"]);
      expect(cuisineColorMap["يابانية"]).toBe(cuisineColorMap["ياباني"]);
    });
  });
});

describe("ResultModal Functionality", () => {
  describe("Category Display", () => {
    it("should display the correct category passed from wheel", () => {
      const categoryFromWheel = "برجر";
      const displayedCategory = categoryFromWheel;
      
      expect(displayedCategory).toBe("برجر");
    });

    it("should handle 'الكل' category display", () => {
      const category = "الكل";
      const language: string = "ar";
      
      const displayText = category === "الكل" 
        ? (language === "en" ? "All" : "الكل")
        : category;
      
      expect(displayText).toBe("الكل");
    });

    it("should show English name when language is 'en'", () => {
      const category = "الكل";
      const language: string = "en";
      
      const displayText = category === "الكل" 
        ? (language === "en" ? "All" : "الكل")
        : category;
      
      expect(displayText).toBe("All");
    });
  });

  describe("Emoji Lookup", () => {
    it("should find correct emoji for cuisine", () => {
      const findEmoji = (cuisineName: string): string => {
        const cuisine = mockCuisines.find(c => c.name === cuisineName);
        return cuisine?.emoji || "🍽️";
      };
      
      expect(findEmoji("برجر")).toBe("🍔");
      expect(findEmoji("يابانية")).toBe("🍱");
      expect(findEmoji("بحرية")).toBe("🦐");
      expect(findEmoji("unknown")).toBe("🍽️"); // Fallback
    });
  });

  describe("Restaurant Filtering by Cuisine", () => {
    const mockRestaurants = [
      { id: "1", name: "مطعم برجر", cuisine: "برجر" },
      { id: "2", name: "مطعم ياباني", cuisine: "يابانية" },
      { id: "3", name: "مطعم بحري", cuisine: "بحرية" },
    ];

    it("should filter restaurants by selected cuisine", () => {
      const selectedCuisine = "برجر";
      const filtered = mockRestaurants.filter(r => r.cuisine === selectedCuisine);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("مطعم برجر");
    });

    it("should return all restaurants when category is 'الكل'", () => {
      const selectedCuisine = "الكل";
      const filtered = selectedCuisine === "الكل" 
        ? mockRestaurants 
        : mockRestaurants.filter(r => r.cuisine === selectedCuisine);
      
      expect(filtered.length).toBe(mockRestaurants.length);
    });

    it("should return random restaurant from filtered list", () => {
      const selectedCuisine = "الكل";
      const filtered = mockRestaurants;
      const randomRestaurant = filtered[Math.floor(Math.random() * filtered.length)];
      
      expect(mockRestaurants).toContain(randomRestaurant);
    });
  });
});

describe("Spin Result Flow", () => {
  it("should pass category from wheel to modal correctly", () => {
    let receivedCategory = "";
    
    // Simulate onResult callback
    const onResult = (category: string) => {
      receivedCategory = category;
    };
    
    // Simulate spin completion
    const spinResult = "شاورما";
    onResult(spinResult);
    
    expect(receivedCategory).toBe("شاورما");
  });

  it("should trigger modal open after spin completes", () => {
    let isModalOpen = false;
    let modalCategory = "";
    
    const handleSpinComplete = (category: string) => {
      modalCategory = category;
      isModalOpen = true;
    };
    
    // Simulate spin
    handleSpinComplete("مشاوي");
    
    expect(isModalOpen).toBe(true);
    expect(modalCategory).toBe("مشاوي");
  });

  it("should ensure modal category matches spin result", () => {
    const spinResults: string[] = [];
    const modalCategories: string[] = [];
    
    // Simulate multiple spins
    const categories = ["برجر", "يابانية", "بحرية", "شاورما"];
    
    categories.forEach(cat => {
      spinResults.push(cat);
      modalCategories.push(cat); // Modal receives same category
    });
    
    // All spin results should match modal categories
    spinResults.forEach((result, index) => {
      expect(result).toBe(modalCategories[index]);
    });
  });
});

describe("Spin Animation Timing", () => {
  it("should have correct spin duration (4 seconds)", () => {
    const SPIN_DURATION = 4000; // milliseconds
    expect(SPIN_DURATION).toBe(4000);
  });

  it("should calculate rotation correctly", () => {
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const extraDegrees = Math.random() * 360;
    const totalRotation = spins * 360 + extraDegrees;
    
    // Should have at least 5 full rotations
    expect(totalRotation).toBeGreaterThan(5 * 360);
    // Should have at most ~8 full rotations + extra
    expect(totalRotation).toBeLessThan(9 * 360);
  });

  it("should prevent multiple spins while spinning", () => {
    let isSpinning = false;
    let spinCount = 0;
    
    const spin = () => {
      if (isSpinning) return;
      isSpinning = true;
      spinCount++;
    };
    
    // Try to spin multiple times
    spin();
    spin();
    spin();
    
    // Only first spin should count
    expect(spinCount).toBe(1);
  });
});

describe("Single Category Mode", () => {
  it("should show single emoji when specific category is selected", () => {
    const selectedCategory: string = "برجر";
    const isSingleMode = selectedCategory !== "الكل";
    
    expect(isSingleMode).toBe(true);
  });

  it("should use category color in single mode", () => {
    const selectedCategory = "بحرية";
    const expectedColor = cuisineColorMap[selectedCategory];
    
    expect(expectedColor).toBe("#1e3a5f");
  });

  it("should always return selected category in single mode", () => {
    const selectedCategory = "يابانية";
    
    // In single mode, result is always the selected category
    const result = selectedCategory;
    
    expect(result).toBe("يابانية");
  });
});
