'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { Calendar, Clock, MessageSquare, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'] & {
  exercises: {
    name: string
    category: string
  }
}

const categoryColors: Record<string, string> = {
  back: 'var(--secondary)',
  chest: 'var(--primary)',
  shoulder: 'var(--accent)',
  leg: 'var(--muted)',
  arm: '#FF6B6B',
  core: '#06B6D4',
}

export default function HistoryPage() {
  const router = useRouter()
  const { currentUser } = useAppStore()
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }
    fetchHistory()
  }, [currentUser, router])

  const fetchHistory = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          exercises (name, category)
        `)
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .limit(30)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  const groupedByDate = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {} as Record<string, WorkoutLog[]>)

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading history...</div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Workout History
          </h1>
          <p className="font-mono text-muted-foreground">
            Review your past workouts and notes
          </p>
        </div>

        {Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No workout history</h3>
            <p className="font-mono text-muted-foreground">
              Complete some workouts to see your history here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dayLogs]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-foreground">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h2>
                  <span className="text-sm text-muted-foreground font-mono">
                    ({dayLogs.length} exercises)
                  </span>
                </div>

                <div className="space-y-3">
                  {dayLogs.map((log) => {
                    const hasNotes = log.notes || 
                      (log.sets_data && (log.sets_data as any[]).some((s: any) => s.notes))
                    const isExpanded = expandedLog === log.id

                    return (
                      <div
                        key={log.id}
                        className="neo-card bg-card rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => hasNotes && setExpandedLog(isExpanded ? null : log.id)}
                          className={cn(
                            "w-full p-4 text-left",
                            hasNotes && "cursor-pointer hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: categoryColors[log.exercises?.category] || 'var(--muted)' }}
                              />
                              <div>
                                <p className="font-bold text-foreground">
                                  {log.exercises?.name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {log.actual_sets} × {log.actual_reps} @ {log.weight}kg
                                </p>
                              </div>
                            </div>
                            {hasNotes && (
                              <div className="flex items-center gap-2 text-primary">
                                <MessageSquare className="w-4 h-4" />
                                <ChevronDown className={cn(
                                  "w-4 h-4 transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Expanded Notes */}
                        {isExpanded && hasNotes && (
                          <div className="px-4 pb-4 border-t border-border pt-3">
                            {/* Session Notes */}
                            {log.notes && (
                              <div className="mb-3 p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground font-mono mb-1">
                                  📝 Session Notes:
                                </p>
                                <p className="text-sm text-foreground font-mono">
                                  {log.notes}
                                </p>
                              </div>
                            )}

                            {/* Per-Set Notes */}
                            {log.sets_data && (log.sets_data as any[]).some((s: any) => s.notes) && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground font-mono mb-2">
                                  Set Notes:
                                </p>
                                <div className="space-y-2">
                                  {(log.sets_data as any[])
                                    .filter((s: any) => s.notes)
                                    .map((s: any) => (
                                      <div key={s.set_number} className="flex gap-2">
                                        <span className="text-xs font-mono text-primary font-bold">
                                          Set {s.set_number}:
                                        </span>
                                        <span className="text-xs font-mono text-foreground">
                                          {s.notes}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}