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
- Create a database for the app: `createdb cafe_app_db` (or update the `.env` file with your database name).
- Note: Tables are created automatically on first run. You can also use a cloud database like Supabase if you prefer not to install locally.

### 3. Expo CLI
- Install globally: `npm install -g @expo/cli`.
- This is required to run the React Native frontend.

### 4. Git
- Assumed to be installed (everyone has access to the GitHub repository).

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

The backend uses environment variables for database connection. A `.env` file is provided with defaults.

1. Navigate to the backend directory: `cd backend`.
2. Review/update the `.env` file if needed (e.g., change database name or credentials):

   ```
   PORT=3000
   DB_USER=postgres  # Your PostgreSQL username
   DB_HOST=localhost
   DB_NAME=cafe_app_db  # Your database name
   DB_PASSWORD=  # Leave empty if no password
   DB_PORT=5432
   ```

## Step 3: Install Dependencies

1. From the `cafe-app` directory, run the provided script to install dependencies for both backend and frontend: `./start.sh`.
   - This will run `npm install` in both `backend/` and `frontend/` directories.
   - If you encounter permission issues, try `bash start.sh`.

Alternatively, install manually:
- Backend: `cd backend && npm install`.
- Frontend: `cd frontend && npm install`.

## Step 4: Run the Application

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

## Deployment for End-Users

If you want others to use the app without setting up their own database:

1. Deploy the backend to a hosting service (e.g., Heroku, Railway, or Vercel) with a hosted PostgreSQL database (e.g., Supabase, Neon).
2. Update the frontend's API calls to point to the deployed backend URL instead of `localhost:3000`.
3. Build and distribute the frontend app via Expo: `npx expo build` or submit to app stores.

This way, end-users only need to install the app or use Expo Go, without any setup.

If you encounter issues, check the console output or refer to the Expo/Node.js documentation.