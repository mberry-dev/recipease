# 🍳 Overview
Recipease is a comprehensive full-stack web application designed to simplify recipe management, meal planning, and grocery shopping. It combines a modern frontend interface with a robust backend API to provide a complete solution for organizing your cooking and meal preparation.

The application features a dashboard with recipe statistics, a drag-and-drop meal planner, automated grocery list generation, and full CRUD operations for recipes. All data is persisted in a SQLite database with automatic sample data population.
## Prerequisites: ##
Backend:Node.js, Express, SQLite
Frontend: HTML, CSS, JavaScript

# Setup Instructions
## Install dependencies: ##
npm install
Python/Flask

# Start backend server (Terminal 1):
cd backend
node server.js
Server runs on: http://localhost:5000 

# Start frontend server (Terminal 2):
cd frontend
npx http-server -p 8000
Frontend runs on: http://127.0.0.1:8000

# Alternative way to get frontend server running: 
Right click on index.html → click on reveal in file explorer → double click on index

Visual Diagram: Two-Terminal Setup

┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│         TERMINAL 1              │    │         TERMINAL 2              │
│      (Backend Server)           │    │     (Frontend Server)           │
├─────────────────────────────────┤    ├─────────────────────────────────┤
│ $ cd backend/                   │    │ $ cd frontend/                  │
│ $ node server.js                │    │ $ npx http-server -p 8000       │
│                                 │    │                                 │
│ ┌─────────────────────────┐    │    │ ┌─────────────────────────┐    │
│ │ PORT: 5000              │    │    │ │ PORT: 8000              │    │
│ │ Database: recipes.db    │    │    │ │ Serves: HTML/CSS/JS     │    │
│ │ Auto-creates 3 sample   │    │    │ │ Two accessible URLs:    │    │
│ │ recipes on first run    │    │    │ │ • http://127.0.0.1:8000 │    │
│ └─────────────────────────┘    │    │ │ • http://10.0.0.190:8000│    │
└─────────────────────────────────┘    │ └─────────────────────────┘    │
                                       └─────────────────────────────────┘
                    ▲                                    ▲
                    │                                    │
                    └──────────────┬─────────────────────┘
                                   │
                          ┌─────────────────┐
                          │    WEB BROWSER  │
                          │ Open either URL │
                          │ from Terminal 2 │
                          └─────────────────┘
