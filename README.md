# Recipease

A full-stack recipe manager. Save recipes, plan a week of meals on a drag-and-drop calendar, and turn the plan into a combined grocery list scaled to the number of people you're cooking for.

Built with Node.js, Express, SQLite and a plain HTML/CSS/JavaScript frontend. One server runs both the API and the website.

## Features

- **Recipe manager:** add, edit, delete, search and filter recipes by category, with ingredients, step-by-step instructions, prep and cook times, and servings
- **Weekly meal planner:** pick a week from a dropdown (Monday to Sunday), drag recipes onto the calendar (Breakfast, Lunch, Dinner), save the week, reload it later, or clear it
- **Grocery list:** generated from the week's meal plan, scaled for 1 to N people, with duplicate ingredients combined, a shopping checklist that remembers your progress, and print support
- **Dashboard** with recipe counts and a live backend status check
- **REST API** with input validation and JSON error responses

## Run Locally

You need [Node.js](https://nodejs.org) 18 or newer (the LTS version is fine).

1. Clone the repo and open the folder:
   ```bash
   git clone https://github.com/mberry-dev/recipease.git
   cd recipease
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npm start
   ```
4. Open http://localhost:5000 in your browser.

On first run the server creates `data/recipes.db` and fills it with five sample recipes and a sample meal plan for the current week. To reset to the sample data, stop the server, delete the `data/` folder, and start it again.

The server uses port 5000 unless the `PORT` environment variable says otherwise. `DB_PATH` changes where the database file is stored.

If `npm install` fails on `sqlite3`, update Node.js to the current LTS release. The sqlite3 package downloads a prebuilt binary that matches your Node version.

## Tests

100 automated tests (Jest and Supertest) in three groups:

- **API tests** call every route on a real Express app with an in-memory database: recipe create/read/update/delete, input validation, meal-plan slots, the bulk week save, grocery-list combining and scaling, and error handling
- **Unit tests** check the pure functions on their own: recipe and meal-slot validation, ingredient parsing, grocery-list building, ISO week math, and that the sample data passes the same validation as user input
- **Frontend tests** load `public/script.js` in a sandbox and check the week dropdown code, including that the page and the server agree on the week number for every day from 2020 to 2031

```bash
npm test
```

### Live check

`npm run smoke` runs a read-only check against a running server (the API shape, error handling, and the grocery list). Point it at the deployed site to confirm a deployment works:

```bash
npm run smoke
npm run smoke -- https://your-app.onrender.com
```

## API

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/api/health` | Status and recipe count |
| GET | `/api/recipes` | All recipes |
| GET | `/api/recipes/:id` | One recipe |
| POST | `/api/recipes` | Create a recipe |
| PUT | `/api/recipes/:id` | Update a recipe |
| DELETE | `/api/recipes/:id` | Delete a recipe (its meal-plan slots become empty) |
| GET | `/api/meal-plan?week_start=2026-W45` | Meal-plan entries, optionally for one week |
| GET | `/api/meal-plan/week?week_start=…` | One week with full recipe details, in calendar order |
| GET | `/api/meal-plan/dates` | Weeks that have a plan |
| POST | `/api/meal-plan` | Set or clear one slot |
| POST | `/api/meal-plan/bulk` | Replace a whole week in one transaction |
| DELETE | `/api/meal-plan/week?week_start=…` | Clear a week |
| GET | `/api/grocery-list?week_start=…&servings_multiplier=2` | Combined, scaled ingredient list |
| GET | `/api/grocery-list/export?week_start=…` | The grocery list as a text checklist |

Weeks use the ISO format `YYYY-Www` (for example `2026-W45`). Days are `Monday` to `Sunday`; meal types are `Breakfast`, `Lunch`, `Dinner` and `Snack`.

## Deploy to Render

The repo includes a `render.yaml` blueprint. In Render, choose **New → Blueprint**, connect this repository, and deploy. Render runs `npm install`, starts the app with `npm start`, and uses `/api/health` as its health check.

On Render's free plan the SQLite file is temporary, so the demo resets to the sample data whenever the service restarts or wakes from sleep.

## Project Structure

```
recipease/
├── server.js          # Starts the server
├── app.js             # Express app, routes, validation, grocery-list logic
├── seed.js            # Sample recipes and meal plan
├── schema.sql         # SQLite tables and constraints
├── render.yaml        # Render deployment blueprint
├── public/            # Frontend: index.html, script.js, style.css
├── tests/             # API, unit and frontend tests
├── scripts/           # smoke.js: live check of a running server
├── docs/              # Project report and tutorial (PDF and Word)
└── data/              # SQLite database (created on first run, not committed)
```

## Background

Recipease began as a final project for CIS 435 at the University of Michigan-Dearborn and has since been cleaned up, tested and prepared for deployment as a portfolio project.
