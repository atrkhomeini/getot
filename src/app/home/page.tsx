'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { Dumbbell, ArrowRight, Calendar, Check } from 'lucide-react'

type Exercise = Database['public']['Tables']['exercises']['Row']

const categoryColors: Record<string, string> = {
  back: 'var(--secondary)',
  leg: 'var(--accent)',
  chest: 'var(--primary)',
  shoulder: 'var(--muted)',
  arm: '#FF6B6B',
}

const categoryIcons: Record<string, string> = {
  back: '🏋️',
  leg: '🦵',
  chest: '💪',
  shoulder: '🎯',
  arm: '💪',
}

export default function HomePage() {
  const router = useRouter()
  const { currentUser, setSelectedExercise } = useAppStore()
  const [exercises, setExercises] = useState<(Exercise & { completed?: boolean })[]>([])
  const [currentDayNumber, setCurrentDayNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showWeekView, setShowWeekView] = useState(false)
  const [weekSequence, setWeekSequence] = useState<any[]>([])
  const [totalDays, setTotalDays] = useState(0)

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }
    fetchExercises()
  }, [currentUser, router])

  useEffect(() => {
    if (showWeekView && currentUser) {
      fetchWeekSequence()
    }
  }, [showWeekView, currentUser])

  const fetchExercises = async () => {
    if (!currentUser) return

    try {
      // Step 1: Get user's current progress
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError
      }

      const currentDay = progress?.current_day_number || 1
      setCurrentDayNumber(currentDay)

      // Step 2: Get today's incomplete session (if any)
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySession } = await supabase
        .from('workout_sessions')
        .select('exercises_completed, is_complete')
        .eq('user_id', currentUser.id)
        .eq('day_number', currentDay)
        .eq('is_complete', false)
        .gte('started_at', today)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Step 3: Fetch exercises for current day
      const { data: sequences, error: sequencesError } = await supabase
        .from('workout_sequences')
        .select(`
          exercises (*)
        `)
        .eq('user_id', currentUser.id)
        .eq('day_number', currentDay)
        .order('sort_order', { ascending: true })

      if (sequencesError) throw sequencesError

      const exercises = sequences?.map(s => ({
        ...s.exercises,
        completed: todaySession?.exercises_completed?.includes(s.exercises.id) || false,
      })) || []

      setExercises(exercises)
    } catch (err) {
      console.error('Error fetching exercises:', err)
      // Fallback: if sequence doesn't exist, show all exercises
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('*')
        .order('category', { ascending: true })
      
      if (allExercises) {
        setExercises(allExercises)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchWeekSequence = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('workout_sequences')
        .select(`
          *,
          exercises (*)
        `)
        .eq('user_id', currentUser.id)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) throw error

      setWeekSequence(data || [])
      
      // Calculate total days
      const days = new Set(data?.map(s => s.day_number))
      setTotalDays(days.size)
    } catch (err) {
      console.error('Error fetching week sequence:', err)
    }
  }

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    router.push('/exercise')
  }

  const handleToggleView = () => {
    setShowWeekView(!showWeekView)
    if (!showWeekView) {
      fetchWeekSequence()
    } else {
      fetchExercises()
    }
  }

  const handleDayClick = (dayNumber: number) => {
    setCurrentDayNumber(dayNumber)
    setShowWeekView(false)
    fetchExercisesForDay(dayNumber)
  }

  const fetchExercisesForDay = async (dayNumber: number) => {
    if (!currentUser) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: todaySession } = await supabase
        .from('workout_sessions')
        .select('exercises_completed, is_complete')
        .eq('user_id', currentUser.id)
        .eq('day_number', dayNumber)
        .eq('is_complete', false)
        .gte('started_at', today)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: sequences, error } = await supabase
        .from('workout_sequences')
        .select(`
          exercises (*)
        `)
        .eq('user_id', currentUser.id)
        .eq('day_number', dayNumber)
        .order('sort_order', { ascending: true })

      if (error) throw error

      const exercises = sequences?.map(s => ({
        ...s.exercises,
        completed: todaySession?.exercises_completed?.includes(s.exercises.id) || false,
      })) || []

      setExercises(exercises)
    } catch (err) {
      console.error('Error fetching exercises for day:', err)
    }
  }

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = []
    }
    acc[exercise.category].push(exercise)
    return acc
  }, {} as Record<string, (Exercise & { completed?: boolean })[]>)

  const categoryOrder = ['back', 'chest', 'shoulder', 'leg', 'arm']

  const getSequenceForDay = (dayNumber: number) => {
    return weekSequence.filter(s => s.day_number === dayNumber)
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading exercises...</div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {showWeekView ? 'Weekly Workout Plan' : `Day ${currentDayNumber} Workout`}
              </h1>
              <p className="font-mono text-muted-foreground">
                {showWeekView 
                  ? `${totalDays} day sequence • ${weekSequence.length} total exercises`
                  : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                }
              </p>
            </div>
            <button
              onClick={handleToggleView}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-mono text-sm hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              {showWeekView ? (
                <>
                  <Dumbbell className="w-4 h-4" />
                  Today Only
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  View Week
                </>
              )}
            </button>
          </div>
        </div>

        {/* Week View */}
        {showWeekView && (
          <div className="space-y-6">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(dayNumber => {
              const daySequence = getSequenceForDay(dayNumber)
              const isToday = dayNumber === currentDayNumber

              if (daySequence.length === 0) return null

              return (
                <div key={dayNumber} className="mb-8">
                  <button
                    onClick={() => handleDayClick(dayNumber)}
                    className={`w-full text-left mb-4 flex items-center gap-3 p-4 rounded-xl transition-all ${
                      isToday 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                      isToday ? 'bg-primary-foreground text-primary' : 'bg-background'
                    }`}>
                      {dayNumber}
                    </div>
                    <div className="flex-1">
                      <h2 className={`text-xl font-bold ${isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                        Day {dayNumber}
                        {isToday && <span className="ml-2 text-sm font-normal">(Today)</span>}
                      </h2>
                      <p className={`text-sm font-mono ${isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {daySequence.length} exercise{daySequence.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowRight className={`w-5 h-5 ${isToday ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {daySequence.map((item: any) => {
                      const exercise = item.exercises
                      const completed = item.completed || false

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleExerciseClick(exercise)}
                          className="neo-card bg-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all cursor-pointer text-left relative"
                        >
                          {completed && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          
                          <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                            {exercise.gif_url ? (
                              <img
                                src={exercise.gif_url}
                                alt={exercise.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <Dumbbell className="w-12 h-12 text-muted-foreground/50" />
                            )}
                          </div>

                          <div className="p-4">
                            <h3 className="font-bold text-lg text-foreground mb-2">
                              {exercise.name}
                            </h3>
                            <div className="flex items-center justify-between text-sm font-mono">
                              <span className="text-muted-foreground">
                                {exercise.target_sets} × {exercise.target_reps} × {(exercise.target_weight || 0)}kg
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {weekSequence.length === 0 && (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No workout sequence set
                </h3>
                <p className="font-mono text-muted-foreground">
                  Contact your gym owner to create your workout plan
                </p>
              </div>
            )}
          </div>
        )}

        {/* Today's View */}
        {!showWeekView && (
          <>
            {/* Exercise Categories */}
            {categoryOrder.map((category) => {
              const categoryExercises = groupedExercises[category]
              if (!categoryExercises || categoryExercises.length === 0) return null

              return (
                <div key={category} className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{categoryIcons[category]}</span>
                    <h2 className="text-2xl font-bold text-foreground capitalize">
                      {category}
                    </h2>
                    <div className="h-1 flex-1 bg-border rounded-full" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoryExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => handleExerciseClick(exercise)}
                        className={`neo-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all cursor-pointer text-left relative ${
                          exercise.completed ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950/20' : 'bg-card'
                        }`}
                      >
                        {exercise.completed && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        {/* Exercise GIF/Image */}
                        <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                          {exercise.gif_url ? (
                            <img
                              src={exercise.gif_url.startsWith('/') ? exercise.gif_url : exercise.gif_url}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div
                            className="hidden absolute inset-0 flex items-center justify-center"
                            style={{ backgroundColor: categoryColors[category] }}
                          >
                            <Dumbbell className="w-12 h-12 text-white opacity-50" />
                          </div>
                        </div>
                        {/* Exercise Info */}
                        <div className="p-4">
                          <h3 className="font-bold text-lg text-foreground mb-2">
                            {exercise.name}
                          </h3>

                          <div className="flex items-center justify-between text-sm font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Target:</span>
                              <span className="font-bold text-foreground">
                                {exercise.target_sets} × {exercise.target_reps} × {(exercise.target_weight || 0)}
                                <span className="text-xs ml-1">kg</span>
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

            {exercises.length === 0 && (
              <div className="text-center py-16">
                <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No exercises for today
                </h3>
                <p className="font-mono text-muted-foreground mb-4">
                  {totalDays > 0 
                    ? `You're on Day ${currentDayNumber} of ${totalDays}`
                    : 'Ask your gym owner to create your workout sequence'
                  }
                </p>
                {totalDays > 0 && (
                  <button
                    onClick={handleToggleView}
                    className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-mono text-sm hover:bg-secondary/80 transition-colors"
                  >
                    View Full Week
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  )
}