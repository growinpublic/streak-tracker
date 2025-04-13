# Streak Tracker - Track Your Daily Habits and Goals

StreakTracker is a simple frontend app to help track daily goals and build habits.

## Features

- 📊 **Visual Progress Tracking**: See your streaks with calendar-style visualizations
- 🔄 **Track Multiple Goals**: Track as many different goals as you need
- 📤 **Import/Export**: Backup and restore your data via CSV files
- 🔐 **Privacy**: All data stays on your device - no account or cloud storage required

## Stack

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **DexieJS**

## Build and run

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/streaktracker.git
cd streaktracker
```

2. Install dependencies

```bash
pnpm install
# or
npm install
```

3. Start the development server

```bash
pnpm dev
# or
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. **Adding Goals**: Click the "Add New Goal" button to create a new goal, give it a title, set the date range, and pick a color.

2. **Tracking Progress**: Click on dates in the calendar to mark them as completed.

3. **Managing Goals**: Use the reorder buttons to organize your goals, or click "Delete" to remove a goal.

4. **Backup & Restore**: Use the Export/Import buttons to save your data as CSV files and restore them later.

5. **Quick Actions**: Use the "Clear" and "Fill" buttons to quickly modify your progress.

## Deployment

StreakTracker can be easily deployed to services like Vercel, Netlify, or GitHub Pages:

```bash
pnpm build
# or
npm run build
```
