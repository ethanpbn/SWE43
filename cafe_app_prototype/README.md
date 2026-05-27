# Café Finder — SWE43

A React Native / Expo app for discovering and favoriting local cafés, backed by a Node.js + PostgreSQL API.

---

## Prerequisites

Install these before anything else:

- [Node.js](https://nodejs.org/) v18 or later
- [PostgreSQL](https://www.postgresql.org/download/) 14 or later
  - **Mac (Homebrew):** `brew install postgresql@14 && brew services start postgresql@14`
  - **Windows/Linux:** use the installer at the link above

---

## 1 — PostgreSQL setup

The database lives entirely on your own machine. Every teammate runs their own local copy.

Open a terminal and run:

```bash
# Connect to postgres (Mac Homebrew uses your OS username by default)
psql postgres

# Inside psql, run these three lines then quit:
CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'Cookie1!';
CREATE DATABASE cafeapp OWNER postgres;
\q
```

> If `psql postgres` fails, try `psql -U $(whoami) postgres` or `psql -U postgres`.

---

## 2 — Backend .env file

The backend reads credentials from a `.env` file that is **not** committed to git.
Copy the example and fill it in:

```bash
cp cafe_app_prototype/backend/.env.example cafe_app_prototype/backend/.env
```

The default values already match the database you just created, so no editing is needed unless you chose a different password.

---

## 3 — Install dependencies & seed the database

```bash
# Install backend and frontend packages
npm --prefix cafe_app_prototype/backend install
npm --prefix cafe_app_prototype/frontend install

# Populate the cafés table (safe to run multiple times)
node cafe_app_prototype/backend/seed.js
```

---

## 4 — Run the app

```bash
bash cafe_app_prototype/start.sh
```

This starts the backend API on **http://localhost:3000** and the Expo dev server.  
Press **W** in the Expo terminal to open the app in your browser.

To run them separately:

```bash
# Terminal 1 — backend
npm --prefix cafe_app_prototype/backend start

# Terminal 2 — frontend
npm --prefix cafe_app_prototype/frontend start
```

---

## Project structure

```
cafe_app_prototype/
├── backend/
│   ├── server.js      # Express API (auth, cafes, favorites)
│   ├── seed.js        # Seeds the cafes table
│   └── .env           # Local credentials (not in git — see .env.example)
└── frontend/
    └── app/           # Expo Router screens
        ├── (tabs)/
        │   ├── index.tsx    # Home — café list with favorites
        │   ├── explore.tsx  # Map view
        │   └── profile.tsx  # Profile, settings, log off
        └── favorites.tsx    # Favorites screen
```

## Features

| Feature | Details |
|---|---|
| Café list | Pulls from PostgreSQL via the backend API |
| Favorites | Heart button on each card; persists to the database and AsyncStorage per user |
| Map | Shows café pins; optional location toggle shows your position |
| Profile photo | Tap the avatar circle to pick a photo from your library; saved locally per user account |
| Terms of Service | Pop-up modal accessible from the profile grid |

---

## Troubleshooting

**`role "postgres" does not exist`**  
Run the `CREATE ROLE` command in step 1 above.

**`database "cafeapp" does not exist`**  
Run the `CREATE DATABASE` command in step 1 above.

**Home screen shows "No cafes yet"**  
The cafés table is empty — run `node cafe_app_prototype/backend/seed.js`.

**Port 3000 already in use**  
Find and stop the old process: `lsof -i :3000` then `kill <PID>`.

**Favorites don't persist after refresh**  
Make sure you are logged into an account that was created *after* the database was set up. Log out and register a new account if needed.
