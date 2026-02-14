'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { Dumbbell, ArrowRight } from 'lucide-react'

type Exercise = Database['public']['Tables']['exercises']['Row']

const categoryColors: Record<string, string> = {
  back: 'var(--secondary)',
  legs: 'var(--accent)',
  chest: 'var(--primary)',
  shoulder: 'var(--muted)',
}

const categoryIcons: Record<string, string> = {
  back: '🏋️',
  legs: '🦵',
  chest: '💪',
  shoulder: '🎯',
}

export default function HomePage() {
  const router = useRouter()
  const { currentUser, setSelectedExercise } = useAppStore()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }
    fetchExercises()
  }, [currentUser, router])

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('category', { ascending: true })

      if (error) throw error
      setExercises(data || [])
    } catch (err) {
      console.error('Error fetching exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    router.push('/exercise')
  }

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = []
    }
    acc[exercise.category].push(exercise)
    return acc
  }, {} as Record<string, Exercise[]>)

  const categoryOrder = ['back', 'chest', 'shoulder', 'legs']

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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Today's Workout
          </h1>
          <p className="font-mono text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

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
                    className="neo-card bg-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all cursor-pointer text-left"
                  >
                    {/* Exercise GIF/Image */}
                    <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                      {exercise.gif_url ? (
                        <img
                          src={exercise.gif_url}
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
                            {exercise.target_sets} × {exercise.target_reps} x {exercise.target_weight || 0}
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
              No exercises found
            </h3>
            <p className="font-mono text-muted-foreground">
              Ask your gym owner to add exercises to your workout plan
            </p>
          </div>
        )}
      </div>
    </UserLayout>
  )
}
