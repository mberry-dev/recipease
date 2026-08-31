-- recipes_schema.sql
-- Database schema for Recipe Manager Application
-- CIS 435 Final Project

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    prep_time INTEGER DEFAULT 0,
    cook_time INTEGER DEFAULT 0,
    servings INTEGER DEFAULT 4,
    category TEXT DEFAULT 'dinner',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (title <> ''),
    CHECK (servings > 0),
    CHECK (prep_time >= 0),
    CHECK (cook_time >= 0)
);

-- Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    day TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    
    -- Unique constraint to prevent duplicate meal slots
    UNIQUE(week_start, day, meal_type),
    
    -- Check constraints
    CHECK (week_start <> ''),
    CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans(week_start);
CREATE INDEX IF NOT EXISTS idx_meal_plans_day ON meal_plans(day);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_type ON meal_plans(meal_type);

-- Sample Data for Demonstration
INSERT OR IGNORE INTO recipes (title, description, ingredients, instructions, prep_time, cook_time, servings, category) VALUES
('Spaghetti Carbonara', 'Classic Italian pasta dish with eggs, cheese, and pancetta', 
 '["1 lb spaghetti", "4 large eggs", "1 cup grated Pecorino Romano cheese", "8 oz pancetta or bacon, diced", "2 cloves garlic, minced", "1/2 tsp black pepper", "Salt to taste", "Fresh parsley for garnish"]',
 '["Bring a large pot of salted water to boil", "Cook spaghetti according to package directions until al dente", "While pasta cooks, whisk eggs with grated cheese and black pepper in a bowl", "In a large skillet, cook pancetta until crispy, about 5-7 minutes", "Add garlic and cook for 1 minute until fragrant", "Reserve 1 cup of pasta water, then drain spaghetti", "Add hot pasta to skillet with pancetta, remove from heat", "Quickly stir in egg mixture, adding pasta water as needed to create creamy sauce", "Serve immediately with extra cheese and parsley garnish"]',
 15, 20, 4, 'dinner'),

('Greek Salad', 'Fresh Mediterranean salad with vegetables, feta, and olives', 
 '["2 large cucumbers, chopped", "4 ripe tomatoes, chopped", "1 red onion, thinly sliced", "1 green bell pepper, chopped", "200g feta cheese, cubed", "1 cup Kalamata olives", "1/4 cup extra virgin olive oil", "2 tbsp red wine vinegar", "1 tsp dried oregano", "Salt and pepper to taste"]',
 '["In a large bowl, combine cucumbers, tomatoes, red onion, and bell pepper", "Add feta cheese and olives", "In a small bowl, whisk together olive oil, red wine vinegar, oregano, salt, and pepper", "Pour dressing over salad and toss gently to combine", "Let sit for 10 minutes before serving to allow flavors to meld"]',
 20, 0, 4, 'lunch'),

('Blueberry Pancakes', 'Fluffy breakfast pancakes with fresh blueberries', 
 '["1 1/2 cups all-purpose flour", "3 1/2 tsp baking powder", "1 tsp salt", "1 tbsp white sugar", "1 1/4 cups milk", "1 egg", "3 tbsp melted butter", "1 cup fresh blueberries", "Butter for cooking", "Maple syrup for serving"]',
 '["In a large bowl, sift together flour, baking powder, salt, and sugar", "In another bowl, beat together milk, egg, and melted butter", "Pour wet ingredients into dry ingredients and mix until just combined (small lumps are OK)", "Gently fold in blueberries", "Heat a lightly buttered griddle or frying pan over medium-high heat", "Pour 1/4 cup batter for each pancake", "Cook until bubbles form on the surface, about 2-3 minutes", "Flip and cook until browned on the other side", "Serve hot with butter and maple syrup"]',
 15, 10, 4, 'breakfast'),

('Chicken Stir Fry', 'Quick and healthy Asian-style stir fry with vegetables', 
 '["2 chicken breasts, thinly sliced", "1 red bell pepper, sliced", "1 yellow bell pepper, sliced", "1 onion, sliced", "2 carrots, julienned", "1 cup broccoli florets", "3 tbsp soy sauce", "2 tbsp oyster sauce", "1 tbsp honey", "2 cloves garlic, minced", "1 tbsp fresh ginger, minced", "2 tbsp vegetable oil", "2 green onions, chopped for garnish", "Sesame seeds for garnish"]',
 '["In a small bowl, mix soy sauce, oyster sauce, and honey", "Heat 1 tbsp oil in a wok or large skillet over high heat", "Add chicken and stir fry until cooked through, about 5-6 minutes", "Remove chicken from pan", "Add remaining oil, then stir fry garlic and ginger for 30 seconds", "Add vegetables and stir fry for 4-5 minutes until crisp-tender", "Return chicken to pan", "Pour sauce over everything and stir to coat", "Cook for 1-2 minutes until heated through", "Garnish with green onions and sesame seeds"]',
 20, 15, 4, 'dinner'),

('Chocolate Chip Cookies', 'Classic chewy chocolate chip cookies', 
 '["2 1/4 cups all-purpose flour", "1 tsp baking soda", "1 tsp salt", "1 cup unsalted butter, softened", "3/4 cup granulated sugar", "3/4 cup brown sugar", "2 large eggs", "2 tsp vanilla extract", "2 cups semisweet chocolate chips", "1 cup chopped walnuts (optional)"]',
 '["Preheat oven to 375°F (190°C)", "In a small bowl, whisk together flour, baking soda, and salt", "In a large bowl, cream together butter, granulated sugar, and brown sugar until smooth", "Beat in eggs one at a time, then stir in vanilla", "Gradually blend in flour mixture", "Stir in chocolate chips and walnuts (if using)", "Drop by rounded tablespoon onto ungreased baking sheets", "Bake for 9-11 minutes until edges are golden brown", "Cool on baking sheets for 2 minutes before transferring to wire racks"]',
 20, 10, 24, 'dessert');

-- Sample Meal Plan Data
INSERT OR IGNORE INTO meal_plans (week_start, day, meal_type, recipe_id, notes) VALUES
('2024-01-01', 'Monday', 'Dinner', 1, 'Family dinner night'),
('2024-01-01', 'Tuesday', 'Lunch', 2, 'Make extra for leftovers'),
('2024-01-01', 'Sunday', 'Breakfast', 3, 'Weekend treat'),
('2024-01-01', 'Wednesday', 'Dinner', 4, 'Quick weeknight meal'),
('2024-01-01', 'Saturday', 'Dessert', 5, 'Baking day');

-- Verify data insertion
SELECT 'Database initialized successfully!' as message;
SELECT COUNT(*) as total_recipes FROM recipes;
SELECT COUNT(*) as total_meal_plans FROM meal_plans;