<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Remix Workshop Management System (DWIP Enterprise Platform)

This repository contains the DWIP Enterprise Platform, a workshop management system with AI-driven workflows.

View your app in AI Studio: [https://ai.studio/apps/f20e5810-b075-4e67-95bf-66ad2830cfb8](https://ai.studio/apps/f20e5810-b075-4e67-95bf-66ad2830cfb8)

## Run Locally

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### Setup Instructions

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment Variables:**
    - The application requires several environment variables to run.
    - Copy the example environment file:
      ```bash
      cp .env.example .env.local
      ```
    - Open `.env.local` and set the required variables:
        - `JWT_SECRET`: A secure random string for JWT signing.
        - `CUSTOMER_JWT_SECRET`: A secure random string for customer JWT signing.
        - `DB_HOST`, `DB_PASSWORD`, `DB_DATABASE`: Your database connection details.
        - `GEMINI_API_KEY`: Your Gemini API key (from [Google AI Studio](https://aistudio.google.com/)).

3.  **Run the app:**
    ```bash
    npm run dev
    ```

## Development

- **Server:** Runs on port 3001 by default.
- **Vite:** Integrated via `server.ts` for frontend asset serving and HMR.
- **Sync:** Runs `scripts/sync_now.ts` on startup to ensure data consistency.

## Available Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build for production.
- `npm run production`: Run the production build.
- `npm run lint`: Run TypeScript type checking.
