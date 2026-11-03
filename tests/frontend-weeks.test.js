// Tests for the week dropdown helpers in public/script.js.
// The script is loaded in a sandbox with a fake page, so no browser is needed.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { isoWeekLabel } = require('../seed');

// A tiny stand-in for one week navigator (hidden input + the pieces of text and the button it updates)
function fakeNavigator() {
    return {
        input: { value: '' },
        dates: { textContent: '' },
        number: { textContent: '' },
        today: { hidden: false },
        querySelector(selector) {
            return { '.week-nav-dates': this.dates, '.week-nav-number': this.number, '.week-nav-today': this.today }[selector];
        }
    };
}

function loadFrontend() {
    const navigators = { 'week-selector': fakeNavigator(), 'grocery-week-selector': fakeNavigator() };
    const context = {
        window: {},
        document: {
            getElementById: id => (navigators[id] ? navigators[id].input : null),
            querySelector: selector => navigators[selector.match(/"(.+)"/)[1]] || null
        },
        console
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'script.js'), 'utf8'), context);
    return { fn: context, navigators };
}

const { fn, navigators } = loadFrontend();
const thisWeek = isoWeekLabel(new Date());

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

describe('addWeeks', () => {
    test('moves forward and back one week', () => {
        expect(fn.addWeeks('2026-W45', 1)).toBe('2026-W46');
        expect(fn.addWeeks('2026-W45', -1)).toBe('2026-W44');
        expect(fn.addWeeks('2026-W45', 0)).toBe('2026-W45');
    });

    test('crosses the New Year in both directions', () => {
        expect(fn.addWeeks('2026-W53', 1)).toBe('2027-W01'); // 2026 has 53 weeks
        expect(fn.addWeeks('2027-W01', -1)).toBe('2026-W53');
        expect(fn.addWeeks('2025-W52', 1)).toBe('2026-W01'); // 2025 has 52 weeks
        expect(fn.addWeeks('2026-W01', -1)).toBe('2025-W52');
    });

    test('moves several weeks at once', () => {
        expect(fn.addWeeks('2026-W45', 10)).toBe('2027-W02');
        expect(fn.addWeeks('2026-W45', -45)).toBe('2025-W52');
    });

    test('stepping forward then back returns to the start, for every week from 2020 to 2031', () => {
        for (let year = 2020; year <= 2031; year++) {
            for (let week = 1; week <= 52; week++) {
                const label = `${year}-W${String(week).padStart(2, '0')}`;
                expect(fn.addWeeks(fn.addWeeks(label, 1), -1)).toBe(label);
            }
        }
    });

    test('stepping one week at a time never skips or repeats a week', () => {
        let label = '2020-W01';
        const seen = new Set([label]);
        for (let i = 0; i < 12 * 52; i++) {
            const next = fn.addWeeks(label, 1);
            expect(next > label).toBe(true);
            expect(seen.has(next)).toBe(false);
            seen.add(next);
            label = next;
        }
    });
});

describe('formatWeekRange', () => {
    test('shows the Monday-to-Sunday dates with the year once', () => {
        expect(fn.formatWeekRange('2026-W45')).toBe('Nov 2 \u2013 Nov 8, 2026');
    });

    test('a week that crosses a month keeps it readable', () => {
        expect(fn.formatWeekRange('2026-W44')).toBe('Oct 26 \u2013 Nov 1, 2026');
    });

    test('a week that crosses the New Year shows both years', () => {
        expect(fn.formatWeekRange('2025-W01')).toBe('Dec 30, 2024 \u2013 Jan 5, 2025');
    });
});

describe('week navigator', () => {
    test('setWeek stores the week and shows its dates and number', () => {
        fn.setWeek('week-selector', '2026-W45');
        const nav = navigators['week-selector'];
        expect(nav.input.value).toBe('2026-W45');
        expect(nav.dates.textContent).toBe('Nov 2 \u2013 Nov 8, 2026');
        expect(nav.number.textContent).toMatch(/^Week 45/);
    });

    test('the current week is labelled and has no "back to this week" link', () => {
        fn.setWeek('week-selector', thisWeek);
        const nav = navigators['week-selector'];
        expect(nav.number.textContent).toContain('This week');
        expect(nav.today.hidden).toBe(true);
    });

    test('any other week shows the "back to this week" link', () => {
        fn.setWeek('week-selector', fn.addWeeks(thisWeek, 3));
        const nav = navigators['week-selector'];
        expect(nav.number.textContent).not.toContain('This week');
        expect(nav.today.hidden).toBe(false);
    });

    test('stepWeek moves the stored week forward and back', () => {
        fn.setWeek('week-selector', '2026-W45');
        fn.stepWeek('week-selector', 1);
        expect(navigators['week-selector'].input.value).toBe('2026-W46');
        fn.stepWeek('week-selector', -2);
        expect(navigators['week-selector'].input.value).toBe('2026-W44');
    });

    test('stepWeek starts from the current week when nothing is selected yet', () => {
        navigators['grocery-week-selector'].input.value = '';
        fn.stepWeek('grocery-week-selector', 1);
        expect(navigators['grocery-week-selector'].input.value).toBe(fn.addWeeks(thisWeek, 1));
    });

    test('the two navigators are independent', () => {
        fn.setWeek('week-selector', '2026-W10');
        fn.setWeek('grocery-week-selector', '2026-W20');
        expect(navigators['week-selector'].input.value).toBe('2026-W10');
        expect(navigators['grocery-week-selector'].input.value).toBe('2026-W20');
    });

    test('unknown navigators are ignored instead of throwing', () => {
        expect(() => fn.setWeek('nope', '2026-W45')).not.toThrow();
    });
});
