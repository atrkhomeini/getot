'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { ArrowLeft, Calendar, MessageSquare, Clock } from 'lucide-react'

type WorkoutLog = {
  id: string
  date: string
  notes: string | null
  sets_data: any
  actual_sets: number
  actual_reps: number
  weight: number
  exercises: { name: string; category: string }
}

const categoryColors: Record<string, string> = {
  back: 'var(--secondary)',
  chest: 'var(--primary)',
  shoulder: 'var(--accent)',
  leg: 'var(--muted)',
  arm: '#FF6B6B',
  core: '#06B6D4',
}

export default function UserHistoryPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [userName, setUserName] = useState('')
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      // 1. Get user name
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

      if (user) setUserName(user.name)

      // 2. Get workout logs - USE * TO GET ALL COLUMNS
      const { data: logsData, error } = await supabase
        .from('workout_logs')
        .select(`*, exercises ( name, category )`)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(100)

      if (error) throw error

      // Debug: Log the data to check if notes exist
      console.log('Fetched logs:', logsData)

      setLogs(logsData || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <AdminLayout><div className="p-6 font-mono">Loading...</div></AdminLayout>
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm">Back to Users</span>
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          📝 {userName}'s Workout History
        </h1>
        <p className="font-mono text-muted-foreground mb-8">
          View workout notes and feedback
        </p>

        {logs.length === 0 ? (
          <div className="text-center py-16 neo-card bg-card rounded-2xl">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="font-mono text-muted-foreground">
              No workout logs found for this user
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => {
              // Ensure sets_data is an array
              const setsArray = Array.isArray(log.sets_data) ? log.sets_data : []
              
              // Check if notes exist
              const hasSessionNotes = log.notes && log.notes.trim() !== ''
              const hasSetNotes = setsArray.some((s: any) => s.notes && s.notes.trim() !== '')
              const hasNotes = hasSessionNotes || hasSetNotes

              return (
                <div key={log.id} className="neo-card bg-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: categoryColors[log.exercises?.category] || 'var(--muted)' }} 
                        />
                        <p className="font-bold text-foreground">{log.exercises?.name || 'Unknown Exercise'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(log.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })} • {log.actual_sets}×{log.actual_reps} @ {log.weight}kg
                      </p>
                    </div>
                  </div>

                  {hasNotes ? (
                    <div className="space-y-2 mt-3">
                      {/* Session Notes */}
                      {hasSessionNotes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground font-mono mb-1">📝 Session Notes:</p>
                          <p className="text-sm text-foreground font-mono">{log.notes}</p>
                        </div>
                      )}

                      {/* Per-Set Notes */}
                      {hasSetNotes && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground font-mono mb-2">💪 Set Notes:</p>
                          <div className="space-y-1">
                            {setsArray
                              .filter((s: any) => s.notes && s.notes.trim() !== '')
                              .map((s: any) => (
                                <p key={s.set_number} className="text-xs font-mono text-foreground">
                                  Set {s.set_number}: {s.notes}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono mt-2">
                      No notes for this workout
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}