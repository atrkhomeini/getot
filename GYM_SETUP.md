# Gym Guide and Logbook - Setup Guide

This is a comprehensive gym guide and logbook web application built with Next.js 16, Supabase, and Tailwind CSS.

## Features

### For Users:
- **Netflix-style Login**: User grid display for easy access
- **Home Page**: Exercise cards grouped by muscle group with GIFs
- **Exercise Details**: Track target vs actual sets and reps
- **Analytics**: Line chart (actual vs target) and GitHub-style consistency graph
- **Check-in/Check-out**: Simple buttons to track gym visits

### For Owner/Admin:
- **Dashboard**: Overview of all user activity
- **User Management**: Add, edit, and delete users
- **Exercise Management**: Create exercises, set targets, and add GIFs from ExerciseDB API
- **Analytics**: View overall gym performance and individual user stats

## Design
- Neo-brutalism style (inspired by saweria.co)
- Consolas font for monospace elements
- Two themes: Colorful (default) and Dark
- Responsive design with mobile-first approach

## Setup Instructions

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to your project settings → API
3. Copy the **Project URL** and **anon public** key
4. Open the `.env.local` file in your project and update:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 2. Set up Database

1. Go to your Supabase project → SQL Editor
2. Copy and run the SQL from `supabase-schema.sql` file
3. This will create:
   - `users` table (for gym users and owner)
   - `exercises` table (for workout exercises)
   - `workout_logs` table (for tracking actual workouts)
   - `check_ins` table (for tracking gym visits)

### 3. Set up ExerciseDB API (Optional)

To enable exercise GIF search:

1. Go to [RapidAPI - ExerciseDB](https://rapidapi.com/yi005/api/exercisedb)
2. Subscribe to the API (free tier available)
3. Get your API key
4. Update `.env.local`:
   ```
   EXERCISEDB_API_KEY=your-exercisedb-api-key
   ```

### 4. Default Credentials

The database setup includes a default owner account:
- **Username**: Owner
- **Password**: admin123

**Important**: Change the default password after first login!

## Usage

### For Users:

1. **Login**: Select your profile and enter your password
2. **Check In**: Go to Check-In tab and press "Check In"
3. **Workout**: Go to Home tab, select an exercise, and log your actual sets/reps
4. **Check Out**: Go to Check-Out tab and press "Check Out" when done
5. **Analytics**: View your progress in the Analytics tab

### For Owner:

1. **Login**: Select the Owner profile and enter password
2. **Dashboard**: View overall gym statistics
3. **Users**: Add new gym users or manage existing ones
4. **Exercises**: Create exercises, set target sets/reps, and add GIFs
5. **Analytics**: View detailed performance metrics for all users

## Deployment to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `EXERCISEDB_API_KEY` (optional)
4. Deploy!

## Default Exercises

The following exercises are included by default:

**Back:**
- Lat Pulldown
- Rowing
- Back-up Machine

**Legs:**
- Barbell Squat
- Hack Squat
- Hamstring Curl

**Chest:**
- Incline Press
- Chest Fly
- Dips

**Shoulder:**
- Shoulder Press
- Lateral Raise
- Reverse Peck Deck
- Dumbbell Rear Delt

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Login page (Netflix-style)
│   ├── home/                 # User home page with exercises
│   ├── exercise/             # Exercise detail page
│   ├── analytics/            # User analytics
│   ├── check-in/             # Check-in page
│   ├── check-out/            # Check-out page
│   └── admin/                # Admin dashboard
│       ├── page.tsx          # Admin dashboard
│       ├── users/            # User management
│       ├── exercises/        # Exercise management
│       └── analytics/        # Admin analytics
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── user-layout.tsx       # User layout with navbars
│   ├── admin-layout.tsx      # Admin layout with navbars
│   └── theme-provider.tsx    # Theme provider
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── store.ts              # Zustand store
└── app/
    ├── layout.tsx            # Root layout
    └── globals.css           # Global styles with themes
```

## Support

For issues or questions, please check:
- Supabase documentation: https://supabase.com/docs
- Next.js documentation: https://nextjs.org/docs
- Tailwind CSS documentation: https://tailwindcss.com/docs
