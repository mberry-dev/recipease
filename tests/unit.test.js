// Unit tests for the pure functions in app.js and seed.js (no server or database involved).

const {
    parseIngredient,
    parseQuantity,
    buildGroceryList,
    validateRecipe,
    validateSlot,
    toWholeNumber
} = require('../app');
const { isoWeekLabel, SAMPLE_RECIPES, SAMPLE_MEAL_PLAN } = require('../seed');

describe('toWholeNumber', () => {
    test('missing values use the fallback', () => {
        expect(toWholeNumber(undefined, 4, 1)).toBe(4);
        expect(toWholeNumber(null, 4, 1)).toBe(4);
        expect(toWholeNumber('', 0, 0)).toBe(0);
    });

    test('numbers and numeric strings are accepted', () => {
        expect(toWholeNumber(10, 0, 0)).toBe(10);
        expect(toWholeNumber('15', 0, 0)).toBe(15);
    });

    test('invalid values return null', () => {
        expect(toWholeNumber(-1, 0, 0)).toBeNull();
        expect(toWholeNumber(2.5, 0, 0)).toBeNull();
        expect(toWholeNumber('abc', 0, 0)).toBeNull();
        expect(toWholeNumber(0, 4, 1)).toBeNull();
    });
});

describe('validateRecipe', () => {
    const valid = { title: 'Soup', ingredients: ['1 onion'] };

    test('accepts a minimal recipe and fills in defaults', () => {
        expect(validateRecipe(valid).value).toEqual({
            title: 'Soup',
            description: '',
            ingredients: ['1 onion'],
            instructions: [],
            prep_time: 0,
            cook_time: 0,
            servings: 4,
            category: 'dinner'
        });
    });

    test('trims text, drops blank list items and lowercases the category', () => {
        const { value } = validateRecipe({
            title: '  Soup  ',
            description: '  warm  ',
            ingredients: ['  1 onion ', '   '],
            instructions: [' Chop ', ''],
            category: ' LUNCH '
        });
        expect(value).toMatchObject({ title: 'Soup', description: 'warm', ingredients: ['1 onion'], instructions: ['Chop'], category: 'lunch' });
    });

    test('rejects a missing or non-text title', () => {
        expect(validateRecipe({ ...valid, title: '   ' }).error).toMatch(/title/i);
        expect(validateRecipe({ ...valid, title: 5 }).error).toMatch(/title/i);
        expect(validateRecipe(undefined).error).toMatch(/title/i);
    });

    test('rejects a title longer than 200 characters', () => {
        expect(validateRecipe({ ...valid, title: 'x'.repeat(201) }).error).toMatch(/200/);
    });

    test('requires at least one real ingredient', () => {
        expect(validateRecipe({ title: 'Soup' }).error).toMatch(/ingredient/i);
        expect(validateRecipe({ title: 'Soup', ingredients: ['  '] }).error).toMatch(/ingredient/i);
        expect(validateRecipe({ title: 'Soup', ingredients: [1] }).error).toMatch(/list of text/i);
    });

    test('rejects bad numbers with a specific message', () => {
        expect(validateRecipe({ ...valid, prep_time: -1 }).error).toMatch(/prep/i);
        expect(validateRecipe({ ...valid, cook_time: 1.5 }).error).toMatch(/cook/i);
        expect(validateRecipe({ ...valid, servings: 0 }).error).toMatch(/servings/i);
    });
});

describe('validateSlot', () => {
    const valid = { week_start: '2026-W45', day: 'Monday', meal_type: 'Dinner', recipe_id: 3, notes: 'x' };

    test('accepts a full slot', () => {
        expect(validateSlot(valid).value).toEqual(valid);
    });

    test('a missing recipe means an empty slot', () => {
        expect(validateSlot({ ...valid, recipe_id: undefined }).value.recipe_id).toBeNull();
        expect(validateSlot({ ...valid, recipe_id: null }).value.recipe_id).toBeNull();
        expect(validateSlot({ ...valid, recipe_id: '' }).value.recipe_id).toBeNull();
    });

    test('recipe id strings are converted to numbers', () => {
        expect(validateSlot({ ...valid, recipe_id: '7' }).value.recipe_id).toBe(7);
    });

    test('every day and meal type the planner uses is allowed', () => {
        for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
            expect(validateSlot({ ...valid, day }).error).toBeUndefined();
        }
        for (const meal_type of ['Breakfast', 'Lunch', 'Dinner', 'Snack']) {
            expect(validateSlot({ ...valid, meal_type }).error).toBeUndefined();
        }
    });

    test.each([
        ['week_start', { week_start: '' }],
        ['day', { day: 'monday' }],
        ['meal type', { meal_type: 'Dessert' }],
        ['recipe id', { recipe_id: 0 }],
        ['recipe id', { recipe_id: 1.5 }],
        ['notes', { notes: 5 }]
    ])('rejects an invalid %s', (_name, overrides) => {
        expect(validateSlot({ ...valid, ...overrides }).error).toBeDefined();
    });

    test('does not throw on a missing entry', () => {
        expect(validateSlot(undefined).error).toBeDefined();
    });
});

describe('parseQuantity and parseIngredient', () => {
    test('whole numbers, decimals, fractions and mixed numbers', () => {
        expect(parseQuantity('2')).toBe(2);
        expect(parseQuantity('1/2')).toBe(0.5);
        expect(parseQuantity('1 1/2')).toBe(1.5);
        expect(parseQuantity('3 1/4')).toBe(3.25);
    });

    test('splits quantity, unit and item', () => {
        expect(parseIngredient('2 tbsp soy sauce')).toEqual({ quantity: 2, unit: 'tbsp', item: 'soy sauce' });
        expect(parseIngredient('200g feta cheese, cubed').quantity).toBeNull();
        expect(parseIngredient('1 lb spaghetti')).toEqual({ quantity: 1, unit: 'lb', item: 'spaghetti' });
    });

    test('a number followed by a non-unit word keeps the word in the name', () => {
        expect(parseIngredient('4 large eggs')).toEqual({ quantity: 4, unit: '', item: 'large eggs' });
        expect(parseIngredient('1 red bell pepper')).toEqual({ quantity: 1, unit: '', item: 'red bell pepper' });
    });

    test('a unit with nothing after it is treated as the item', () => {
        expect(parseIngredient('2 cups')).toEqual({ quantity: 2, unit: '', item: 'cups' });
    });

    test('text without a quantity is returned as the item', () => {
        expect(parseIngredient('  Salt to taste ')).toEqual({ quantity: null, unit: '', item: 'Salt to taste' });
    });
});

describe('buildGroceryList', () => {
    const rows = [
        { title: 'A', ingredients: JSON.stringify(['1 cup flour', '2 eggs', 'Salt']) },
        { title: 'B', ingredients: JSON.stringify(['1 1/2 cups flour', '2 eggs', 'salt']) }
    ];

    test('combines matching ingredients and adds their quantities', () => {
        const list = buildGroceryList(rows, 1);
        const eggs = list.find(i => i.ingredient === 'eggs');
        expect(eggs).toMatchObject({ quantity: '4', recipe_count: 2, recipes: 'A, B' });
    });

    test('different units stay separate lines', () => {
        const list = buildGroceryList(rows, 1);
        expect(list.filter(i => /flour/.test(i.ingredient))).toHaveLength(2);
    });

    test('ingredients without a quantity are listed once, matched ignoring case', () => {
        const salt = buildGroceryList(rows, 1).filter(i => i.ingredient.toLowerCase() === 'salt');
        expect(salt).toHaveLength(1);
        expect(salt[0]).toMatchObject({ quantity: '', scaled_quantity: '', recipe_count: 2 });
    });

    test('scales quantities by the multiplier', () => {
        const eggs = buildGroceryList(rows, 2.5).find(i => i.ingredient === 'eggs');
        expect(eggs.scaled_quantity).toBe('10');
    });

    test('is sorted alphabetically', () => {
        const names = buildGroceryList(rows, 1).map(i => i.ingredient.toLowerCase());
        expect(names).toEqual([...names].sort());
    });

    test('survives bad data in the database', () => {
        const messy = [
            { title: 'X', ingredients: 'not json' },
            { title: 'Y', ingredients: JSON.stringify([null, 5, '   ', '1 cup rice']) }
        ];
        expect(buildGroceryList(messy, 1)).toHaveLength(1);
        expect(buildGroceryList([], 1)).toEqual([]);
    });
});

describe('isoWeekLabel', () => {
    test.each([
        [new Date(2026, 10, 3), '2026-W45'],
        [new Date(2026, 10, 2), '2026-W45'], // Monday
        [new Date(2026, 10, 1), '2026-W44'], // Sunday ends the previous week
        [new Date(2026, 0, 1), '2026-W01'],
        [new Date(2024, 11, 30), '2025-W01'], // late December can belong to next year's week 1
        [new Date(2021, 0, 3), '2020-W53'], // early January can belong to last year's week 53
        [new Date(2026, 11, 31), '2026-W53']
    ])('%s is %s', (date, expected) => {
        expect(isoWeekLabel(date)).toBe(expected);
    });

    test('week numbers are zero-padded', () => {
        expect(isoWeekLabel(new Date(2026, 1, 3))).toMatch(/^2026-W0\d$/);
    });
});

describe('sample data', () => {
    test('every sample recipe passes the same validation as user input', () => {
        for (const recipe of SAMPLE_RECIPES) {
            expect(validateRecipe(recipe).error).toBeUndefined();
        }
    });

    test('every sample meal-plan slot is valid and points at a real sample recipe', () => {
        for (const [day, mealType, recipeIndex] of SAMPLE_MEAL_PLAN) {
            expect(validateSlot({ week_start: '2026-W45', day, meal_type: mealType, recipe_id: 1 }).error).toBeUndefined();
            expect(SAMPLE_RECIPES[recipeIndex]).toBeDefined();
        }
    });
});
