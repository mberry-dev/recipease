const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 5000;

// ============ MIDDLEWARE ============
// Add CORS support (FIXED for DELETE)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Allow JSON data
app.use(express.json());

// ============ DATABASE SETUP ============
const db = new sqlite3.Database('./recipes.db');

// Recipes Table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        prep_time INTEGER DEFAULT 0,
        cook_time INTEGER DEFAULT 0,
        servings INTEGER DEFAULT 4,
        category TEXT DEFAULT 'dinner',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create meal_plans table
    db.run(`CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        day TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        recipe_id INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    )`);
    
    // Add sample recipes if table is empty
    db.get('SELECT COUNT(*) as count FROM recipes', (err, row) => {
        if (row.count === 0) {
            console.log('Adding sample recipes to database...');
            
            const sampleRecipes = [
                ['Spaghetti Carbonara', 'Classic Italian pasta with eggs and bacon', 
                 '["1 lb spaghetti", "4 large eggs", "1 cup grated Pecorino Romano", "8 oz pancetta or bacon", "2 cloves garlic", "Black pepper", "Salt"]',
                 '["Bring large pot of salted water to boil", "Cook spaghetti according to package directions", "While pasta cooks, chop pancetta into small pieces", "In a bowl, whisk eggs with grated cheese and black pepper", "In a large pan, cook pancetta until crispy", "Drain pasta, reserving 1 cup pasta water", "Add hot pasta to pan with pancetta", "Remove from heat, quickly stir in egg mixture", "Add pasta water as needed to create creamy sauce", "Serve immediately with extra cheese"]',
                 15, 20, 4, 'dinner'],
                
                ['Chicken Stir Fry', 'Quick and healthy Asian-style stir fry',
                 '["2 chicken breasts", "1 red bell pepper", "1 yellow bell pepper", "1 onion", "2 carrots", "3 tbsp soy sauce", "2 tbsp oyster sauce", "1 tbsp honey", "2 cloves garlic", "1 tbsp ginger", "2 tbsp vegetable oil", "Green onions for garnish"]',
                 '["Slice chicken into thin strips", "Chop vegetables into bite-sized pieces", "Mix soy sauce, oyster sauce, and honey in a bowl", "Heat oil in wok or large pan", "Stir fry chicken until cooked through (5-6 minutes)", "Remove chicken, add more oil if needed", "Stir fry garlic and ginger for 30 seconds", "Add vegetables, stir fry for 4-5 minutes until crisp-tender", "Return chicken to pan", "Add sauce, stir to coat everything", "Cook for 1-2 minutes until heated through", "Garnish with chopped green onions"]',
                 20, 15, 4, 'dinner'],
                
                ['Banana Pancakes', 'Fluffy pancakes with ripe bananas',
                 '["2 ripe bananas", "2 eggs", "1 cup flour", "1 cup milk", "2 tbsp sugar", "2 tsp baking powder", "1/2 tsp salt", "1 tsp vanilla extract", "Butter for cooking", "Maple syrup for serving"]',
                 '["Mash bananas in a large bowl", "Add eggs and milk, mix well", "Add flour, sugar, baking powder, salt, and vanilla", "Mix until just combined (small lumps are OK)", "Heat griddle or pan over medium heat", "Melt small amount of butter", "Pour 1/4 cup batter for each pancake", "Cook until bubbles form on surface (2-3 minutes)", "Flip and cook other side until golden brown", "Serve warm with maple syrup"]',
                 10, 15, 4, 'breakfast']
            ];
            
            sampleRecipes.forEach(recipe => {
                db.run(`INSERT INTO recipes (title, description, ingredients, instructions, prep_time, cook_time, servings, category) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, recipe);
            });
            console.log('✅ Added 3 sample recipes to database!');
        } else {
            console.log(`✅ Database has ${row.count} recipes`);
        }
    });
});

// ============ API ROUTES ============

// Home page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recipease Backend</title>
            <style>
                body { font-family: Arial; padding: 40px; background: #f0f0f0; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                h1 { color: #4CAF50; }
                .link { display: inline-block; margin: 10px; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🍳 Recipease Backend API</h1>
                <p>✅ Database-backed API is running!</p>
                <p>📊 SQLite database: recipes.db</p>
                <p>📅 ${new Date().toLocaleString()}</p>
                <div>
                    <a href="/api/health" class="link">Health Check</a>
                    <a href="/api/test" class="link">Test API</a>
                    <a href="/api/recipes" class="link">All Recipes (JSON)</a>
                </div>
                <p style="margin-top: 30px; color: #666;">
                    Go to <strong>frontend/index.html</strong> to use the Recipe Manager application.
                </p>
            </div>
        </body>
        </html>
    `);
});

// Health check
app.get('/api/health', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM recipes', (err, row) => {
        res.json({ 
            status: 'healthy',
            service: 'Recipease API',
            version: '1.0.0',
            uptime: process.uptime(),
            database: 'SQLite',
            total_recipes: row.count,
            timestamp: new Date().toISOString()
        });
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working perfectly!',
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Recipease API',
        database: 'SQLite'
    });
});

// Get ALL recipes
app.get('/api/recipes', (req, res) => {
    db.all('SELECT * FROM recipes ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Parse JSON strings back to arrays
        const recipes = rows.map(recipe => ({
            ...recipe,
            ingredients: JSON.parse(recipe.ingredients),
            instructions: JSON.parse(recipe.instructions)
        }));
        
        res.json(recipes);
    });
});

// Get SINGLE recipe by ID
app.get('/api/recipes/:id', (req, res) => {
    const id = req.params.id;
    
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: 'Recipe not found' });
            return;
        }
        
        res.json({
            ...row,
            ingredients: JSON.parse(row.ingredients),
            instructions: JSON.parse(row.instructions)
        });
    });
});

// Add NEW recipe
app.post('/api/recipes', (req, res) => {
    const { 
        title, 
        description, 
        ingredients, 
        instructions, 
        prep_time, 
        cook_time, 
        servings, 
        category 
    } = req.body;
    
    // Validation
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Recipe title is required' });
    }
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'At least one ingredient is required' });
    }
    
    // Save to database
    db.run(
        `INSERT INTO recipes (title, description, ingredients, instructions, prep_time, cook_time, servings, category) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            title.trim(),
            description ? description.trim() : '',
            JSON.stringify(ingredients),
            instructions ? JSON.stringify(instructions) : '[]',
            prep_time || 0,
            cook_time || 0,
            servings || 4,
            category || 'dinner'
        ],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'Database error: ' + err.message });
                return;
            }
            
            // Get the newly created recipe
            db.get('SELECT * FROM recipes WHERE id = ?', [this.lastID], (err, row) => {
                if (err || !row) {
                    res.json({
                        success: true,
                        message: 'Recipe saved!',
                        recipeId: this.lastID
                    });
                    return;
                }
                
                res.json({
                    success: true,
                    message: 'Recipe saved successfully!',
                    recipeId: this.lastID,
                    recipe: {
                        ...row,
                        ingredients: JSON.parse(row.ingredients),
                        instructions: JSON.parse(row.instructions)
                    }
                });
            });
        }
    );
});

// Update recipe
app.put('/api/recipes/:id', (req, res) => {
    const id = req.params.id;
    const { 
        title, 
        description, 
        ingredients, 
        instructions, 
        prep_time, 
        cook_time, 
        servings, 
        category 
    } = req.body;
    
    // Validation
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Recipe title is required' });
    }
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'At least one ingredient is required' });
    }
    
    db.run(
        `UPDATE recipes SET 
            title = ?, 
            description = ?, 
            ingredients = ?, 
            instructions = ?, 
            prep_time = ?, 
            cook_time = ?, 
            servings = ?, 
            category = ? 
         WHERE id = ?`,
        [
            title.trim(),
            description ? description.trim() : '',
            JSON.stringify(ingredients),
            instructions ? JSON.stringify(instructions) : '[]',
            prep_time || 0,
            cook_time || 0,
            servings || 4,
            category || 'dinner',
            id
        ],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'Database error: ' + err.message });
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ error: 'Recipe not found' });
                return;
            }
            
            res.json({
                success: true,
                message: 'Recipe updated successfully!',
                recipeId: id
            });
        }
    );
});

// Delete recipe
app.delete('/api/recipes/:id', (req, res) => {
    const id = req.params.id;
    
    db.run('DELETE FROM recipes WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Recipe not found' });
            return;
        }
        
        res.json({
            success: true,
            message: 'Recipe deleted successfully'
        });
    });
});

// ============ MEAL PLAN ROUTES ============

// Add/update meal plan entry
app.post('/api/meal-plan', (req, res) => {
    const { week_start, day, meal_type, recipe_id, notes } = req.body;
    
    console.log('Adding to meal plan:', { week_start, day, meal_type, recipe_id });
    
    if (!week_start || !day || !meal_type) {
        return res.status(400).json({ 
            error: 'Week start, day, and meal type are required',
            received: { week_start, day, meal_type, recipe_id }
        });
    }
    
    // Check if entry exists
    db.get(
        'SELECT id FROM meal_plans WHERE week_start = ? AND day = ? AND meal_type = ?',
        [week_start, day, meal_type],
        (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            if (row) {
                // Update existing entry
                db.run(
                    'UPDATE meal_plans SET recipe_id = ?, notes = ? WHERE id = ?',
                    [recipe_id || null, notes || '', row.id],
                    function(updateErr) {
                        if (updateErr) {
                            console.error('Update error:', updateErr);
                            return res.status(500).json({ error: 'Database error: ' + updateErr.message });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Meal plan updated',
                            mealPlanId: row.id,
                            action: 'updated'
                        });
                    }
                );
            } else {
                // Create new entry
                db.run(
                    `INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [week_start, day, meal_type, recipe_id || null, notes || ''],
                    function(insertErr) {
                        if (insertErr) {
                            console.error('Insert error:', insertErr);
                            return res.status(500).json({ error: 'Database error: ' + insertErr.message });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Added to meal plan',
                            mealPlanId: this.lastID,
                            action: 'created'
                        });
                    }
                );
            }
        }
    );
});

// ============ ENHANCED MEAL PLAN ROUTES ============

// Get or create weekly meal plan
app.get('/api/meal-plan/week', (req, res) => {
    const { week_start } = req.query;
    
    if (!week_start) {
        return res.status(400).json({ error: 'Week start date is required' });
    }
    
    // Check if meal plan exists for this week
    db.all(
        `SELECT mp.*, r.title as recipe_title, r.description as recipe_description, 
                r.ingredients as recipe_ingredients, r.prep_time, r.cook_time,
                r.category as recipe_category, r.servings as recipe_servings
         FROM meal_plans mp 
         LEFT JOIN recipes r ON mp.recipe_id = r.id 
         WHERE mp.week_start = ? 
         ORDER BY 
            CASE mp.day 
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
                ELSE 8
            END,
            CASE mp.meal_type 
                WHEN 'Breakfast' THEN 1
                WHEN 'Lunch' THEN 2
                WHEN 'Dinner' THEN 3
                WHEN 'Snack' THEN 4
                ELSE 5
            END`,
        [week_start],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Parse JSON fields
            const mealPlans = rows.map(row => ({
                id: row.id,
                week_start: row.week_start,
                day: row.day,
                meal_type: row.meal_type,
                recipe_id: row.recipe_id,
                notes: row.notes,
                recipe_title: row.recipe_title,
                recipe_description: row.recipe_description,
                recipe_ingredients: row.recipe_ingredients ? JSON.parse(row.recipe_ingredients) : [],
                prep_time: row.prep_time,
                cook_time: row.cook_time,
                recipe_category: row.recipe_category,
                recipe_servings: row.recipe_servings
            }));
            
            res.json(mealPlans);
        }
    );
});

// Add or update meal plan entry
app.post('/api/meal-plan', (req, res) => {
    const { week_start, day, meal_type, recipe_id, notes } = req.body;
    
    if (!week_start || !day || !meal_type) {
        return res.status(400).json({ error: 'Week start, day, and meal type are required' });
    }
    
    // Check if entry already exists for this day/meal type/week
    db.get(
        'SELECT id FROM meal_plans WHERE week_start = ? AND day = ? AND meal_type = ?',
        [week_start, day, meal_type],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            if (row) {
                // Update existing entry
                db.run(
                    'UPDATE meal_plans SET recipe_id = ?, notes = ? WHERE id = ?',
                    [recipe_id || null, notes || '', row.id],
                    function(updateErr) {
                        if (updateErr) {
                            return res.status(500).json({ error: 'Database error: ' + updateErr.message });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Meal plan updated',
                            mealPlanId: row.id,
                            action: 'updated'
                        });
                    }
                );
            } else {
                // Create new entry
                db.run(
                    `INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [week_start, day, meal_type, recipe_id || null, notes || ''],
                    function(insertErr) {
                        if (insertErr) {
                            return res.status(500).json({ error: 'Database error: ' + insertErr.message });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Added to meal plan',
                            mealPlanId: this.lastID,
                            action: 'created'
                        });
                    }
                );
            }
        }
    );
});

// Bulk update meal plan
app.post('/api/meal-plan/bulk', (req, res) => {
    const { week_start, meal_plan: mealPlanData } = req.body;
    
    if (!week_start || !mealPlanData) {
        return res.status(400).json({ error: 'Week start and meal plan data are required' });
    }
    
    // Start transaction
    db.serialize(() => {
        // Delete existing entries for this week
        db.run('DELETE FROM meal_plans WHERE week_start = ?', [week_start], (delErr) => {
            if (delErr) {
                return res.status(500).json({ error: 'Database error: ' + delErr.message });
            }
            
            // Insert new entries
            let inserted = 0;
            const errors = [];
            
            mealPlanData.forEach((entry, index) => {
                if (entry.recipe_id) {
                    db.run(
                        'INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) VALUES (?, ?, ?, ?, ?)',
                        [week_start, entry.day, entry.meal_type, entry.recipe_id, entry.notes || ''],
                        (insertErr) => {
                            if (insertErr) {
                                errors.push(`Entry ${index + 1}: ${insertErr.message}`);
                            } else {
                                inserted++;
                            }
                            
                            // Last iteration
                            if (index === mealPlanData.length - 1) {
                                if (errors.length > 0) {
                                    res.status(500).json({
                                        success: false,
                                        message: 'Some entries failed to save',
                                        errors: errors,
                                        inserted: inserted
                                    });
                                } else {
                                    res.json({
                                        success: true,
                                        message: `Meal plan saved (${inserted} entries)`
                                    });
                                }
                            }
                        }
                    );
                }
            });
        });
    });
});

// Clear entire week
app.delete('/api/meal-plan/week', (req, res) => {
    const { week_start } = req.query;
    
    if (!week_start) {
        return res.status(400).json({ error: 'Week start date is required' });
    }
    
    db.run('DELETE FROM meal_plans WHERE week_start = ?', [week_start], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            success: true,
            message: `Meal plan for week ${week_start} cleared`,
            changes: this.changes
        });
    });
});

// ============ MEAL PLAN ROUTES ============

// Get meal plan for a week
app.get('/api/meal-plan', (req, res) => {
    const { week_start } = req.query;
    
    let query = `SELECT mp.*, r.title as recipe_title, r.description as recipe_description 
                 FROM meal_plans mp 
                 LEFT JOIN recipes r ON mp.recipe_id = r.id`;
    let params = [];
    
    if (week_start) {
        query += ' WHERE mp.week_start = ?';
        params.push(week_start);
    }
    
    query += ' ORDER BY mp.day, mp.meal_type';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log(`Found ${rows.length} meal plan entries for week ${week_start || 'all'}`);
        res.json(rows);
    });
});

// Add/update meal plan entry
app.post('/api/meal-plan', (req, res) => {
    const { week_start, day, meal_type, recipe_id, notes } = req.body;
    
    console.log('Adding to meal plan:', { week_start, day, meal_type, recipe_id });
    
    if (!week_start || !day || !meal_type) {
        return res.status(400).json({ 
            error: 'Week start, day, and meal type are required',
            received: { week_start, day, meal_type, recipe_id }
        });
    }
    
    // Check if entry exists
    db.get(
        'SELECT id FROM meal_plans WHERE week_start = ? AND day = ? AND meal_type = ?',
        [week_start, day, meal_type],
        (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            if (row) {
                // Update existing entry
                db.run(
                    'UPDATE meal_plans SET recipe_id = ?, notes = ? WHERE id = ?',
                    [recipe_id || null, notes || '', row.id],
                    function(updateErr) {
                        if (updateErr) {
                            console.error('Update error:', updateErr);
                            return res.status(500).json({ error: 'Database error: ' + updateErr.message });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Meal plan updated',
                            mealPlanId: row.id,
                            action: 'updated'
                        });
                    }
                );
            } else {
                // Create new entry
                db.run(
                    `INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [week_start, day, meal_type, recipe_id || null, notes || ''],
                    function(insertErr) {
                        if (insertErr) {
                            console.error('Insert error:', insertErr);
                            return res.status(500).json({ error: 'Database error: ' + insertErr.message });
                        }
                        
                        res.json({
                            success: true,
                            message: 'Added to meal plan',
                            mealPlanId: this.lastID,
                            action: 'created'
                        });
                    }
                );
            }
        }
    );
});

// Clear week
app.delete('/api/meal-plan/week', (req, res) => {
    const { week_start } = req.query;
    
    if (!week_start) {
        return res.status(400).json({ error: 'Week start date is required' });
    }
    
    db.run('DELETE FROM meal_plans WHERE week_start = ?', [week_start], function(err) {
        if (err) {
            console.error('Delete error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            success: true,
            message: `Meal plan for week ${week_start} cleared`,
            changes: this.changes
        });
    });
});

// Get available dates for meal plans
app.get('/api/meal-plan/dates', (req, res) => {
    db.all(
        'SELECT DISTINCT week_start FROM meal_plans ORDER BY week_start DESC',
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json(rows.map(row => row.week_start));
        }
    );
});

// Enhanced grocery list generation
app.get('/api/grocery-list', (req, res) => {
    const { week_start, servings_multiplier } = req.query;
    
    if (!week_start) {
        return res.status(400).json({ error: 'Week start date is required' });
    }
    
    const multiplier = parseFloat(servings_multiplier) || 1;
    
    const query = `
        SELECT 
            json_each.value as raw_ingredient,
            COUNT(*) as recipe_count,
            GROUP_CONCAT(r.title) as recipes
        FROM meal_plans mp
        JOIN recipes r ON mp.recipe_id = r.id
        JOIN json_each(r.ingredients)
        WHERE mp.week_start = ? AND r.id IS NOT NULL
        GROUP BY LOWER(TRIM(json_each.value))
        ORDER BY json_each.value COLLATE NOCASE
    `;
    
    db.all(query, [week_start], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Process ingredients to combine quantities
        const ingredientMap = new Map();
        
        rows.forEach(row => {
            const ingredient = row.raw_ingredient.trim();
            
            // Simple parsing for quantities (this could be enhanced)
            const matches = ingredient.match(/^([\d\/\s\.]+)?\s*([a-zA-Z]+)?\s+(.+)/i);
            
            if (matches) {
                const quantity = matches[1] || '';
                const unit = matches[2] || '';
                const item = matches[3] || ingredient;
                const key = `${unit.toLowerCase()} ${item.toLowerCase()}`.trim();
                
                if (ingredientMap.has(key)) {
                    const existing = ingredientMap.get(key);
                    // Very basic quantity combination (would need more sophisticated parsing)
                    ingredientMap.set(key, {
                        ...existing,
                        quantity: existing.quantity ? `${existing.quantity} + ${quantity}` : quantity,
                        recipe_count: existing.recipe_count + row.recipe_count,
                        recipes: [...new Set([...existing.recipes.split(','), row.recipes])].join(', ')
                    });
                } else {
                    ingredientMap.set(key, {
                        ingredient: item,
                        quantity: quantity,
                        unit: unit,
                        raw: ingredient,
                        recipe_count: row.recipe_count,
                        recipes: row.recipes
                    });
                }
            } else {
                ingredientMap.set(ingredient.toLowerCase(), {
                    ingredient: ingredient,
                    quantity: '',
                    unit: '',
                    raw: ingredient,
                    recipe_count: row.recipe_count,
                    recipes: row.recipes
                });
            }
        });
        
        const ingredients = Array.from(ingredientMap.values()).map(item => ({
            ...item,
            scaled_quantity: item.quantity ? 
                (item.quantity.split(' ')[0] ? 
                    `${parseFloat(item.quantity.split(' ')[0]) * multiplier} ${item.unit}`.trim() : 
                    item.quantity) : 
                ''
        }));
        
        // Get meal plan summary
        db.all(`
            SELECT mp.day, mp.meal_type, r.title as recipe_title
            FROM meal_plans mp
            LEFT JOIN recipes r ON mp.recipe_id = r.id
            WHERE mp.week_start = ?
            ORDER BY 
                CASE mp.day 
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                END,
                CASE mp.meal_type 
                    WHEN 'Breakfast' THEN 1
                    WHEN 'Lunch' THEN 2
                    WHEN 'Dinner' THEN 3
                    WHEN 'Snack' THEN 4
                END
        `, [week_start], (err2, mealPlanRows) => {
            if (err2) {
                // Continue without summary
            }
            
            res.json({
                success: true,
                week_start: week_start,
                ingredients: ingredients,
                meal_plan_summary: mealPlanRows || [],
                count: ingredients.length,
                generated_at: new Date().toISOString(),
                servings_multiplier: multiplier
            });
        });
    });
});

// Export grocery list as text
app.get('/api/grocery-list/export', (req, res) => {
    const { week_start } = req.query;
    
    if (!week_start) {
        return res.status(400).json({ error: 'Week start date is required' });
    }
    
    const query = `
        SELECT DISTINCT json_each.value as ingredient
        FROM meal_plans mp
        JOIN recipes r ON mp.recipe_id = r.id
        JOIN json_each(r.ingredients)
        WHERE mp.week_start = ?
        ORDER BY ingredient
    `;
    
    db.all(query, [week_start], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const ingredients = rows.map(row => row.ingredient);
        
        const textContent = `GROCERY LIST - Week of ${week_start}\n\n` +
                           `Generated: ${new Date().toLocaleDateString()}\n` +
                           `Total Items: ${ingredients.length}\n\n` +
                           `INGREDIENTS:\n` +
                           ingredients.map((item, i) => `[ ] ${item}`).join('\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="grocery-list-${week_start}.txt"`);
        res.send(textContent);
    });
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log('==========================================');
    console.log('🍳 RECIPEASE - RECIPE MANAGER API');
    console.log('==========================================');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite (recipes.db)`);
    console.log(`🔧 API: http://localhost:${PORT}/api/recipes`);
    console.log(`📅 Meal Plan: http://localhost:${PORT}/api/meal-plan`);
    console.log(`🛒 Grocery: http://localhost:${PORT}/api/grocery-list`);
    console.log('==========================================');
    console.log('Next: Open frontend/index.html in browser');
    console.log('==========================================');
});