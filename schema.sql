-- schema.sql
-- Database schema for Recipease. Loaded automatically when the server starts.

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

    CHECK (title <> ''),
    CHECK (servings > 0),
    CHECK (prep_time >= 0),
    CHECK (cook_time >= 0)
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    day TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Deleting a recipe empties its meal slots instead of leaving dangling ids
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,

    -- One recipe per slot
    UNIQUE (week_start, day, meal_type),

    CHECK (week_start <> ''),
    CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack'))
);

CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans(week_start);
