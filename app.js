// app.js
// Recipease API (Express + SQLite). server.js starts it; the tests create it directly.

const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { SAMPLE_RECIPES, SAMPLE_MEAL_PLAN, isoWeekLabel } = require('./seed');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const UNITS = new Set([
    'cup', 'cups', 'tbsp', 'tsp', 'lb', 'lbs', 'oz', 'g', 'kg', 'ml', 'l',
    'clove', 'cloves', 'pinch', 'can', 'cans', 'slice', 'slices', 'stick', 'sticks'
]);

// ============ DATABASE HELPERS ============

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
    });
});
const get = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const all = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});
const exec = (db, sql) => new Promise((resolve, reject) => {
    db.exec(sql, err => (err ? reject(err) : resolve()));
});

async function openDatabase(dbPath, seed) {
    if (dbPath !== ':memory:') {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    const db = await new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(dbPath, err => (err ? reject(err) : resolve(conn)));
    });

    await exec(db, 'PRAGMA foreign_keys = ON');
    await exec(db, fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

    if (seed) {
        const { count } = await get(db, 'SELECT COUNT(*) AS count FROM recipes');
        if (count === 0) await seedDatabase(db);
    }
    return db;
}

async function seedDatabase(db) {
    const ids = [];
    for (const r of SAMPLE_RECIPES) {
        const { lastID } = await run(
            db,
            `INSERT INTO recipes (title, description, ingredients, instructions, prep_time, cook_time, servings, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [r.title, r.description, JSON.stringify(r.ingredients), JSON.stringify(r.instructions),
                r.prep_time, r.cook_time, r.servings, r.category]
        );
        ids.push(lastID);
    }

    const week = isoWeekLabel();
    for (const [day, mealType, recipeIndex, notes] of SAMPLE_MEAL_PLAN) {
        await run(
            db,
            'INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) VALUES (?, ?, ?, ?, ?)',
            [week, day, mealType, ids[recipeIndex], notes]
        );
    }
}

// ============ VALIDATION HELPERS ============

function parseJsonList(text) {
    try {
        const value = JSON.parse(text);
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function formatRecipe(row) {
    return {
        ...row,
        ingredients: parseJsonList(row.ingredients),
        instructions: parseJsonList(row.instructions)
    };
}

// Returns a whole number >= min, the fallback when the value is missing, or null when invalid.
function toWholeNumber(value, fallback, min) {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    return Number.isInteger(n) && n >= min ? n : null;
}

function validateStringList(value, label, { required }) {
    if (value === undefined || value === null) {
        return required ? { error: `At least one ${label} is required` } : { value: [] };
    }
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
        return { error: `${label[0].toUpperCase()}${label.slice(1)}s must be a list of text` };
    }
    const cleaned = value.map(item => item.trim()).filter(Boolean);
    if (required && cleaned.length === 0) return { error: `At least one ${label} is required` };
    return { value: cleaned };
}

function validateRecipe(body = {}) {
    const { title, description, ingredients, instructions, prep_time, cook_time, servings, category } = body;

    if (typeof title !== 'string' || !title.trim()) return { error: 'Recipe title is required' };
    if (title.trim().length > 200) return { error: 'Recipe title must be 200 characters or fewer' };
    if (description !== undefined && description !== null && typeof description !== 'string') {
        return { error: 'Description must be text' };
    }
    if (category !== undefined && category !== null && typeof category !== 'string') {
        return { error: 'Category must be text' };
    }

    const ing = validateStringList(ingredients, 'ingredient', { required: true });
    if (ing.error) return ing;
    const ins = validateStringList(instructions, 'instruction', { required: false });
    if (ins.error) return ins;

    const prep = toWholeNumber(prep_time, 0, 0);
    const cook = toWholeNumber(cook_time, 0, 0);
    const serves = toWholeNumber(servings, 4, 1);
    if (prep === null) return { error: 'Prep time must be a whole number of minutes, 0 or more' };
    if (cook === null) return { error: 'Cook time must be a whole number of minutes, 0 or more' };
    if (serves === null) return { error: 'Servings must be a whole number, 1 or more' };

    return {
        value: {
            title: title.trim(),
            description: description ? description.trim() : '',
            ingredients: ing.value,
            instructions: ins.value,
            prep_time: prep,
            cook_time: cook,
            servings: serves,
            category: category && category.trim() ? category.trim().toLowerCase() : 'dinner'
        }
    };
}

function validateSlot(entry = {}) {
    const { week_start, day, meal_type, recipe_id, notes } = entry;

    if (typeof week_start !== 'string' || !week_start.trim()) {
        return { error: 'Week start, day, and meal type are required' };
    }
    if (!DAYS.includes(day)) return { error: `Day must be one of: ${DAYS.join(', ')}` };
    if (!MEAL_TYPES.includes(meal_type)) return { error: `Meal type must be one of: ${MEAL_TYPES.join(', ')}` };

    let recipeId = null;
    if (recipe_id !== undefined && recipe_id !== null && recipe_id !== '') {
        recipeId = Number(recipe_id);
        if (!Number.isInteger(recipeId) || recipeId < 1) return { error: 'Recipe id must be a positive whole number' };
    }
    if (notes !== undefined && notes !== null && typeof notes !== 'string') return { error: 'Notes must be text' };

    return { value: { week_start: week_start.trim(), day, meal_type, recipe_id: recipeId, notes: notes || '' } };
}

// ============ GROCERY LIST HELPERS ============

function parseQuantity(text) {
    return text.trim().split(/\s+/).reduce((sum, part) => {
        if (part.includes('/')) {
            const [top, bottom] = part.split('/').map(Number);
            return sum + (bottom ? top / bottom : 0);
        }
        return sum + Number(part);
    }, 0);
}

// "1 1/2 cups flour" -> { quantity: 1.5, unit: 'cups', item: 'flour' }
function parseIngredient(raw) {
    const text = raw.trim();
    const match = text.match(/^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s+(.+)$/);
    if (!match) return { quantity: null, unit: '', item: text };

    const quantity = parseQuantity(match[1]);
    const words = match[2].split(/\s+/);
    const firstWord = words[0].replace(/\.$/, '').toLowerCase();
    if (UNITS.has(firstWord) && words.length > 1) {
        return { quantity, unit: firstWord, item: words.slice(1).join(' ') };
    }
    return { quantity, unit: '', item: match[2] };
}

function formatNumber(n) {
    return String(Math.round(n * 100) / 100);
}

function buildGroceryList(rows, multiplier) {
    const items = new Map();

    for (const row of rows) {
        for (const raw of parseJsonList(row.ingredients)) {
            if (typeof raw !== 'string' || !raw.trim()) continue;
            const { quantity, unit, item } = parseIngredient(raw);
            const key = `${unit}|${item.toLowerCase()}`;

            if (!items.has(key)) {
                items.set(key, { ingredient: item, unit, quantity: null, raw: raw.trim(), recipe_count: 0, titles: new Set() });
            }
            const entry = items.get(key);
            if (quantity !== null) entry.quantity = (entry.quantity || 0) + quantity;
            entry.recipe_count += 1;
            entry.titles.add(row.title);
        }
    }

    return Array.from(items.values())
        .sort((a, b) => a.ingredient.localeCompare(b.ingredient, undefined, { sensitivity: 'base' }))
        .map(entry => ({
            ingredient: entry.ingredient,
            quantity: entry.quantity === null ? '' : formatNumber(entry.quantity),
            unit: entry.unit,
            raw: entry.raw,
            recipe_count: entry.recipe_count,
            recipes: Array.from(entry.titles).join(', '),
            scaled_quantity: entry.quantity === null ? '' : `${formatNumber(entry.quantity * multiplier)} ${entry.unit}`.trim()
        }));
}

// ============ APP ============

async function createApp({ dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'recipes.db'), seed = true } = {}) {
    const db = await openDatabase(dbPath, seed);
    const app = express();

    // Writes run one at a time so a bulk save (a transaction) is never interleaved with other writes.
    let writeQueue = Promise.resolve();
    const exclusive = fn => {
        const result = writeQueue.then(fn);
        writeQueue = result.catch(() => {});
        return result;
    };
    const wrap = handler => (req, res, next) => handler(req, res).catch(next);

    app.use(express.json());

    // ---------- Health ----------

    app.get('/api/health', wrap(async (req, res) => {
        const { count } = await get(db, 'SELECT COUNT(*) AS count FROM recipes');
        res.json({
            status: 'healthy',
            service: 'Recipease API',
            version: '1.0.0',
            uptime: process.uptime(),
            database: 'SQLite',
            total_recipes: count,
            timestamp: new Date().toISOString()
        });
    }));

    app.get('/api/test', (req, res) => {
        res.json({
            message: 'API is working perfectly!',
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Recipease API',
            database: 'SQLite'
        });
    });

    // ---------- Recipes ----------

    app.get('/api/recipes', wrap(async (req, res) => {
        const rows = await all(db, 'SELECT * FROM recipes ORDER BY created_at DESC, id DESC');
        res.json(rows.map(formatRecipe));
    }));

    app.get('/api/recipes/:id', wrap(async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid recipe id' });

        const row = await get(db, 'SELECT * FROM recipes WHERE id = ?', [id]);
        if (!row) return res.status(404).json({ error: 'Recipe not found' });
        res.json(formatRecipe(row));
    }));

    app.post('/api/recipes', wrap(async (req, res) => {
        const { value, error } = validateRecipe(req.body);
        if (error) return res.status(400).json({ error });

        const { lastID } = await exclusive(() => run(
            db,
            `INSERT INTO recipes (title, description, ingredients, instructions, prep_time, cook_time, servings, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [value.title, value.description, JSON.stringify(value.ingredients), JSON.stringify(value.instructions),
                value.prep_time, value.cook_time, value.servings, value.category]
        ));

        const row = await get(db, 'SELECT * FROM recipes WHERE id = ?', [lastID]);
        res.json({ success: true, message: 'Recipe saved successfully!', recipeId: lastID, recipe: formatRecipe(row) });
    }));

    app.put('/api/recipes/:id', wrap(async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid recipe id' });

        const { value, error } = validateRecipe(req.body);
        if (error) return res.status(400).json({ error });

        const { changes } = await exclusive(() => run(
            db,
            `UPDATE recipes SET title = ?, description = ?, ingredients = ?, instructions = ?,
                 prep_time = ?, cook_time = ?, servings = ?, category = ?
             WHERE id = ?`,
            [value.title, value.description, JSON.stringify(value.ingredients), JSON.stringify(value.instructions),
                value.prep_time, value.cook_time, value.servings, value.category, id]
        ));
        if (changes === 0) return res.status(404).json({ error: 'Recipe not found' });

        res.json({ success: true, message: 'Recipe updated successfully!', recipeId: id });
    }));

    app.delete('/api/recipes/:id', wrap(async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid recipe id' });

        const { changes } = await exclusive(() => run(db, 'DELETE FROM recipes WHERE id = ?', [id]));
        if (changes === 0) return res.status(404).json({ error: 'Recipe not found' });

        res.json({ success: true, message: 'Recipe deleted successfully' });
    }));

    // ---------- Meal plan ----------

    // All entries, or one week's entries when ?week_start= is given
    app.get('/api/meal-plan', wrap(async (req, res) => {
        const { week_start } = req.query;
        let sql = `SELECT mp.*, r.title AS recipe_title, r.description AS recipe_description
                   FROM meal_plans mp LEFT JOIN recipes r ON mp.recipe_id = r.id`;
        const params = [];
        if (week_start) {
            sql += ' WHERE mp.week_start = ?';
            params.push(week_start);
        }
        sql += ' ORDER BY mp.week_start, mp.day, mp.meal_type';
        res.json(await all(db, sql, params));
    }));

    // One week with full recipe details, ordered Monday to Sunday and Breakfast to Snack
    app.get('/api/meal-plan/week', wrap(async (req, res) => {
        const { week_start } = req.query;
        if (!week_start) return res.status(400).json({ error: 'Week start date is required' });

        const rows = await all(
            db,
            `SELECT mp.*, r.title AS recipe_title, r.description AS recipe_description,
                    r.ingredients AS recipe_ingredients, r.prep_time, r.cook_time,
                    r.category AS recipe_category, r.servings AS recipe_servings
             FROM meal_plans mp LEFT JOIN recipes r ON mp.recipe_id = r.id
             WHERE mp.week_start = ?`,
            [week_start]
        );

        rows.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
            MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type));

        res.json(rows.map(row => ({
            id: row.id,
            week_start: row.week_start,
            day: row.day,
            meal_type: row.meal_type,
            recipe_id: row.recipe_id,
            notes: row.notes,
            recipe_title: row.recipe_title,
            recipe_description: row.recipe_description,
            recipe_ingredients: row.recipe_ingredients ? parseJsonList(row.recipe_ingredients) : [],
            prep_time: row.prep_time,
            cook_time: row.cook_time,
            recipe_category: row.recipe_category,
            recipe_servings: row.recipe_servings
        })));
    }));

    app.get('/api/meal-plan/dates', wrap(async (req, res) => {
        const rows = await all(db, 'SELECT DISTINCT week_start FROM meal_plans ORDER BY week_start DESC');
        res.json(rows.map(row => row.week_start));
    }));

    // Add or update one slot
    app.post('/api/meal-plan', wrap(async (req, res) => {
        const { value, error } = validateSlot(req.body);
        if (error) return res.status(400).json({ error });

        if (value.recipe_id !== null && !(await get(db, 'SELECT id FROM recipes WHERE id = ?', [value.recipe_id]))) {
            return res.status(400).json({ error: 'Recipe not found' });
        }

        const result = await exclusive(async () => {
            const existing = await get(
                db,
                'SELECT id FROM meal_plans WHERE week_start = ? AND day = ? AND meal_type = ?',
                [value.week_start, value.day, value.meal_type]
            );
            if (existing) {
                await run(db, 'UPDATE meal_plans SET recipe_id = ?, notes = ? WHERE id = ?',
                    [value.recipe_id, value.notes, existing.id]);
                return { id: existing.id, action: 'updated' };
            }
            const { lastID } = await run(
                db,
                'INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) VALUES (?, ?, ?, ?, ?)',
                [value.week_start, value.day, value.meal_type, value.recipe_id, value.notes]
            );
            return { id: lastID, action: 'created' };
        });

        res.json({
            success: true,
            message: result.action === 'updated' ? 'Meal plan updated' : 'Added to meal plan',
            mealPlanId: result.id,
            action: result.action
        });
    }));

    // Replace a whole week. Entries without a recipe are skipped; an empty list clears the week.
    app.post('/api/meal-plan/bulk', wrap(async (req, res) => {
        const { week_start, meal_plan } = req.body || {};
        if (typeof week_start !== 'string' || !week_start.trim() || !Array.isArray(meal_plan)) {
            return res.status(400).json({ error: 'Week start and a meal plan list are required' });
        }

        const entries = [];
        const seen = new Set();
        for (const [index, raw] of meal_plan.entries()) {
            const { value, error } = validateSlot({ ...raw, week_start });
            if (error) return res.status(400).json({ error: `Entry ${index + 1}: ${error}` });
            if (value.recipe_id === null) continue;

            const slot = `${value.day}|${value.meal_type}`;
            if (seen.has(slot)) return res.status(400).json({ error: `Entry ${index + 1}: duplicate slot ${value.day} ${value.meal_type}` });
            seen.add(slot);
            entries.push(value);
        }

        const ids = [...new Set(entries.map(e => e.recipe_id))];
        if (ids.length > 0) {
            const found = await all(db, `SELECT id FROM recipes WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
            if (found.length !== ids.length) return res.status(400).json({ error: 'One or more recipes were not found' });
        }

        await exclusive(async () => {
            await run(db, 'BEGIN');
            try {
                await run(db, 'DELETE FROM meal_plans WHERE week_start = ?', [week_start.trim()]);
                for (const e of entries) {
                    await run(
                        db,
                        'INSERT INTO meal_plans (week_start, day, meal_type, recipe_id, notes) VALUES (?, ?, ?, ?, ?)',
                        [e.week_start, e.day, e.meal_type, e.recipe_id, e.notes]
                    );
                }
                await run(db, 'COMMIT');
            } catch (err) {
                await run(db, 'ROLLBACK').catch(() => {});
                throw err;
            }
        });

        res.json({ success: true, message: `Meal plan saved (${entries.length} entries)` });
    }));

    app.delete('/api/meal-plan/week', wrap(async (req, res) => {
        const { week_start } = req.query;
        if (!week_start) return res.status(400).json({ error: 'Week start date is required' });

        const { changes } = await exclusive(() => run(db, 'DELETE FROM meal_plans WHERE week_start = ?', [week_start]));
        res.json({ success: true, message: `Meal plan for week ${week_start} cleared`, changes });
    }));

    // ---------- Grocery list ----------

    async function loadWeekIngredients(week_start) {
        return all(
            db,
            `SELECT r.title, r.ingredients
             FROM meal_plans mp JOIN recipes r ON mp.recipe_id = r.id
             WHERE mp.week_start = ?`,
            [week_start]
        );
    }

    app.get('/api/grocery-list', wrap(async (req, res) => {
        const { week_start, servings_multiplier } = req.query;
        if (!week_start) return res.status(400).json({ error: 'Week start date is required' });

        const parsed = parseFloat(servings_multiplier);
        const multiplier = parsed > 0 ? parsed : 1;

        const ingredients = buildGroceryList(await loadWeekIngredients(week_start), multiplier);
        const summary = await all(
            db,
            `SELECT mp.day, mp.meal_type, r.title AS recipe_title
             FROM meal_plans mp LEFT JOIN recipes r ON mp.recipe_id = r.id
             WHERE mp.week_start = ?`,
            [week_start]
        );
        summary.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
            MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type));

        res.json({
            success: true,
            week_start,
            ingredients,
            meal_plan_summary: summary,
            count: ingredients.length,
            generated_at: new Date().toISOString(),
            servings_multiplier: multiplier
        });
    }));

    app.get('/api/grocery-list/export', wrap(async (req, res) => {
        const { week_start } = req.query;
        if (!week_start) return res.status(400).json({ error: 'Week start date is required' });

        const ingredients = buildGroceryList(await loadWeekIngredients(week_start), 1);
        const lines = ingredients.map(i => `[ ] ${[i.quantity, i.unit, i.ingredient].filter(Boolean).join(' ')}`);
        const text = `GROCERY LIST - Week of ${week_start}\n\n` +
            `Generated: ${new Date().toLocaleDateString()}\n` +
            `Total Items: ${ingredients.length}\n\n` +
            `INGREDIENTS:\n${lines.join('\n')}`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="grocery-list-${week_start.replace(/[^\w-]/g, '')}.txt"`);
        res.send(text);
    }));

    // ---------- Frontend and errors ----------

    app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
    app.use(express.static(path.join(__dirname, 'public')));

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
        if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
        console.error(err);
        res.status(500).json({ error: 'Something went wrong on the server' });
    });

    const close = () => new Promise((resolve, reject) => db.close(err => (err ? reject(err) : resolve())));
    return { app, db, close };
}

module.exports = { createApp, parseIngredient, parseQuantity, buildGroceryList, validateRecipe, validateSlot, toWholeNumber };
