# 💪 Getot — Gym Logbook App

A comprehensive gym guide and logbook to track workouts, monitor progress, and manage gym users.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | ![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black) |
| Backend | ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white) |
| UI Components | ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?logo=radixui&logoColor=white) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts-FF6384?logo=chartdotjs&logoColor=white) |
| State & Storage | ![Zustand](https://img.shields.io/badge/Zustand-443E38?logo=react&logoColor=white) |
| DevOps | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white) |

---

## ✨ Features

- **User Authentication** — Simple user selection with password login
- **Workout Sequences** — Admin can create rolling day-by-day workout plans per user
- **Exercise Tracking** — Log sets, reps, and weight for each exercise with per-set breakdown
- **Check-in / Check-out** — Track gym session time and auto-advance workout day
- **Analytics** — View progress charts, consistency graph, and per-category stats
- **Admin Dashboard** — Manage users, exercises, and sequences
- **PWA Support** — Installable on mobile devices
- **Dark / Light Mode** — Theme toggle with neo-brutalism design

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/getot.git
cd getot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXERCISEDB_API_KEY=your_rapidapi_key  # optional
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

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
