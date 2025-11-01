-- =====================================================
-- THELOOP TRACKER - SEED FOOD DATABASE
-- =====================================================
-- Insert 107 common foods with USDA nutrition data
-- =====================================================

INSERT INTO tracker_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, data_source, verified) VALUES
-- Protein sources
('Chicken Breast', 'protein', 165, 31.0, 0.0, 3.6, 0.0, 0.0, 'USDA', true),
('Salmon', 'protein', 208, 20.4, 0.0, 13.4, 0.0, 0.0, 'USDA', true),
('Tuna', 'protein', 132, 28.2, 0.0, 1.3, 0.0, 0.0, 'USDA', true),
('Eggs', 'protein', 155, 13.0, 1.1, 11.0, 0.0, 1.1, 'USDA', true),
('Greek Yogurt', 'dairy', 59, 10.2, 3.6, 0.4, 0.0, 3.2, 'USDA', true),
('Tofu', 'protein', 76, 8.0, 1.9, 4.8, 0.3, 0.7, 'USDA', true),
('Beef (lean)', 'protein', 250, 26.0, 0.0, 15.0, 0.0, 0.0, 'USDA', true),
('Pork Chop', 'protein', 231, 25.7, 0.0, 13.9, 0.0, 0.0, 'USDA', true),
('Turkey Breast', 'protein', 135, 30.0, 0.0, 0.7, 0.0, 0.0, 'USDA', true),
('Shrimp', 'protein', 99, 24.0, 0.2, 0.3, 0.0, 0.0, 'USDA', true),

-- Carbs sources
('White Rice', 'carbs', 130, 2.7, 28.2, 0.3, 0.4, 0.1, 'USDA', true),
('Brown Rice', 'carbs', 112, 2.6, 23.5, 0.9, 1.8, 0.4, 'USDA', true),
('Quinoa', 'carbs', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 'USDA', true),
('Oatmeal', 'carbs', 68, 2.4, 12.0, 1.4, 1.7, 0.3, 'USDA', true),
('Whole Wheat Bread', 'carbs', 247, 13.0, 41.0, 3.4, 7.0, 5.0, 'USDA', true),
('Pasta', 'carbs', 131, 5.0, 25.0, 1.1, 1.8, 0.6, 'USDA', true),
('Sweet Potato', 'carbs', 86, 1.6, 20.1, 0.1, 3.0, 4.2, 'USDA', true),
('Potato', 'carbs', 77, 2.0, 17.5, 0.1, 2.1, 0.8, 'USDA', true),
('Bagel', 'carbs', 257, 10.0, 50.0, 1.5, 2.0, 5.0, 'USDA', true),
('Tortilla', 'carbs', 312, 8.0, 51.0, 7.0, 3.0, 2.0, 'USDA', true),

-- Vegetables
('Broccoli', 'vegetables', 34, 2.8, 7.0, 0.4, 2.6, 1.7, 'USDA', true),
('Spinach', 'vegetables', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 'USDA', true),
('Carrots', 'vegetables', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 'USDA', true),
('Tomato', 'vegetables', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 'USDA', true),
('Cucumber', 'vegetables', 16, 0.7, 3.6, 0.1, 0.5, 1.7, 'USDA', true),
('Bell Pepper', 'vegetables', 31, 1.0, 6.0, 0.3, 2.1, 4.2, 'USDA', true),
('Lettuce', 'vegetables', 15, 1.4, 2.9, 0.2, 1.3, 0.8, 'USDA', true),
('Kale', 'vegetables', 49, 4.3, 8.8, 0.9, 3.6, 2.3, 'USDA', true),
('Cauliflower', 'vegetables', 25, 1.9, 5.0, 0.3, 2.0, 1.9, 'USDA', true),
('Zucchini', 'vegetables', 17, 1.2, 3.1, 0.3, 1.0, 2.5, 'USDA', true),

-- Fruits
('Apple', 'fruits', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 'USDA', true),
('Banana', 'fruits', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 'USDA', true),
('Orange', 'fruits', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 'USDA', true),
('Strawberries', 'fruits', 32, 0.7, 7.7, 0.3, 2.0, 4.9, 'USDA', true),
('Blueberries', 'fruits', 57, 0.7, 14.5, 0.3, 2.4, 10.0, 'USDA', true),
('Grapes', 'fruits', 69, 0.7, 18.1, 0.2, 0.9, 15.5, 'USDA', true),
('Watermelon', 'fruits', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 'USDA', true),
('Avocado', 'fruits', 160, 2.0, 8.5, 14.7, 6.7, 0.7, 'USDA', true),
('Mango', 'fruits', 60, 0.8, 15.0, 0.4, 1.6, 13.7, 'USDA', true),
('Pineapple', 'fruits', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 'USDA', true),

-- Dairy
('Milk (whole)', 'dairy', 61, 3.2, 4.8, 3.3, 0.0, 5.1, 'USDA', true),
('Milk (skim)', 'dairy', 34, 3.4, 5.0, 0.1, 0.0, 5.0, 'USDA', true),
('Cheddar Cheese', 'dairy', 403, 25.0, 1.3, 33.0, 0.0, 0.5, 'USDA', true),
('Cottage Cheese', 'dairy', 98, 11.1, 3.4, 4.3, 0.0, 2.7, 'USDA', true),
('Yogurt', 'dairy', 59, 3.5, 4.7, 3.3, 0.0, 4.7, 'USDA', true),

-- Fats & Oils
('Olive Oil', 'fats', 884, 0.0, 0.0, 100.0, 0.0, 0.0, 'USDA', true),
('Butter', 'fats', 717, 0.9, 0.1, 81.0, 0.0, 0.1, 'USDA', true),
('Peanut Butter', 'fats', 588, 25.0, 20.0, 50.0, 6.0, 9.0, 'USDA', true),
('Almonds', 'fats', 579, 21.0, 22.0, 49.0, 12.0, 4.0, 'USDA', true),
('Walnuts', 'fats', 654, 15.0, 14.0, 65.0, 7.0, 2.6, 'USDA', true),

-- Snacks
('Potato Chips', 'snacks', 536, 6.6, 53.0, 34.0, 4.5, 0.4, 'USDA', true),
('Popcorn', 'snacks', 375, 12.0, 74.0, 4.5, 15.0, 0.6, 'USDA', true),
('Pretzels', 'snacks', 380, 10.0, 80.0, 3.0, 3.0, 2.0, 'USDA', true),
('Granola Bar', 'snacks', 471, 10.0, 64.0, 20.0, 6.0, 25.0, 'USDA', true),
('Dark Chocolate', 'snacks', 546, 5.0, 61.0, 31.0, 7.0, 48.0, 'USDA', true),

-- Beverages
('Coffee (black)', 'beverages', 2, 0.3, 0.0, 0.0, 0.0, 0.0, 'USDA', true),
('Tea (unsweetened)', 'beverages', 1, 0.0, 0.3, 0.0, 0.0, 0.0, 'USDA', true),
('Orange Juice', 'beverages', 45, 0.7, 10.4, 0.2, 0.2, 8.4, 'USDA', true),
('Soda', 'beverages', 41, 0.0, 10.6, 0.0, 0.0, 10.6, 'USDA', true),
('Protein Shake', 'beverages', 80, 15.0, 5.0, 1.0, 0.0, 3.0, 'USDA', true),

-- Additional common foods
('Pizza', 'other', 266, 11.0, 33.0, 10.0, 2.0, 4.0, 'USDA', true),
('Burger', 'other', 295, 17.0, 24.0, 14.0, 1.0, 5.0, 'USDA', true),
('French Fries', 'snacks', 312, 3.4, 41.0, 15.0, 3.8, 0.2, 'USDA', true),
('Caesar Salad', 'vegetables', 190, 8.0, 10.0, 14.0, 2.0, 2.0, 'USDA', true),
('Sushi Roll', 'other', 150, 6.0, 24.0, 3.0, 1.0, 3.0, 'USDA', true),
('Burrito', 'other', 206, 10.0, 25.0, 7.0, 3.0, 2.0, 'USDA', true),
('Pancakes', 'carbs', 227, 6.0, 28.0, 10.0, 1.0, 6.0, 'USDA', true),
('Waffles', 'carbs', 291, 7.0, 37.0, 13.0, 1.0, 10.0, 'USDA', true),
('Cereal', 'carbs', 379, 8.0, 84.0, 2.0, 3.0, 24.0, 'USDA', true),
('Ice Cream', 'snacks', 207, 3.5, 24.0, 11.0, 0.7, 21.0, 'USDA', true),
('Cookies', 'snacks', 502, 5.0, 65.0, 24.0, 2.0, 36.0, 'USDA', true),
('Cake', 'snacks', 257, 3.0, 42.0, 9.0, 1.0, 28.0, 'USDA', true),
('Donut', 'snacks', 452, 5.0, 51.0, 25.0, 1.0, 26.0, 'USDA', true),
('Muffin', 'snacks', 377, 6.0, 51.0, 16.0, 2.0, 28.0, 'USDA', true),
('Smoothie', 'beverages', 66, 1.0, 16.0, 0.2, 1.5, 13.0, 'USDA', true),
('Hummus', 'other', 166, 8.0, 14.0, 10.0, 6.0, 0.3, 'USDA', true),
('Guacamole', 'other', 160, 2.0, 9.0, 15.0, 7.0, 0.7, 'USDA', true),
('Salsa', 'other', 36, 1.5, 8.0, 0.2, 2.0, 4.0, 'USDA', true),
('Ranch Dressing', 'other', 458, 1.0, 6.0, 48.0, 0.0, 3.0, 'USDA', true),
('BBQ Sauce', 'other', 172, 1.0, 41.0, 0.5, 1.0, 33.0, 'USDA', true),
('Ketchup', 'other', 112, 1.0, 27.0, 0.1, 0.3, 22.0, 'USDA', true),
('Mayonnaise', 'fats', 680, 1.0, 0.6, 75.0, 0.0, 0.3, 'USDA', true),
('Mustard', 'other', 66, 4.0, 6.0, 4.0, 2.0, 1.0, 'USDA', true),
('Honey', 'other', 304, 0.3, 82.0, 0.0, 0.2, 82.0, 'USDA', true),
('Maple Syrup', 'other', 260, 0.0, 67.0, 0.2, 0.0, 60.0, 'USDA', true),
('Jam', 'other', 278, 0.4, 69.0, 0.1, 1.0, 49.0, 'USDA', true),
('Peanuts', 'fats', 567, 26.0, 16.0, 49.0, 9.0, 4.0, 'USDA', true),
('Cashews', 'fats', 553, 18.0, 30.0, 44.0, 3.0, 6.0, 'USDA', true),
('Pistachios', 'fats', 560, 20.0, 28.0, 45.0, 10.0, 8.0, 'USDA', true),
('Sunflower Seeds', 'fats', 584, 21.0, 20.0, 51.0, 9.0, 3.0, 'USDA', true),
('Chia Seeds', 'fats', 486, 17.0, 42.0, 31.0, 34.0, 0.0, 'USDA', true),
('Flax Seeds', 'fats', 534, 18.0, 29.0, 42.0, 27.0, 2.0, 'USDA', true),
('Protein Bar', 'snacks', 400, 20.0, 40.0, 15.0, 5.0, 20.0, 'USDA', true),
('Energy Drink', 'beverages', 45, 0.0, 11.0, 0.0, 0.0, 11.0, 'USDA', true),
('Sports Drink', 'beverages', 25, 0.0, 6.0, 0.0, 0.0, 6.0, 'USDA', true),
('Coconut Water', 'beverages', 19, 0.7, 3.7, 0.2, 1.1, 2.6, 'USDA', true),
('Almond Milk', 'beverages', 17, 0.6, 0.6, 1.2, 0.4, 0.0, 'USDA', true),
('Soy Milk', 'beverages', 33, 2.9, 1.7, 1.6, 0.4, 1.0, 'USDA', true),
('Oat Milk', 'beverages', 47, 1.0, 7.6, 1.5, 0.8, 4.5, 'USDA', true),
('Bacon', 'protein', 541, 37.0, 1.4, 42.0, 0.0, 0.0, 'USDA', true),
('Sausage', 'protein', 346, 13.0, 1.0, 32.0, 0.0, 0.0, 'USDA', true),
('Ham', 'protein', 145, 21.0, 1.5, 5.5, 0.0, 0.0, 'USDA', true),
('Hot Dog', 'protein', 290, 10.0, 2.0, 26.0, 0.0, 1.0, 'USDA', true),
('Pepperoni', 'protein', 494, 20.0, 4.0, 44.0, 0.0, 1.0, 'USDA', true),
('Salami', 'protein', 336, 22.0, 1.0, 27.0, 0.0, 0.0, 'USDA', true),
('Lamb', 'protein', 294, 25.0, 0.0, 21.0, 0.0, 0.0, 'USDA', true),
('Duck', 'protein', 337, 19.0, 0.0, 28.0, 0.0, 0.0, 'USDA', true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Seeded 107 foods into tracker_foods table!';
END $$;

