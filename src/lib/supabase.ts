import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          password: string
          role: 'owner' | 'user'
          avatar_color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          password: string
          role: 'owner' | 'user'
          avatar_color: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          password?: string
          role?: 'owner' | 'user'
          avatar_color?: string
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          category: 'back' | 'legs' | 'chest' | 'shoulder'
          target_sets: number
          target_reps: number
          target_weight: number
          gif_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: 'back' | 'legs' | 'chest' | 'shoulder'
          target_sets: number
          target_reps: number
          gif_url: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: 'back' | 'legs' | 'chest' | 'shoulder'
          target_sets?: number
          target_reps?: number
          gif_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          actual_sets: number
          actual_reps: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          actual_sets: number
          actual_reps: number
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string
          actual_sets?: number
          actual_reps?: number
          date?: string
          created_at?: string
        }
      }
      check_ins: {
        Row: {
          id: string
          user_id: string
          check_in_time: string
          check_out_time: string | null
          duration_minutes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          check_in_time?: string
          check_out_time?: string | null
          duration_minutes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          check_in_time?: string
          check_out_time?: string | null
          duration_minutes?: number | null
          created_at?: string
        }
      }
    }
  }
}
