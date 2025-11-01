/**
 * FoodSearchInput - Autocomplete component for food search
 * 
 * Features:
 * - Debounced fuzzy search (150ms)
 * - Top 5 results with calories
 * - Highlighted matched substrings
 * - Keyboard navigation (↑ ↓ Enter Esc)
 * - TheLoop design system (rounded-xl, neon accent, subtle shadow)
 * - Client-side caching (60s TTL)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

interface Food {
  id: number;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodSearchInputProps {
  onSelect: (food: Food) => void;
  placeholder?: string;
  className?: string;
}

// Client-side cache with 60s TTL
const searchCache = new Map<string, { results: Food[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export function FoodSearchInput({
  onSelect,
  placeholder = "Search for food...",
  className = "",
}: FoodSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Debounced search function
  const searchFoods = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Check cache first
    const cached = searchCache.get(searchQuery.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Cache hit: ${searchQuery}`);
      setResults(cached.results);
      setIsOpen(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/food_search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ query: searchQuery, limit: 5 }),
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      const foods: Food[] = data.results || [];

      // Cache the results
      searchCache.set(searchQuery.toLowerCase(), {
        results: foods,
        timestamp: Date.now(),
      });

      setResults(foods);
      setIsOpen(true);
    } catch (error) {
      console.error("Food search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = window.setTimeout(() => {
      searchFoods(value);
    }, 150);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle food selection
  const handleSelect = (food: Food) => {
    setQuery(food.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(food);
  };

  // Highlight matched substring
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 text-gray-900">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 
                     focus:outline-none focus:ring-2 focus:ring-purple-500 
                     focus:border-transparent shadow-sm transition-all
                     placeholder-gray-400 text-gray-900"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg 
                     border border-gray-200 max-h-80 overflow-y-auto"
        >
          {results.map((food, index) => (
            <button
              key={food.id}
              onClick={() => handleSelect(food)}
              className={`w-full px-4 py-3 text-left hover:bg-purple-50 
                         transition-colors flex items-center justify-between
                         ${index === selectedIndex ? "bg-purple-100" : ""}
                         ${index === 0 ? "rounded-t-xl" : ""}
                         ${index === results.length - 1 ? "rounded-b-xl" : ""}
                         border-b border-gray-100 last:border-b-0`}
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {highlightMatch(food.name, query)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="font-semibold text-purple-600">
                  {food.kcal} cal
                </div>
                <div className="text-xs text-gray-400">per 100g</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && !isLoading && query && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg 
                       border border-gray-200 px-4 py-3 text-gray-500 text-center">
          No foods found for "{query}"
        </div>
      )}
    </div>
  );
}

