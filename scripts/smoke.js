// scripts/smoke.js
// Live check of a running Recipease server (local or deployed). Read-only: it never changes data.
//
//   npm run smoke                                  checks http://localhost:5000
//   npm run smoke -- https://your-app.onrender.com  checks a deployed copy

const base = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');
const results = [];

async function check(name, fn) {
    try {
        await fn();
        results.push({ name, ok: true });
    } catch (err) {
        results.push({ name, ok: false, detail: err.message });
    }
}

function expect(condition, message) {
    if (!condition) throw new Error(message);
}

async function getJson(path) {
    const res = await fetch(base + path);
    return { res, body: await res.json() };
}

(async () => {
    console.log(`Checking ${base} (a free Render server can take up to a minute to wake up)\n`);

    await check('home page is served', async () => {
        const res = await fetch(base + '/');
        expect(res.status === 200, `status ${res.status}`);
        expect((await res.text()).includes('Recipease'), 'page does not mention Recipease');
    });

    await check('health check reports healthy', async () => {
        const { res, body } = await getJson('/api/health');
        expect(res.status === 200 && body.status === 'healthy', 'not healthy');
        expect(body.total_recipes >= 1, 'no recipes in the database');
    });

    let recipes = [];
    await check('recipes have the expected shape', async () => {
        const { body } = await getJson('/api/recipes');
        recipes = body;
        expect(Array.isArray(body) && body.length >= 1, 'no recipes returned');
        for (const r of body) {
            expect(typeof r.title === 'string' && r.title, 'recipe without a title');
            expect(Array.isArray(r.ingredients) && r.ingredients.length > 0, `"${r.title}" has no ingredients`);
            expect(Array.isArray(r.instructions), `"${r.title}" instructions are not a list`);
        }
    });

    await check('a single recipe can be fetched, a missing one is 404', async () => {
        const { res, body } = await getJson(`/api/recipes/${recipes[0].id}`);
        expect(res.status === 200 && body.id === recipes[0].id, 'could not fetch the first recipe');
        expect((await fetch(base + '/api/recipes/999999')).status === 404, 'missing recipe is not 404');
    });

    await check('invalid input is rejected with 400, not a crash', async () => {
        const res = await fetch(base + '/api/meal-plan/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ week_start: '2026-W01', meal_plan: 'oops' })
        });
        expect(res.status === 400, `status ${res.status}`);
        expect((await fetch(base + '/api/health')).status === 200, 'server stopped responding');
    });

    await check('grocery list builds for a week that has a plan', async () => {
        const { body: weeks } = await getJson('/api/meal-plan/dates');
        if (weeks.length === 0) return; // nothing planned (for example, after the sample data was cleared)
        const { body } = await getJson(`/api/grocery-list?week_start=${weeks[0]}`);
        expect(body.success && body.count > 0, 'empty grocery list for a planned week');
    });

    for (const r of results) {
        console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : ` - ${r.detail}`}`);
    }
    const failed = results.filter(r => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
})();
