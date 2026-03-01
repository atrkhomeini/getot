'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { List, Plus, Trash2, Users, Dumbbell, ArrowRight, CheckCircle2, Globe, GripVertical, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type User = Database['public']['Tables']['users']['Row']
type Exercise = Database['public']['Tables']['exercises']['Row'] & {
  users?: { name: string } | null
}

type SequenceItem = {
  id: string
  user_id: string
  exercise_id: string
  day_number: number
  sort_order: number
  exercises: Exercise
}

const CATEGORY_COLORS: Record<string, string> = {
  back: 'hsl(var(--secondary))',
  chest: 'hsl(var(--primary))',
  shoulder: 'hsl(var(--accent))',
  leg: 'hsl(var(--muted))',
  arm: '#FF6B6B',
}

const CATEGORY_ICONS: Record<string, string> = {
  back: '/icons/back.png',
  leg: '/icons/leg.png',
  chest: '/icons/chest.png',
  shoulder: '/icons/shoulder.png',
  arm: '/icons/arm.png',
}

const ALL_CATEGORIES = ['back', 'chest', 'shoulder', 'leg', 'arm'] as const

// Sortable Exercise Item Component
function SortableExerciseItem({ 
  item, 
  index, 
  isLast, 
  onRemove 
}: { 
  item: SequenceItem
  index: number
  isLast: boolean
  onRemove: (id: string) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-muted rounded-lg group ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs font-bold text-muted-foreground">
        {index + 1}
      </div>
      
      <div className="w-6 h-6 flex items-center justify-center">
        <img 
          src={CATEGORY_ICONS[item.exercises?.category] || '/icons/arm.png'} 
          alt={item.exercises?.category || 'exercise'}
          className="w-5 h-5 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      
      <div
        className="w-3 h-3 rounded flex-shrink-0"
        style={{ backgroundColor: CATEGORY_COLORS[item.exercises?.category] || 'hsl(var(--muted))' }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-foreground text-sm">
            {item.exercises?.name}
          </p>
          {item.exercises?.users?.name && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
              {item.exercises.users.name}
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          {item.exercises?.target_sets} × {item.exercises?.target_reps} × {(item.exercises?.target_weight || 0)}kg
        </p>
      </div>
      
      {!isLast && !isDragging && (
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      
      <Button
        onClick={() => onRemove(item.id)}
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default function AdminSequencePage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [sequence, setSequence] = useState<SequenceItem[]>([])
  const [userProgress, setUserProgress] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [savingOrder, setSavingOrder] = useState(false)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, exercisesRes] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase
          .from('exercises')
          .select(`
            *,
            users (name)
          `)
          .order('category'),
      ])

      if (usersRes.error) throw usersRes.error
      if (exercisesRes.error) throw exercisesRes.error

      setUsers(usersRes.data || [])
      setExercises(exercisesRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSequence = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_sequences')
        .select(`
          *,
          exercises (
            *,
            users (name)
          )
        `)
        .eq('user_id', userId)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) throw error
      setSequence(data || [])

      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      setUserProgress(progress)
    } catch (err) {
      console.error('Error fetching sequence:', err)
    }
  }

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    fetchSequence(user.id)
  }

  const handleAddExercise = async (exerciseId: string, dayNumber: number) => {
    if (!selectedUser) return

    try {
      const { data: existing } = await supabase
        .from('workout_sequences')
        .select('sort_order')
        .eq('user_id', selectedUser.id)
        .eq('day_number', dayNumber)
        .order('sort_order', { ascending: false })
        .limit(1)

      const sortOrder = existing?.[0]?.sort_order + 1 || 0

      const { error } = await supabase
        .from('workout_sequences')
        .insert({
          user_id: selectedUser.id,
          exercise_id: exerciseId,
          day_number: dayNumber,
          sort_order: sortOrder,
        })

      if (error) throw error
      toast.success('Exercise added to sequence!')
      fetchSequence(selectedUser.id)
    } catch (err) {
      console.error('Error adding exercise:', err)
      toast.error('Failed to add exercise')
    }
  }

  const handleRemoveExercise = async (sequenceId: string) => {
    if (!confirm('Remove this exercise from the sequence?')) return

    try {
      const { error } = await supabase
        .from('workout_sequences')
        .delete()
        .eq('id', sequenceId)

      if (error) throw error
      toast.success('Exercise removed from sequence!')
      fetchSequence(selectedUser!.id)
    } catch (err) {
      console.error('Error removing exercise:', err)
      toast.error('Failed to remove exercise')
    }
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const dayNumber = selectedDay
    if (!dayNumber) return

    const daySequence = getSequenceForDay(dayNumber)
    const oldIndex = daySequence.findIndex(item => item.id === active.id)
    const newIndex = daySequence.findIndex(item => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic update
    const newOrder = arrayMove(daySequence, oldIndex, newIndex)
    
    // Update local state immediately
    const updatedSequence = [...sequence]
    newOrder.forEach((item, index) => {
      const seqIndex = updatedSequence.findIndex(s => s.id === item.id)
      if (seqIndex !== -1) {
        updatedSequence[seqIndex] = { ...updatedSequence[seqIndex], sort_order: index }
      }
    })
    setSequence(updatedSequence)

    // Save to database
    setSavingOrder(true)
    try {
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }))

      // Update each item's sort_order
      for (const update of updates) {
        const { error } = await supabase
          .from('workout_sequences')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)

        if (error) throw error
      }

      toast.success('Order saved!')
    } catch (err) {
      console.error('Error saving order:', err)
      toast.error('Failed to save order')
      // Revert on error
      fetchSequence(selectedUser!.id)
    } finally {
      setSavingOrder(false)
    }
  }

  const handleResetProgress = async () => {
    if (!selectedUser) return
    if (!confirm(`Reset ${selectedUser.name}'s progress back to Day 1?`)) return

    try {
      const { error } = await supabase
        .from('user_progress')
        .update({
          current_day_number: 1,
          total_workouts_completed: 0,
          last_workout_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', selectedUser.id)

      if (error) throw error
      toast.success('Progress reset successfully!')
      fetchSequence(selectedUser.id)
    } catch (err) {
      console.error('Error resetting progress:', err)
      toast.error('Failed to reset progress')
    }
  }

  const handleSetDay = async (dayNumber: number) => {
    if (!selectedUser) return
    if (!confirm(`Set ${selectedUser.name}'s current day to Day ${dayNumber}?`)) return

    try {
      const { error } = await supabase
        .from('user_progress')
        .update({
          current_day_number: dayNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', selectedUser.id)

      if (error) throw error
      toast.success(`Progress updated to Day ${dayNumber}!`)
      fetchSequence(selectedUser.id)
    } catch (err) {
      console.error('Error setting day:', err)
      toast.error('Failed to set day')
    }
  }

  const getSequenceForDay = (dayNumber: number) => {
    return sequence
      .filter(s => s.day_number === dayNumber)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  // Filter exercises by user and category
  const getFilteredExercises = () => {
    if (!selectedUser) return exercises
    
    let filtered = exercises.filter(ex => 
      !ex.created_for_user_id || 
      ex.created_for_user_id === selectedUser.id
    )

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ex => ex.category === selectedCategory)
    }

    return filtered
  }

  // Group exercises by "Created For" and Category
  const getGroupedExercises = () => {
    const filtered = getFilteredExercises()
    
    const globalExercises = filtered.filter(ex => !ex.created_for_user_id)
    const userExercises = filtered.filter(ex => ex.created_for_user_id === selectedUser?.id)
    
    return { globalExercises, userExercises }
  }

  // Group exercises by category within a list
  const groupByCategory = (exerciseList: Exercise[]) => {
    return exerciseList.reduce((acc, ex) => {
      if (!acc[ex.category]) {
        acc[ex.category] = []
      }
      acc[ex.category].push(ex)
      return acc
    }, {} as Record<string, Exercise[]>)
  }

  const maxDay = sequence.length > 0 ? Math.max(...sequence.map(s => s.day_number)) : 0

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Manage Workout Sequences
          </h1>
          <p className="font-mono text-muted-foreground">
            Create rolling workout sequences that progress automatically
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Select User
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users
              .filter(u => u.role === 'user')
              .map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`neo-card rounded-xl p-4 text-left transition-all ${
                    selectedUser?.id === user.id
                      ? 'border-2 border-primary bg-primary/5'
                      : 'border-2 border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: user.avatar_color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{user.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {selectedUser && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <List className="w-5 h-5" />
                    {selectedUser.name}'s Workout Sequence
                  </h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-muted-foreground">
                      {maxDay} day{maxDay !== 1 ? 's' : ''} • {sequence.length} exercises total
                    </span>
                    {userProgress && (
                      <span className="font-mono text-primary font-bold">
                        Currently on Day {userProgress.current_day_number}
                      </span>
                    )}
                  </div>
                </div>
                {userProgress && (
                  <Button
                    onClick={handleResetProgress}
                    variant="outline"
                    size="sm"
                    className="neo-button font-mono text-destructive border-destructive/50 hover:bg-destructive/10"
                  >
                    Reset Progress
                  </Button>
                )}
              </div>
            </div>

            {/* Drag instruction */}
            {maxDay > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm font-mono text-muted-foreground">
                💡 Drag and drop exercises to reorder them within a day
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                {Array.from({ length: maxDay }, (_, i) => i + 1).map(dayNumber => {
                  const daySequence = getSequenceForDay(dayNumber)
                  const isCurrentDay = userProgress?.current_day_number === dayNumber
                  const isPastDay = userProgress && userProgress.current_day_number > dayNumber

                  return (
                    <div
                      key={dayNumber}
                      className={`neo-card bg-card rounded-2xl p-6 transition-all ${
                        isCurrentDay ? 'border-2 border-primary' : ''
                      } ${isPastDay ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                            isCurrentDay ? 'bg-primary' : isPastDay ? 'bg-green-500' : 'bg-muted text-muted-foreground'
                          }`}>
                            {isPastDay ? <CheckCircle2 className="w-5 h-5" /> : dayNumber}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                              Day {dayNumber}
                              {isCurrentDay && <span className="ml-2 text-sm font-normal text-muted-foreground">(Current)</span>}
                              {isPastDay && <span className="ml-2 text-sm font-normal text-green-600">(Completed)</span>}
                            </h3>
                            <span className="text-sm font-mono text-muted-foreground">
                              {daySequence.length} exercise{daySequence.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {userProgress && (
                            <Button
                              onClick={() => handleSetDay(dayNumber)}
                              size="sm"
                              variant="ghost"
                              className="neo-button font-mono text-xs"
                              title="Set as current day"
                            >
                              Set Current
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              setSelectedDay(dayNumber)
                              setDialogOpen(true)
                            }}
                            size="sm"
                            variant="outline"
                            className="neo-button font-mono"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Exercise
                          </Button>
                        </div>
                      </div>

                      {daySequence.length > 0 ? (
                        <SortableContext
                          items={daySequence.map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {daySequence.map((item, index) => (
                              <SortableExerciseItem
                                key={item.id}
                                item={item}
                                index={index}
                                isLast={index === daySequence.length - 1}
                                onRemove={handleRemoveExercise}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                          No exercises in this day yet
                        </div>
                      )}
                    </div>
                  )
                })}

                <button
                  onClick={() => {
                    setSelectedDay(maxDay + 1)
                    setDialogOpen(true)
                  }}
                  className="w-full neo-card bg-card rounded-2xl p-6 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Plus className="w-5 h-5" />
                    <span className="font-bold">Add Day {maxDay + 1}</span>
                  </div>
                </button>
              </div>
            </DndContext>
          </>
        )}

        {!selectedUser && users.filter(u => u.role === 'user').length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No users yet</h3>
            <p className="font-mono text-muted-foreground mb-4">
              Add users first, then you can create their workout sequences
            </p>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="neo-card bg-card max-w-2xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="font-bold text-2xl">
                Add Exercise to Day {selectedDay} for {selectedUser?.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground font-mono">
                Showing exercises created for {selectedUser?.name} and global exercises
              </p>
            </DialogHeader>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2 px-1 pb-3 border-b">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">Filter:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  All
                </button>
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-colors capitalize flex items-center gap-1 ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[50vh]">
              {(() => {
                const { globalExercises, userExercises } = getGroupedExercises()
                
                return (
                  <div className="space-y-4">
                    {/* User-specific exercises */}
                    {userExercises.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: selectedUser?.avatar_color }}
                          />
                          <span className="text-sm font-bold text-foreground font-mono">
                            Created for {selectedUser?.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({userExercises.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(() => {
                            const grouped = groupByCategory(userExercises)
                            return Object.entries(grouped).map(([category, exs]) => (
                              <div key={category}>
                                {selectedCategory === 'all' && userExercises.length > 0 && (
                                  <div className="flex items-center gap-2 mb-1 mt-2 px-1">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                                    />
                                    <span className="text-xs font-mono text-muted-foreground capitalize">
                                      {category}
                                    </span>
                                  </div>
                                )}
                                {exs.map(exercise => {
                                  const isAlreadyInSequence = sequence.some(
                                    s => s.exercise_id === exercise.id && s.day_number === selectedDay
                                  )
                                  
                                  return (
                                    <button
                                      key={exercise.id}
                                      onClick={() => selectedDay !== null && !isAlreadyInSequence && handleAddExercise(exercise.id, selectedDay)}
                                      disabled={isAlreadyInSequence}
                                      className="w-full p-4 rounded-xl bg-primary/5 border-2 border-primary/20 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                          <img 
                                            src={CATEGORY_ICONS[exercise.category] || '/icons/arm.png'} 
                                            alt={exercise.category}
                                            className="w-5 h-5 object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        </div>
                                        <div
                                          className="w-3 h-3 rounded flex-shrink-0"
                                          style={{ backgroundColor: CATEGORY_COLORS[exercise.category] || 'hsl(var(--muted))' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-foreground truncate">{exercise.name}</p>
                                          <p className="text-xs font-mono text-muted-foreground">
                                            {exercise.target_sets} × {exercise.target_reps} × {(exercise.target_weight || 0)}kg
                                          </p>
                                        </div>
                                        {isAlreadyInSequence ? (
                                          <span className="text-xs font-mono text-muted-foreground">Already added</span>
                                        ) : (
                                          <Plus className="w-5 h-5 text-primary" />
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* Global exercises */}
                    {globalExercises.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-bold text-foreground font-mono">
                            Global Exercises
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({globalExercises.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(() => {
                            const grouped = groupByCategory(globalExercises)
                            return Object.entries(grouped).map(([category, exs]) => (
                              <div key={category}>
                                {selectedCategory === 'all' && globalExercises.length > 0 && (
                                  <div className="flex items-center gap-2 mb-1 mt-2 px-1">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                                    />
                                    <span className="text-xs font-mono text-muted-foreground capitalize">
                                      {category}
                                    </span>
                                  </div>
                                )}
                                {exs.map(exercise => {
                                  const isAlreadyInSequence = sequence.some(
                                    s => s.exercise_id === exercise.id && s.day_number === selectedDay
                                  )
                                  
                                  return (
                                    <button
                                      key={exercise.id}
                                      onClick={() => selectedDay !== null && !isAlreadyInSequence && handleAddExercise(exercise.id, selectedDay)}
                                      disabled={isAlreadyInSequence}
                                      className="w-full p-4 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                          <img 
                                            src={CATEGORY_ICONS[exercise.category] || '/icons/arm.png'} 
                                            alt={exercise.category}
                                            className="w-5 h-5 object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        </div>
                                        <div
                                          className="w-3 h-3 rounded flex-shrink-0"
                                          style={{ backgroundColor: CATEGORY_COLORS[exercise.category] || 'hsl(var(--muted))' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-foreground truncate">{exercise.name}</p>
                                          <p className="text-xs font-mono text-muted-foreground">
                                            {exercise.target_sets} × {exercise.target_reps} × {(exercise.target_weight || 0)}kg
                                          </p>
                                        </div>
                                        {isAlreadyInSequence ? (
                                          <span className="text-xs font-mono text-muted-foreground">Already added</span>
                                        ) : (
                                          <Plus className="w-5 h-5 text-primary" />
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* No exercises */}
                    {globalExercises.length === 0 && userExercises.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="font-mono text-sm">No exercises available for this filter</p>
                        {selectedCategory !== 'all' && (
                          <button
                            onClick={() => setSelectedCategory('all')}
                            className="text-primary text-xs mt-2 hover:underline"
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Saving indicator */}
        {savingOrder && (
          <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg font-mono text-sm z-50">
            Saving order...
          </div>
        )}
      </div>
    </AdminLayout>
  )
}