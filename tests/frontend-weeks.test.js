// Tests for the week dropdown helpers in public/script.js.
// The script is loaded in a sandbox with a fake page, so no browser is needed.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isoWeekLabel } = require('../seed');

// A tiny stand-in for <select> elements, just enough for the week dropdown code
function fakeSelect() {
    const select = {
        options: [],
        value: '',
        set innerHTML(html) {
            // Only the placeholder option is ever written this way
            select.options = [{ value: '', text: 'Select a week...' }];
        },
        add(option, before) {
            const index = before ? select.options.indexOf(before) : -1;
            if (index === -1) select.options.push(option);
            else select.options.splice(index, 0, option);
        }
    };
    return select;
}

function loadFrontend() {
    const selects = { 'week-selector': fakeSelect(), 'grocery-week-selector': fakeSelect() };
    const context = {
        window: {},
        document: { getElementById: id => selects[id] || null },
        Option: function (text, value) { return { text, value }; },
        console
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8'), context);
    return { fn: context, selects };
}

const { fn, selects } = loadFrontend();

describe('getWeekFromDate (frontend)', () => {
    test.each([
        [new Date(2026, 10, 3), '2026-W45'],
        [new Date(2026, 10, 1), '2026-W44'],
        [new Date(2026, 0, 1), '2026-W01'],
        [new Date(2024, 11, 30), '2025-W01'],
        [new Date(2021, 0, 3), '2020-W53']
    ])('%s is %s', (date, expected) => {
        expect(fn.getWeekFromDate(date)).toBe(expected);
    });

    test('agrees with the server for every day from 2020 to 2031', () => {
        const day = new Date(2020, 0, 1);
        while (day.getFullYear() <= 2031) {
            expect(fn.getWeekFromDate(day)).toBe(isoWeekLabel(day));
            day.setDate(day.getDate() + 1);
        }
    });
});

describe('getWeekStartDate', () => {
    test('returns the Monday that starts the week', () => {
        const monday = fn.getWeekStartDate('2026-W45');
        expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2026, 10, 2]);
        expect(monday.getDay()).toBe(1);
    });

    test('handles weeks that start in the previous year', () => {
        const monday = fn.getWeekStartDate('2025-W01');
        expect([monday.getFullYear(), monday.getMonth(), monday.getDate()]).toEqual([2024, 11, 30]);
    });

    test('is the exact inverse of getWeekFromDate for every week from 2020 to 2031', () => {
        for (let year = 2020; year <= 2031; year++) {
            for (let week = 1; week <= 52; week++) {
                const label = `${year}-W${String(week).padStart(2, '0')}`;
                const monday = fn.getWeekStartDate(label);
                expect(monday.getDay()).toBe(1);
                expect(fn.getWeekFromDate(monday)).toBe(label);
            }
        }
    });
});

describe('formatWeekLabel', () => {
    test('shows the week number and the Monday-to-Sunday dates', () => {
        expect(fn.formatWeekLabel('2026-W45')).toBe('Week 45: Nov 2 - Nov 8, 2026');
    });

    test('a week that crosses a month and year boundary reads correctly', () => {
        expect(fn.formatWeekLabel('2025-W01')).toBe('Week 1: Dec 30 - Jan 5, 2025');
    });
});

describe('week dropdowns', () => {
    test('are filled with 53 weeks and the current week is selected', () => {
        fn.populateWeekSelectors();
        for (const select of Object.values(selects)) {
            expect(select.options).toHaveLength(54); // placeholder + 53 weeks
            expect(select.value).toBe(isoWeekLabel(new Date()));
            expect(select.options.some(o => o.value === select.value)).toBe(true);
        }
    });

    test('options are in chronological order with no duplicates', () => {
        const values = selects['week-selector'].options.map(o => o.value).filter(Boolean);
        expect(values).toEqual([...values].sort());
        expect(new Set(values).size).toBe(values.length);
    });

    test('a saved week outside the list is inserted in the right place', () => {
        const select = selects['week-selector'];
        fn.addWeekOption(select, '2019-W10');
        fn.addWeekOption(select, '2019-W10'); // adding it again changes nothing
        const values = select.options.map(o => o.value).filter(Boolean);
        expect(values[0]).toBe('2019-W10');
        expect(values.filter(v => v === '2019-W10')).toHaveLength(1);
        expect(values).toEqual([...values].sort());
    });
});
