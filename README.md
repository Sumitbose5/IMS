# PERN Starter Template

This repository is a starter template for PERN-style projects (Postgres, Express, React, Node) with TypeScript and Drizzle ORM + Supabase integration.

Overview
- Frontend: React + TypeScript (TSX), React Router for routing, Tailwind CSS for styling.
- Backend: Express + TypeScript, CORS enabled, opinionated folder structure prepared.
- Database: Postgres using Drizzle ORM. Supabase is used for hosted Postgres and optional client auth.

Quick start (local)
1. Prerequisites
    - Node.js (16+)
    - npm / pnpm / yarn
    - Postgres or Supabase project

2. Clone and install
    - Clone repo
    - Install frontend deps: cd frontend && npm install
    - Install backend deps: cd backend && npm install

3. Environment
    - Backend example (.env)
      ```
      PORT=4000
      DATABASE_URL=postgres://user:password@host:5432/dbname
      SUPABASE_URL=https://your-project.supabase.co
      SUPABASE_SERVICE_KEY=service_role_key_or_db_connection_key
      ```
    - Frontend example (Vite)
      ```
      VITE_SUPABASE_URL=https://your-project.supabase.co
      VITE_SUPABASE_ANON_KEY=public_anon_key
      ```
      (If using CRA, prefix with REACT_APP_ instead.)

4. Run
    - Backend: cd backend && npm run dev
    - Frontend: cd frontend && npm run dev
    - Or run both in separate terminals.

Scripts (typical)
- frontend/package.json
  - dev: starts dev server (Vite or CRA)
  - build: build production assets
  - preview / start: serve built assets
- backend/package.json
  - dev: ts-node-dev or nodemon for hot reloading
  - build: tsc
  - start: node dist/server.js
  - migrate: drizzle-kit push / run migrations

Database with Drizzle + Supabase
- Use DATABASE_URL for server-side Drizzle connection.
- Typical Drizzle workflow:
  - Define schema in /backend/src/db/schema.ts
  - Generate and run migrations with drizzle-kit
  - Example: npx drizzle-kit generate:pg --schema ./src/db --out ./drizzle
- If using Supabase, you can use its connection string in DATABASE_URL or the Supabase client keys for client-side features (auth/storage).

Project layout (suggested)

- frontend/
  - package.json
  - tsconfig.json
  - tailwind.config.cjs
  - postcss.config.cjs
  - src/
     - main.tsx (or index.tsx)
     - App.tsx
     - routes/
     - pages/
     - components/
     - styles/
     - index.css (Tailwind base/imports)
- backend/
  - package.json
  - tsconfig.json
  - src/
     - server.ts (Express app entry)
     - app.ts (Express setup + middleware)
     - routes/
     - controllers/
     - services/
     - middleware/
     - db/
        - client.ts (Drizzle + pg client setup)
        - schema.ts
        - migrations/
     - types/

Notes and recommendations
- CORS is configured on the backend to allow your frontend origin during development.
- React Router is scaffolded; add routes in src/routes and pages in src/pages.
- Tailwind is already set up; modify tailwind.config and index.css to match your project.
- Use environment variables for secrets and never commit them.
- For deployment, build the frontend and serve static assets via a hosting service or from the backend (optional).

Where to look
- Visit /frontend to see the React + Tailwind + Router setup.
- Visit /backend to see Express + TypeScript + Drizzle setup, plus example routes and DB client.

If you want, I can generate example files (server.ts, client.ts, sample routes, vite config, tailwind config, or .env.example). Tell me which files you want created.