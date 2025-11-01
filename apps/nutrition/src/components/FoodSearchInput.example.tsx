/**
 * FoodSearchInput - Example Usage
 * 
 * This file demonstrates how to use the FoodSearchInput component
 * in your TheLoop nutrition app.
 */

import React, { useState } from "react";
import { FoodSearchInput } from "./FoodSearchInput";

interface Food {
  id: number;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function FoodLogForm() {
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");

  const handleFoodSelect = (food: Food) => {
    console.log("Selected food:", food);
    setSelectedFood(food);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFood || !quantity) {
      alert("Please select a food and enter a quantity");
      return;
    }

    // Calculate nutrition based on quantity
    const multiplier = parseFloat(quantity) / 100;
    const calories = Math.round(selectedFood.kcal * multiplier);
    const protein = (selectedFood.protein * multiplier).toFixed(1);
    const carbs = (selectedFood.carbs * multiplier).toFixed(1);
    const fat = (selectedFood.fat * multiplier).toFixed(1);

    console.log("Logging food:", {
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fat,
    });

    // TODO: Call your tracker_log_food Edge Function here
    // const response = await fetch('/functions/v1/tracker_log_food', { ... });

    alert(`Logged ${quantity}${unit} of ${selectedFood.name} (${calories} cal)`);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Log Food</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Food Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Food
          </label>
          <FoodSearchInput
            onSelect={handleFoodSelect}
            placeholder="e.g., chicken breast, broccoli, apple..."
          />
        </div>

        {/* Selected Food Display */}
        {selectedFood && (
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="font-semibold text-purple-900">
              {selectedFood.name}
            </div>
            <div className="text-sm text-purple-700 mt-1">
              {selectedFood.kcal} cal • P: {selectedFood.protein}g • C:{" "}
              {selectedFood.carbs}g • F: {selectedFood.fat}g (per 100g)
            </div>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 
                       focus:border-transparent shadow-sm"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 
                       focus:border-transparent shadow-sm"
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="oz">oz</option>
              <option value="lb">lb</option>
              <option value="cup">cup</option>
              <option value="tbsp">tbsp</option>
              <option value="tsp">tsp</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFood || !quantity}
          className="w-full py-3 px-6 bg-purple-600 text-white font-semibold 
                   rounded-xl hover:bg-purple-700 focus:outline-none 
                   focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 
                   disabled:bg-gray-300 disabled:cursor-not-allowed 
                   transition-colors shadow-lg"
        >
          Log Food
        </button>
      </form>
    </div>
  );
}

