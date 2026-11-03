// seed.js
// Demo data inserted automatically when the database is empty.

const SAMPLE_RECIPES = [
    {
        title: 'Spaghetti Carbonara',
        description: 'Classic Italian pasta dish with eggs, cheese, and pancetta',
        ingredients: ['1 lb spaghetti', '4 large eggs', '1 cup grated Pecorino Romano cheese', '8 oz pancetta or bacon, diced', '2 cloves garlic, minced', '1/2 tsp black pepper', 'Salt to taste', 'Fresh parsley for garnish'],
        instructions: ['Bring a large pot of salted water to boil', 'Cook spaghetti according to package directions until al dente', 'While pasta cooks, whisk eggs with grated cheese and black pepper in a bowl', 'In a large skillet, cook pancetta until crispy, about 5-7 minutes', 'Add garlic and cook for 1 minute until fragrant', 'Reserve 1 cup of pasta water, then drain spaghetti', 'Add hot pasta to skillet with pancetta, remove from heat', 'Quickly stir in egg mixture, adding pasta water as needed to create creamy sauce', 'Serve immediately with extra cheese and parsley garnish'],
        prep_time: 15, cook_time: 20, servings: 4, category: 'dinner'
    },
    {
        title: 'Greek Salad',
        description: 'Fresh Mediterranean salad with vegetables, feta, and olives',
        ingredients: ['2 large cucumbers, chopped', '4 ripe tomatoes, chopped', '1 red onion, thinly sliced', '1 green bell pepper, chopped', '200g feta cheese, cubed', '1 cup Kalamata olives', '1/4 cup extra virgin olive oil', '2 tbsp red wine vinegar', '1 tsp dried oregano', 'Salt and pepper to taste'],
        instructions: ['In a large bowl, combine cucumbers, tomatoes, red onion, and bell pepper', 'Add feta cheese and olives', 'In a small bowl, whisk together olive oil, red wine vinegar, oregano, salt, and pepper', 'Pour dressing over salad and toss gently to combine', 'Let sit for 10 minutes before serving to allow flavors to meld'],
        prep_time: 20, cook_time: 0, servings: 4, category: 'lunch'
    },
    {
        title: 'Blueberry Pancakes',
        description: 'Fluffy breakfast pancakes with fresh blueberries',
        ingredients: ['1 1/2 cups all-purpose flour', '3 1/2 tsp baking powder', '1 tsp salt', '1 tbsp white sugar', '1 1/4 cups milk', '1 egg', '3 tbsp melted butter', '1 cup fresh blueberries', 'Butter for cooking', 'Maple syrup for serving'],
        instructions: ['In a large bowl, sift together flour, baking powder, salt, and sugar', 'In another bowl, beat together milk, egg, and melted butter', 'Pour wet ingredients into dry ingredients and mix until just combined (small lumps are OK)', 'Gently fold in blueberries', 'Heat a lightly buttered griddle or frying pan over medium-high heat', 'Pour 1/4 cup batter for each pancake', 'Cook until bubbles form on the surface, about 2-3 minutes', 'Flip and cook until browned on the other side', 'Serve hot with butter and maple syrup'],
        prep_time: 15, cook_time: 10, servings: 4, category: 'breakfast'
    },
    {
        title: 'Chicken Stir Fry',
        description: 'Quick and healthy Asian-style stir fry with vegetables',
        ingredients: ['2 chicken breasts, thinly sliced', '1 red bell pepper, sliced', '1 yellow bell pepper, sliced', '1 onion, sliced', '2 carrots, julienned', '1 cup broccoli florets', '3 tbsp soy sauce', '2 tbsp oyster sauce', '1 tbsp honey', '2 cloves garlic, minced', '1 tbsp fresh ginger, minced', '2 tbsp vegetable oil', '2 green onions, chopped for garnish', 'Sesame seeds for garnish'],
        instructions: ['In a small bowl, mix soy sauce, oyster sauce, and honey', 'Heat 1 tbsp oil in a wok or large skillet over high heat', 'Add chicken and stir fry until cooked through, about 5-6 minutes', 'Remove chicken from pan', 'Add remaining oil, then stir fry garlic and ginger for 30 seconds', 'Add vegetables and stir fry for 4-5 minutes until crisp-tender', 'Return chicken to pan', 'Pour sauce over everything and stir to coat', 'Cook for 1-2 minutes until heated through', 'Garnish with green onions and sesame seeds'],
        prep_time: 20, cook_time: 15, servings: 4, category: 'dinner'
    },
    {
        title: 'Chocolate Chip Cookies',
        description: 'Classic chewy chocolate chip cookies',
        ingredients: ['2 1/4 cups all-purpose flour', '1 tsp baking soda', '1 tsp salt', '1 cup unsalted butter, softened', '3/4 cup granulated sugar', '3/4 cup brown sugar', '2 large eggs', '2 tsp vanilla extract', '2 cups semisweet chocolate chips', '1 cup chopped walnuts (optional)'],
        instructions: ['Preheat oven to 375°F (190°C)', 'In a small bowl, whisk together flour, baking soda, and salt', 'In a large bowl, cream together butter, granulated sugar, and brown sugar until smooth', 'Beat in eggs one at a time, then stir in vanilla', 'Gradually blend in flour mixture', 'Stir in chocolate chips and walnuts (if using)', 'Drop by rounded tablespoon onto ungreased baking sheets', 'Bake for 9-11 minutes until edges are golden brown', 'Cool on baking sheets for 2 minutes before transferring to wire racks'],
        prep_time: 20, cook_time: 10, servings: 24, category: 'dessert'
    }
];

// Slots for the demo meal plan: [day, meal type, index into SAMPLE_RECIPES, note]
const SAMPLE_MEAL_PLAN = [
    ['Monday', 'Dinner', 0, 'Family dinner night'],
    ['Tuesday', 'Lunch', 1, 'Make extra for leftovers'],
    ['Wednesday', 'Dinner', 3, 'Quick weeknight meal'],
    ['Sunday', 'Breakfast', 2, 'Weekend treat']
];

// ISO week label (for example "2026-W45") — the same format the week picker in the UI uses.
function isoWeekLabel(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

module.exports = { SAMPLE_RECIPES, SAMPLE_MEAL_PLAN, isoWeekLabel };
