# Notion-Style Minimalist Time Tracker

A minimalist, ultra-clean time tracking web application designed for adult professionals. Optimized for deployment on Vercel with cloud database synchronization across devices via Supabase.

---

## Features

- **Dual-Mode Time Logging**:
  - **Live Stopwatch**: Real-time counter powered by persistent wall-clock delta calculation (survives tab closing and device sleep).
  - **Retroactive Manual Entry**: Log completed sessions (e.g., "Deep Work - 1h 45m") without keeping a timer running.
- **Notion Design Aesthetics**:
  - Restrained monochrome typography and neutral zinc/slate palettes.
  - Crisp borders, dense tables with inline editing, and minimal padding.
  - Zero "AI fluff" (no floating particles, neon gradients, or gamification badges).
- **Analytics & Time Distribution**:
  - Segmented views: **Today**, **Past 7 Days**, **This Month**.
  - Metric cards: Total hours logged, daily pace, and primary focus.
  - Distribution bar charts detailing task percentages.
- **Cloud Sync & Offline Resilience**:
  - Automatic Supabase PostgreSQL synchronization with Row-Level Security (RLS).
  - Built-in local fallback so the application works offline or before connecting Supabase credentials.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase (Optional for local testing, required for multi-device sync)
1. Create a project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard and run the contents of [`schema.sql`](./schema.sql).
3. Copy your project URL and anon public API key.
4. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
5. Fill in your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment to Vercel

### Option 1: Vercel Web Dashboard (Recommended)
1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com/new), select **Import Git Repository**.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.

### Option 2: Vercel CLI
```bash
npx vercel
```
Follow the interactive CLI prompts and assign the environment variables when requested.
