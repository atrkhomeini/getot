import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  role: 'owner' | 'user'
  avatar_color: string
}

export interface Exercise {
  id: string
  name: string
  category: 'back' | 'legs' | 'chest' | 'shoulder'
  target_sets: number
  target_reps: number
  gif_url: string
}

export interface WorkoutLog {
  id: string
  exercise_id: string
  actual_sets: number
  actual_reps: number
  date: string
}

export interface CheckIn {
  id: string
  check_in_time: string
  check_out_time: string | null
  duration_minutes: number | null
}

interface AppState {
  // Auth
  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  // Theme
  isDark: boolean
  toggleTheme: () => void

  // Exercise
  selectedExercise: Exercise | null
  setSelectedExercise: (exercise: Exercise | null) => void

  // Check-in/out
  currentCheckIn: CheckIn | null
  setCurrentCheckIn: (checkIn: CheckIn | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      isDark: false,
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),

      selectedExercise: null,
      setSelectedExercise: (exercise) => set({ selectedExercise: exercise }),

      currentCheckIn: null,
      setCurrentCheckIn: (checkIn) => set({ currentCheckIn: checkIn }),
    }),
    {
      name: 'gym-app-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isDark: state.isDark,
        currentCheckIn: state.currentCheckIn,
      }),
    }
  )
)
