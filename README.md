# 💪 Gym Guide and Logbook

A comprehensive gym guide and logbook web application built with Next.js 16, Supabase, and Tailwind CSS. Track workouts, monitor progress, and manage gym members with a beautiful neo-brutalism design.

## ✨ Features

### For Users:
- **🎬 Netflix-style Login**: User grid display for easy profile access
- **🏋️ Home Page**: Exercise cards grouped by muscle group with animated GIFs
- **📊 Exercise Details**: Track target vs actual sets and reps with progress visualization
- **📈 Analytics**:
  - Line chart comparing actual vs target performance
  - GitHub-style consistency graph for workout tracking
- **✅ Check-in/Check-out**: Simple one-button tracking for gym visits
- **🎨 Beautiful UI**: Neo-brutalism design inspired by saweria.co

### For Owner/Admin:
- **📊 Dashboard**: Real-time overview of all user activity and gym statistics
- **👥 User Management**: Add, edit, and delete gym members
- **💪 Exercise Management**:
  - Create custom exercises with target sets/reps
  - Search and add GIFs from ExerciseDB API
  - Organize by muscle groups (back, chest, shoulders, legs)
- **📈 Analytics**: View detailed performance metrics for all users
- **🔐 Admin Panel**: Database-style interface for complete gym management

## 🎨 Design

- **Style**: Neo-brutalism (inspired by saweria.co)
- **Font**: Consolas for monospace elements, Space Grotesk for headings
- **Themes**:
  - 🌈 Colorful (default) - Bright, vibrant colors
  - 🌙 Dark - Dark mode for night workouts
- **Responsive**: Mobile-first design with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and bun
- A Supabase account (free tier available)
- (Optional) ExerciseDB API key for GIF search

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up environment variables**:
   Copy `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXERCISEDB_API_KEY=your-exercisedb-api-key  # Optional
   ```

3. **Set up Supabase database**:
   - Go to your Supabase project → SQL Editor
   - Run the SQL from `supabase-schema.sql`

4. **Start development server**:
   ```bash
   bun run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

### Default Credentials

- **Owner Login**: Username "Owner", Password "admin123"
- ⚠️ **Important**: Change the default password after first login!

## 📱 Usage

### For Gym Members:

1. **Login**: Select your profile and enter your password
2. **Check In**: Tap "Check In" when you arrive at the gym
3. **Workout**: Go to Home → Select exercise → Log your sets/reps
4. **Check Out**: Tap "Check Out" when you're done
5. **Track Progress**: View analytics to see your improvements

### For Gym Owner:

1. **Login**: Select Owner profile and enter password
2. **Dashboard**: View overall gym statistics and recent activity
3. **Manage Users**: Add new members or edit existing ones
4. **Create Exercises**:
   - Go to Exercises → Add Exercise
   - Enter name, category, target sets/reps
   - Click the search icon to find GIFs from ExerciseDB
5. **View Analytics**: See detailed performance metrics for all users

## 🗄️ Database Schema

### Tables:
- **users**: Gym members and owner accounts
- **exercises**: Workout exercises with targets and GIFs
- **workout_logs**: User's actual workout records
- **check_ins**: Check-in/check-out timestamps and duration

## 🏋️ Default Exercises

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

## 🛠️ Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 📦 Deployment to Vercel

1. Push your code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `EXERCISEDB_API_KEY` (optional)
4. Deploy! 🚀

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Login page (Netflix-style)
│   ├── home/                 # User home with exercises
│   ├── exercise/             # Exercise detail & logging
│   ├── analytics/            # User analytics & progress
│   ├── check-in/             # Check-in page
│   ├── check-out/            # Check-out page
│   ├── admin/                # Admin dashboard
│   │   ├── page.tsx          # Admin overview
│   │   ├── users/            # User management
│   │   ├── exercises/        # Exercise management
│   │   └── analytics/        # Admin analytics
│   └── api/                  # API routes
│       ├── exercises/        # ExerciseDB API integration
│       └── search-exercise/  # GIF search
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── user-layout.tsx       # User layout with navbars
│   ├── admin-layout.tsx      # Admin layout with sidebar
│   └── theme-provider.tsx    # Theme provider
├── lib/
│   ├── supabase.ts           # Supabase client
│   └── store.ts              # Zustand state management
└── app/
    ├── layout.tsx            # Root layout
    └── globals.css           # Global styles & themes
```

## 📖 Documentation

For detailed setup instructions, see [GYM_SETUP.md](./GYM_SETUP.md)

## 🤝 Contributing

This project is built with love for the fitness community. Feel free to fork and customize for your gym!

## 📄 License

MIT License - feel free to use this project for your personal or commercial gym.

---

Built with 💪 for fitness enthusiasts everywhere! 🚀
