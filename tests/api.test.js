const request = require('supertest');
const { createApp, parseIngredient } = require('../app');

const WEEK = '2026-W10';

const pasta = {
    title: 'Test Pasta',
    description: 'Simple pasta',
    ingredients: ['1 lb spaghetti', '2 cloves garlic', '1 red bell pepper'],
    instructions: ['Boil', 'Serve'],
    prep_time: 5,
    cook_time: 10,
    servings: 2,
    category: 'dinner'
};

let ctx;
let api;

beforeEach(async () => {
    ctx = await createApp({ dbPath: ':memory:', seed: false });
    api = request(ctx.app);
});

afterEach(async () => {
    await ctx.close();
});

async function addRecipe(overrides = {}) {
    const res = await api.post('/api/recipes').send({ ...pasta, ...overrides });
    expect(res.status).toBe(200);
    return res.body.recipeId;
}

describe('health and basics', () => {
    test('health check reports recipe count', async () => {
        await addRecipe();
        const res = await api.get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ status: 'healthy', total_recipes: 1 });
    });

    test('test endpoint responds', async () => {
        const res = await api.get('/api/test');
        expect(res.body.status).toBe('OK');
    });

    test('unknown API route returns JSON 404', async () => {
        const res = await api.get('/api/nope');
        expect(res.status).toBe(404);
        expect(res.body.error).toBeDefined();
    });

    test('malformed JSON returns a JSON 400, not an HTML stack trace', async () => {
        const res = await api.post('/api/recipes').set('Content-Type', 'application/json').send('{bad');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/valid JSON/);
    });

    test('the frontend is served from /', async () => {
        const res = await api.get('/');
        expect(res.status).toBe(200);
        expect(res.text).toContain('<html');
    });

    test('script.js has no hardcoded localhost URLs', async () => {
        const res = await api.get('/script.js');
        expect(res.text).not.toMatch(/localhost:5000/);
    });
});

describe('seed data', () => {
    test('an empty database is filled with demo recipes and a demo meal plan', async () => {
        const seeded = await createApp({ dbPath: ':memory:', seed: true });
        const recipes = await request(seeded.app).get('/api/recipes');
        expect(recipes.body).toHaveLength(5);
        const plan = await request(seeded.app).get('/api/meal-plan');
        expect(plan.body.length).toBe(4);
        expect(plan.body.every(slot => slot.recipe_id !== null)).toBe(true);
        await seeded.close();
    });
});

describe('recipes', () => {
    test('create, read, update, delete', async () => {
        const id = await addRecipe();

        const one = await api.get(`/api/recipes/${id}`);
        expect(one.body.title).toBe('Test Pasta');
        expect(one.body.ingredients).toEqual(pasta.ingredients);
        expect(one.body.instructions).toEqual(pasta.instructions);

        const list = await api.get('/api/recipes');
        expect(list.body).toHaveLength(1);

        const upd = await api.put(`/api/recipes/${id}`).send({ ...pasta, title: 'Renamed', servings: 6 });
        expect(upd.status).toBe(200);
        const after = await api.get(`/api/recipes/${id}`);
        expect(after.body).toMatchObject({ title: 'Renamed', servings: 6 });

        const del = await api.delete(`/api/recipes/${id}`);
        expect(del.status).toBe(200);
        expect((await api.get(`/api/recipes/${id}`)).status).toBe(404);
    });

    test('defaults are applied and text is trimmed', async () => {
        const res = await api.post('/api/recipes').send({ title: '  Toast  ', ingredients: ['bread'] });
        expect(res.body.recipe).toMatchObject({ title: 'Toast', servings: 4, prep_time: 0, cook_time: 0, category: 'dinner', instructions: [] });
    });

    test.each([
        ['missing title', { title: '' }],
        ['title that is not text', { title: 123 }],
        ['no ingredients', { ingredients: [] }],
        ['ingredients not a list', { ingredients: 'flour' }],
        ['ingredient that is not text', { ingredients: [1, 2] }],
        ['negative prep time', { prep_time: -5 }],
        ['fractional cook time', { cook_time: 2.5 }],
        ['zero servings', { servings: 0 }],
        ['instructions not a list', { instructions: 'just do it' }]
    ])('rejects %s with 400', async (_name, overrides) => {
        const res = await api.post('/api/recipes').send({ ...pasta, ...overrides });
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('invalid id is 400, unknown id is 404', async () => {
        expect((await api.get('/api/recipes/abc')).status).toBe(400);
        expect((await api.get('/api/recipes/9999')).status).toBe(404);
        expect((await api.put('/api/recipes/9999').send(pasta)).status).toBe(404);
        expect((await api.delete('/api/recipes/9999')).status).toBe(404);
    });

    test('update validates just like create', async () => {
        const id = await addRecipe();
        const res = await api.put(`/api/recipes/${id}`).send({ ...pasta, ingredients: [] });
        expect(res.status).toBe(400);
    });
});

describe('meal plan slots', () => {
    test('add a slot, then update the same slot', async () => {
        const a = await addRecipe();
        const b = await addRecipe({ title: 'Second' });

        const created = await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Dinner', recipe_id: a });
        expect(created.body.action).toBe('created');

        const updated = await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Dinner', recipe_id: b, notes: 'swap' });
        expect(updated.body.action).toBe('updated');
        expect(updated.body.mealPlanId).toBe(created.body.mealPlanId);

        const week = await api.get('/api/meal-plan').query({ week_start: WEEK });
        expect(week.body).toHaveLength(1);
        expect(week.body[0]).toMatchObject({ recipe_id: b, notes: 'swap', recipe_title: 'Second' });
    });

    test('a null recipe empties the slot', async () => {
        const a = await addRecipe();
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Lunch', recipe_id: a });
        const res = await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Lunch', recipe_id: null });
        expect(res.status).toBe(200);
        const week = await api.get('/api/meal-plan/week').query({ week_start: WEEK });
        expect(week.body[0].recipe_id).toBeNull();
    });

    test.each([
        ['invalid day', { day: 'Funday' }],
        ['invalid meal type', { meal_type: 'Dessert' }],
        ['missing week', { week_start: '' }],
        ['recipe id that is not a number', { recipe_id: 'abc' }],
        ['recipe that does not exist', { recipe_id: 9999 }]
    ])('rejects %s with 400', async (_name, overrides) => {
        const a = await addRecipe();
        const res = await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Dinner', recipe_id: a, ...overrides });
        expect(res.status).toBe(400);
    });

    test('week view is ordered Monday to Sunday and Breakfast to Dinner', async () => {
        const a = await addRecipe();
        const slots = [['Sunday', 'Breakfast'], ['Monday', 'Dinner'], ['Monday', 'Breakfast'], ['Wednesday', 'Lunch']];
        for (const [day, meal_type] of slots) {
            await api.post('/api/meal-plan').send({ week_start: WEEK, day, meal_type, recipe_id: a });
        }
        const week = await api.get('/api/meal-plan/week').query({ week_start: WEEK });
        expect(week.body.map(s => `${s.day} ${s.meal_type}`)).toEqual([
            'Monday Breakfast', 'Monday Dinner', 'Wednesday Lunch', 'Sunday Breakfast'
        ]);
        expect(week.body[0].recipe_ingredients).toEqual(pasta.ingredients);
    });

    test('week view requires week_start', async () => {
        expect((await api.get('/api/meal-plan/week')).status).toBe(400);
    });

    test('dates lists weeks that have plans, newest first', async () => {
        const a = await addRecipe();
        for (const week_start of ['2026-W01', '2026-W05']) {
            await api.post('/api/meal-plan').send({ week_start, day: 'Monday', meal_type: 'Dinner', recipe_id: a });
        }
        expect((await api.get('/api/meal-plan/dates')).body).toEqual(['2026-W05', '2026-W01']);
    });

    test('clearing a week removes only that week', async () => {
        const a = await addRecipe();
        for (const week_start of ['2026-W01', '2026-W02']) {
            await api.post('/api/meal-plan').send({ week_start, day: 'Monday', meal_type: 'Dinner', recipe_id: a });
        }
        const res = await api.delete('/api/meal-plan/week').query({ week_start: '2026-W01' });
        expect(res.body.changes).toBe(1);
        expect((await api.get('/api/meal-plan')).body).toHaveLength(1);
        expect((await api.delete('/api/meal-plan/week')).status).toBe(400);
    });

    test('deleting a recipe empties its meal slots instead of leaving a dangling id', async () => {
        const a = await addRecipe();
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Dinner', recipe_id: a });
        await api.delete(`/api/recipes/${a}`);
        const week = await api.get('/api/meal-plan/week').query({ week_start: WEEK });
        expect(week.body).toHaveLength(1);
        expect(week.body[0].recipe_id).toBeNull();
        expect(week.body[0].recipe_title).toBeNull();
    });
});

describe('bulk meal plan save', () => {
    test('replaces the week and skips empty slots, even when the last entry is empty', async () => {
        const a = await addRecipe();
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Friday', meal_type: 'Dinner', recipe_id: a });

        const res = await api.post('/api/meal-plan/bulk').send({
            week_start: WEEK,
            meal_plan: [
                { day: 'Monday', meal_type: 'Dinner', recipe_id: a, notes: 'n' },
                { day: 'Tuesday', meal_type: 'Lunch', recipe_id: a },
                { day: 'Wednesday', meal_type: 'Lunch', recipe_id: null }
            ]
        });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Meal plan saved (2 entries)');

        const week = await api.get('/api/meal-plan').query({ week_start: WEEK });
        expect(week.body.map(s => s.day).sort()).toEqual(['Monday', 'Tuesday']);
    });

    test('accepts the exact payload the frontend sends (extra recipe_title field)', async () => {
        const a = await addRecipe();
        const res = await api.post('/api/meal-plan/bulk').send({
            week_start: WEEK,
            meal_plan: [{ day: 'Monday', meal_type: 'Dinner', recipe_id: a, recipe_title: 'Test Pasta' }]
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('an empty list clears the week and still responds', async () => {
        const a = await addRecipe();
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Friday', meal_type: 'Dinner', recipe_id: a });
        const res = await api.post('/api/meal-plan/bulk').send({ week_start: WEEK, meal_plan: [] });
        expect(res.status).toBe(200);
        expect((await api.get('/api/meal-plan').query({ week_start: WEEK })).body).toHaveLength(0);
    });

    test('a meal plan that is not a list returns 400 and the server keeps running', async () => {
        const res = await api.post('/api/meal-plan/bulk').send({ week_start: WEEK, meal_plan: 'oops' });
        expect(res.status).toBe(400);
        expect((await api.get('/api/health')).status).toBe(200);
    });

    test('an invalid entry is rejected and the existing week is left untouched', async () => {
        const a = await addRecipe();
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Friday', meal_type: 'Dinner', recipe_id: a });

        const bad = await api.post('/api/meal-plan/bulk').send({
            week_start: WEEK,
            meal_plan: [{ day: 'Monday', meal_type: 'Dinner', recipe_id: a }, { day: 'Nope', meal_type: 'Dinner', recipe_id: a }]
        });
        expect(bad.status).toBe(400);
        expect(bad.body.error).toMatch(/Entry 2/);

        const week = await api.get('/api/meal-plan').query({ week_start: WEEK });
        expect(week.body.map(s => s.day)).toEqual(['Friday']);
    });

    test('duplicate slots and unknown recipes are rejected', async () => {
        const a = await addRecipe();
        const dup = await api.post('/api/meal-plan/bulk').send({
            week_start: WEEK,
            meal_plan: [{ day: 'Monday', meal_type: 'Dinner', recipe_id: a }, { day: 'Monday', meal_type: 'Dinner', recipe_id: a }]
        });
        expect(dup.status).toBe(400);

        const missing = await api.post('/api/meal-plan/bulk').send({
            week_start: WEEK,
            meal_plan: [{ day: 'Monday', meal_type: 'Dinner', recipe_id: 9999 }]
        });
        expect(missing.status).toBe(400);
    });
});

describe('grocery list', () => {
    async function planWeek() {
        const a = await addRecipe();
        const b = await addRecipe({ title: 'Garlic Bread', ingredients: ['2 cloves garlic', '1 loaf bread', 'Salt to taste'] });
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Monday', meal_type: 'Dinner', recipe_id: a });
        await api.post('/api/meal-plan').send({ week_start: WEEK, day: 'Tuesday', meal_type: 'Dinner', recipe_id: b });
    }

    test('parseIngredient understands quantities, fractions and units', () => {
        expect(parseIngredient('1 1/2 cups flour')).toEqual({ quantity: 1.5, unit: 'cups', item: 'flour' });
        expect(parseIngredient('1/4 cup olive oil')).toEqual({ quantity: 0.25, unit: 'cup', item: 'olive oil' });
        expect(parseIngredient('Salt to taste')).toEqual({ quantity: null, unit: '', item: 'Salt to taste' });
    });

    test('a word that is not a unit stays part of the ingredient name', () => {
        expect(parseIngredient('1 red bell pepper')).toEqual({ quantity: 1, unit: '', item: 'red bell pepper' });
    });

    test('same ingredients are combined and quantities add up', async () => {
        await planWeek();
        const res = await api.get('/api/grocery-list').query({ week_start: WEEK });
        expect(res.status).toBe(200);

        const garlic = res.body.ingredients.find(i => i.ingredient === 'garlic');
        expect(garlic).toMatchObject({ quantity: '4', unit: 'cloves', recipe_count: 2, scaled_quantity: '4 cloves' });
        expect(garlic.recipes).toBe('Test Pasta, Garlic Bread');

        const pepper = res.body.ingredients.find(i => i.ingredient === 'red bell pepper');
        expect(pepper.unit).toBe('');
        expect(res.body.meal_plan_summary).toHaveLength(2);
    });

    test('servings multiplier scales quantities', async () => {
        await planWeek();
        const res = await api.get('/api/grocery-list').query({ week_start: WEEK, servings_multiplier: 2 });
        const spaghetti = res.body.ingredients.find(i => i.ingredient === 'spaghetti');
        expect(spaghetti.scaled_quantity).toBe('2 lb');
        const pepper = res.body.ingredients.find(i => i.ingredient === 'red bell pepper');
        expect(pepper.scaled_quantity).toBe('2');
    });

    test('invalid multiplier falls back to 1; missing week is 400', async () => {
        await planWeek();
        const res = await api.get('/api/grocery-list').query({ week_start: WEEK, servings_multiplier: 'abc' });
        expect(res.body.servings_multiplier).toBe(1);
        expect((await api.get('/api/grocery-list')).status).toBe(400);
    });

    test('export is a downloadable text checklist', async () => {
        await planWeek();
        const res = await api.get('/api/grocery-list/export').query({ week_start: WEEK });
        expect(res.status).toBe(200);
        expect(res.headers['content-disposition']).toContain('grocery-list-2026-W10.txt');
        expect(res.text).toContain('[ ] 4 cloves garlic');
        expect(res.text).toContain('Total Items:');
    });

    test('an empty week gives an empty list', async () => {
        const res = await api.get('/api/grocery-list').query({ week_start: '2030-W01' });
        expect(res.body.ingredients).toEqual([]);
    });
});
