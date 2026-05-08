# Cafe App Setup Tutorial

This tutorial will guide you through setting up and running the Cafe App, which consists of a Node.js backend (Express + PostgreSQL) and an Expo/React Native frontend.

## Prerequisites

Before starting, ensure you have the following installed on your system:

### 1. Node.js and npm
- Download and install Node.js (version 18 or higher) from [nodejs.org](https://nodejs.org/).
- npm is included with Node.js.
- Verify installation: `node --version` and `npm --version`.

### 2. PostgreSQL Database
- Install PostgreSQL (version 12 or higher).
- On macOS: Use Homebrew - `brew install postgresql`, then `brew services start postgresql`.
- Create a database for the app: `createdb cafe_app_db` (or use any name you prefer).
- Note: You can also use a cloud database like Supabase if you prefer not to install locally.

### 3. Expo CLI
- Install globally: `npm install -g @expo/cli`.
- This is required to run the React Native frontend.

### 4. Git
- Install Git if not already available: `brew install git` (macOS) or download from [git-scm.com](https://git-scm.com/).

### 5. Optional: Development Tools
- For testing on mobile devices:
  - Install Expo Go app from the App Store (iOS) or Google Play (Android).
  - Set up Android Studio (for Android emulator) or Xcode (for iOS simulator).

## Step 1: Clone the Repository

1. Open your terminal.
2. Navigate to your desired workspace directory: `cd /path/to/your/workspace`.
3. Clone the repository: `git clone https://github.com/ethanpbn/SWE43.git`.
4. Navigate into the project: `cd SWE43/cafe-app`.

## Step 2: Set Up the Backend Environment

The backend requires environment variables for database connection.

1. Navigate to the backend directory: `cd backend`.
2. Create a `.env` file: `touch .env`.
3. Open `.env` in a text editor and add the following (replace with your actual values):

   ```
   PORT=3000
   DB_USER=your_postgresql_username  # e.g., your system username
   DB_HOST=localhost
   DB_NAME=cafe_app_db  # or your chosen database name
   DB_PASSWORD=your_postgresql_password  # leave empty if no password set
   DB_PORT=5432
   ```

4. Save and close the file.

## Step 3: Install Dependencies

1. From the `cafe-app` directory, run the provided script to install dependencies for both backend and frontend: `./start.sh`.
   - This will run `npm install` in both `backend/` and `frontend/` directories.
   - If you encounter permission issues, try `bash start.sh`.

Alternatively, install manually:
- Backend: `cd backend && npm install`.
- Frontend: `cd frontend && npm install`.

## Step 4: Set Up the Database

1. Ensure PostgreSQL is running.
2. If you haven't created tables yet, the backend may need database schema. Check `backend/server.js` for any initialization code. (Note: The current code assumes tables exist; you may need to add SQL scripts if not provided.)

## Step 5: Run the Application

1. From the `cafe-app` directory, run the start script: `./start.sh`.
   - This starts the backend (on port 3000) and frontend (via Expo).
   - The backend runs in the background, and the frontend will show Expo options.

2. For the frontend:
   - After running `start.sh`, you'll see Expo's output with options to open in:
     - Expo Go (scan QR code with your phone).
     - Android emulator.
     - iOS simulator.
     - Web browser (for testing).

3. If you need to run separately:
   - Backend: `cd backend && npm start`.
   - Frontend: `cd frontend && npx expo start`.

## Step 6: Verify Everything Works

1. Check the backend: Open a browser and go to `http://localhost:3000`. You should see a response (depending on your routes).
2. Check the frontend: Use Expo Go or a simulator to interact with the app.
3. Test database connection: The backend logs should show successful DB connection on startup.

## Troubleshooting

- **Backend won't start**: Check `.env` values and ensure PostgreSQL is running. Run `psql -U your_username -d cafe_app_db` to test DB access.
- **Frontend issues**: Ensure Expo CLI is installed. Try `npx expo install --fix` to resolve dependency issues.
- **Port conflicts**: Change `PORT` in `.env` if 3000 is in use.
- **Permission errors**: On macOS, you may need to adjust permissions for scripts: `chmod +x start.sh`.

## Next Steps

- Explore the code: Backend in `backend/server.js`, frontend in `frontend/app/`.
- Add features: Modify routes, components, or database schema as needed.
- Deploy: For production, consider hosting the backend (e.g., on Heroku) and using Expo's build tools.

If you encounter issues, check the console output or refer to the Expo/Node.js documentation.