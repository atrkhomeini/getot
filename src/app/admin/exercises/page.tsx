'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import AdminLayout from '@/components/admin-layout'
import { Dumbbell, Plus, Edit, Trash2, Save, X, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type Exercise = Database['public']['Tables']['exercises']['Row'] & {
  target_weight?: number
}

const categories = ['back', 'chest', 'shoulder', 'leg', 'arm'] as const

// Auto-detect category from exercise name
const EXERCISE_CATEGORY_KEYWORDS: Record<string, string> = {
  // Back keywords
  'lat pulldown': 'back',
  'row': 'back',
  'pull up': 'back',
  'chin up': 'back',
  'pulldown': 'back',
  'pull': 'back',
  'shrug': 'back',
  'hyperextension': 'back',
  'deadlift': 'back',
  
  // Chest keywords
  'bench press': 'chest',
  'press': 'chest',
  'fly': 'chest',
  'dip': 'chest',
  'pec': 'chest',
  'chest': 'chest',
  
  // Shoulder keywords
  'shoulder press': 'shoulder',
  'lateral raise': 'shoulder',
  'front raise': 'shoulder',
  'face pull': 'shoulder',
  'rear delt': 'shoulder',
  'military press': 'shoulder',
  
  // Leg keywords
  'squat': 'leg',
  'leg': 'leg',
  'lunge': 'leg',
  'calf': 'leg',
  'hamstring': 'leg',
  'quad': 'leg',
  'glute': 'leg',
  'extension': 'leg',
  'curl': 'leg',
  'press': 'leg',
  'hack squat': 'leg',
  
  // Arm keywords
  'curl': 'arm',
  'tricep': 'arm',
  'bicep': 'arm',
  'extension': 'arm',
  'wrist': 'arm',
  'tricep': 'arm',
  'dumbell curl': 'arm',
  'barbell curl': 'arm',
}

function detectCategoryFromName(name: string): string {
  const lowerName = name.toLowerCase()
  
  // Check each keyword
  for (const [keyword, category] of Object.entries(EXERCISE_CATEGORY_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return category
    }
  }
  
  return 'back' // Default
}

export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localAssets, setLocalAssets] = useState<any[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [showLocalAssets, setShowLocalAssets] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'back' as const,
    target_sets: 3,
    target_reps: 12,
    target_weight: 0,
    gif_url: '',
  })

  useEffect(() => {
    fetchExercises()
  }, [])

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

  const handleAddExercise = () => {
    setIsEditing(false)
    setFormData({
      name: '',
      category: 'back',
      target_sets: 3,
      target_reps: 12,
      target_weight: 0,
      gif_url: '',
    })
    setDialogOpen(true)
  }

  const handleEditExercise = (exercise: Exercise) => {
    setIsEditing(true)
    setSelectedExercise(exercise)
    setFormData({
      name: exercise.name,
      category: exercise.category,
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
      target_weight: exercise.target_weight || 0,
      gif_url: exercise.gif_url,
    })
    setDialogOpen(true)
  }

  const handleSaveExercise = async () => {
    console.log('=== Starting save exercise ===')
    console.log('formData:', formData)
    console.log('isEditing:', isEditing)
    console.log('selectedExercise:', selectedExercise)

    setSaving(true)
    try {
      if (isEditing && selectedExercise) {
        console.log('=== UPDATE MODE ===')
        console.log('Exercise ID:', selectedExercise.id)
        
        const updateData = {
          name: formData.name,
          category: formData.category,
          target_sets: formData.target_sets,
          target_reps: formData.target_reps,
          target_weight: formData.target_weight,
          gif_url: formData.gif_url,
        }
        
        console.log('Update data:', updateData)

        const { data, error } = await supabase
          .from('exercises')
          .update(updateData)
          .eq('id', selectedExercise.id)
          .select()
          .single()

        if (error) {
          console.error('=== SUPABASE UPDATE ERROR ===')
          console.error('Error:', error)
          console.error('Error message:', error.message)
          console.error('Error code:', error.code)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          throw error
        }

        console.log('Update successful:', data)
        toast.success('Exercise updated successfully!')
      } else {
        console.log('=== INSERT MODE ===')
        
        const insertData = {
          name: formData.name,
          category: formData.category,
          target_sets: formData.target_sets,
          target_reps: formData.target_reps,
          target_weight: formData.target_weight,
          gif_url: formData.gif_url,
        }
        
        console.log('Insert data:', insertData)

        const { data, error } = await supabase
          .from('exercises')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error('=== SUPABASE INSERT ERROR ===')
          console.error('Error:', error)
          console.error('Error message:', error.message)
          console.error('Error code:', error.code)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          throw error
        }

        console.log('Insert successful:', data)
        toast.success('Exercise created successfully!')
      }

      setDialogOpen(false)
      fetchExercises()
    } catch (err: any) {
      console.error('=== CATCH BLOCK ERROR ===')
      console.error('Error object:', err)
      console.error('Error type:', typeof err)
      console.error('Error message:', err?.message)
      console.error('Error code:', err?.code)
      console.error('Error details:', err?.details)
      console.error('Error hint:', err?.hint)
      console.error('Full error JSON:', JSON.stringify(err, null, 2))
      
      // Show user-friendly error
      let errorMessage = 'Failed to save exercise'
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.code) {
        errorMessage = `Database error: ${err.code}`
      }
      
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)

      if (error) throw error
      toast.success('Exercise deleted successfully!')
      fetchExercises()
    } catch (err) {
      console.error('Error deleting exercise:', err)
      toast.error('Failed to delete exercise')
    }
  }

  const handleSearchGifs = async () => {
    if (!formData.name) {
      toast.error('Please enter an exercise name first')
      return
    }

    // Detect what the category should be
    const detectedCategory = detectCategoryFromName(formData.name)
    
    // Warn if category doesn't match
    if (detectedCategory !== formData.category) {
      toast.warning(`Exercise name suggests "${detectedCategory}" category. We'll show all categories for you.`)
    }

    setSearching(true)
    setLoadingAssets(true)
    try {
      // Search ExerciseDB API
      const response = await fetch(`/api/search-exercise?q=${encodeURIComponent(formData.name)}`)
      const data = await response.json()

      if (response.ok) {
        const exercises = Array.isArray(data) ? data : []
        
        if (exercises.length === 0) {
          toast.info('No exercises found in ExerciseDB. Check Local Assets tab.')
        } else {
          setSearchResults(exercises)
        }
      } else {
        throw new Error(data.error || 'Failed to search')
      }

      // Fetch ALL local assets (not just current category)
      const assetsResponse = await fetch('/api/local-assets')
      const assetsData = await assetsResponse.json()
      setLocalAssets(assetsData)

      setSearchDialogOpen(true)
      setShowLocalAssets(true)
    } catch (err) {
      console.error('Error searching exercises:', err)
      toast.error('Failed to search. Please try again.')
    } finally {
      setSearching(false)
      setLoadingAssets(false)
    }
  }

  const handleSelectGif = (exercise: any) => {
    const imageUrl = exercise.gifUrl || exercise.imageUrl || exercise.gif || exercise.url || ''
    
    setFormData({ ...formData, gif_url: imageUrl })
    setSearchDialogOpen(false)
    toast.success('Image selected!')
  }

  const categoryColors: Record<string, string> = {
    back: 'var(--secondary)',
    chest: 'var(--primary)',
    shoulder: 'var(--accent)',
    leg: 'var(--muted)',
    arm: '#FF6B6B',
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="font-mono text-foreground">Loading exercises...</div>
        </div>
      </AdminLayout>
    )
  }

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = []
    }
    acc[exercise.category].push(exercise)
    return acc
  }, {} as Record<string, Exercise[]>)

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Manage Exercises
            </h1>
            <p className="font-mono text-muted-foreground">
              Create and update workout routines
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleAddExercise}
                className="neo-button bg-primary text-primary-foreground font-bold font-mono"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="neo-card bg-card max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-bold text-2xl">
                  {isEditing ? 'Edit Exercise' : 'Add New Exercise'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Exercise Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      setFormData({ ...formData, name: newName })
                      
                      // Auto-detect category when typing
                      if (newName.length > 2) {
                        const detected = detectCategoryFromName(newName)
                        if (detected !== formData.category) {
                          setFormData(prev => ({ ...prev, category: detected as any }))
                        }
                      }
                    }}
                    className="neo-input"
                    placeholder="e.g., Squat, Bench Press, Lat Pulldown"
                  />
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    Category: <span className="font-bold capitalize text-primary">{formData.category}</span>
                    {formData.name.length > 2 && detectCategoryFromName(formData.name) !== formData.category && (
                      <span className="text-yellow-600 ml-2">
                        (Name suggests "{detectCategoryFromName(formData.name)}")
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="neo-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                      Target Sets
                    </label>
                    <Input
                      type="number"
                      value={formData.target_sets}
                      onChange={(e) => setFormData({ ...formData, target_sets: parseInt(e.target.value) || 0 })}
                      className="neo-input"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                      Target Reps
                    </label>
                    <Input
                      type="number"
                      value={formData.target_reps}
                      onChange={(e) => setFormData({ ...formData, target_reps: parseInt(e.target.value) || 0 })}
                      className="neo-input"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                      Target Weight
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.target_weight || ''}
                      onChange={(e) => setFormData({ ...formData, target_weight: parseFloat(e.target.value) || 0 })}
                      className="neo-input"
                      min="0"
                      placeholder="kg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    GIF URL (Optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.gif_url}
                      onChange={(e) => setFormData({ ...formData, gif_url: e.target.value })}
                      className="neo-input flex-1"
                      placeholder="/assets/leg/squat.gif or search below"
                    />
                    <Button
                      onClick={handleSearchGifs}
                      disabled={searching}
                      variant="outline"
                      className="neo-button px-3"
                      title="Search for GIFs"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setDialogOpen(false)}
                    variant="outline"
                    className="flex-1 neo-button font-mono"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveExercise}
                    disabled={saving}
                    className="flex-1 neo-button bg-primary text-primary-foreground font-mono"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Search GIFs Dialog */}
          <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
            <DialogContent className="neo-card bg-card max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="font-bold text-2xl">
                  Select an image for "{formData.name}"
                </DialogTitle>
              </DialogHeader>
              
              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b">
                <button
                  onClick={() => setShowLocalAssets(false)}
                  className={`px-4 py-2 font-mono text-sm font-bold border-b-2 transition-colors ${
                    !showLocalAssets 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ExerciseDB API ({searchResults.length})
                </button>
                <button
                  onClick={() => setShowLocalAssets(true)}
                  className={`px-4 py-2 font-mono text-sm font-bold border-b-2 transition-colors ${
                    showLocalAssets 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Local Assets ({localAssets.length})
                </button>
              </div>
              
              {searching || loadingAssets ? (
                <div className="flex items-center justify-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[60vh] p-2">
                  {/* ExerciseDB Results */}
                  {!showLocalAssets && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {searchResults.length > 0 ? (
                        searchResults.map((result, index) => (
                          <button
                            key={`api-${index}`}
                            onClick={() => handleSelectGif(result)}
                            className="neo-card bg-muted rounded-2xl overflow-hidden hover:scale-105 hover:shadow-xl transition-all text-left border-2 border-transparent hover:border-primary aspect-square flex flex-col"
                          >
                            <div className="relative flex-1 min-h-0 bg-slate-200">
                              <img
                                src={result.gifUrl || result.imageUrl}
                                alt={result.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                            <div className="p-3 bg-card/90 backdrop-blur-sm">
                              <p className="text-xs font-bold text-foreground line-clamp-1">
                                {result.name}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-12">
                          <p className="text-muted-foreground font-mono">
                            No results from ExerciseDB. Try the "Local Assets" tab.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Assets - Grouped by Category */}
                  {showLocalAssets && (
                    <div>
                      {['arm', 'back', 'chest', 'leg', 'shoulder'].map(cat => {
                        const categoryAssets = localAssets.filter(a => a.category === cat)
                        
                        if (categoryAssets.length === 0) return null
                        
                        const isMatch = cat === formData.category
                        
                        return (
                          <div key={cat} className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  isMatch ? 'bg-primary' : 'bg-muted'
                                }`}
                              />
                              <h3 className="font-bold text-foreground capitalize">
                                {cat} {isMatch && '(Current)'}
                              </h3>
                              <span className="text-xs text-muted-foreground font-mono">
                                ({categoryAssets.length} files)
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {categoryAssets.map((asset, index) => (
                                <button
                                  key={`${cat}-${index}`}
                                  onClick={() => {
                                    handleSelectGif({ gifUrl: asset.url, name: asset.filename })
                                    // Auto-update category to match selected asset
                                    if (cat !== formData.category) {
                                      setFormData(prev => ({ ...prev, category: cat as any }))
                                      toast.info(`Category changed to ${cat}`)
                                    }
                                  }}
                                  className={`neo-card bg-muted rounded-2xl overflow-hidden hover:scale-105 hover:shadow-xl transition-all text-left border-2 ${
                                    !isMatch ? 'border-transparent hover:border-primary' : 'border-primary'
                                  } aspect-square flex flex-col`}
                                >
                                  <div className="relative flex-1 min-h-0 bg-slate-200">
                                    <img
                                      src={asset.url}
                                      alt={asset.filename}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                  <div className="p-3 bg-card/90 backdrop-blur-sm">
                                    <p className="text-xs font-bold text-foreground line-clamp-1">
                                      {asset.filename.replace(/\.(gif|jpg|png)$/i, '')}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      
                      {localAssets.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground font-mono">
                            No local assets found in: public/assets/
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-2">
                            Add GIF files to the assets folder to use them
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Exercises by Category */}
        {categories.map((category) => {
          const categoryExercises = groupedExercises[category] || []
          if (categoryExercises.length === 0) return null

          return (
            <div key={category} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: categoryColors[category] }}
                />
                <h2 className="text-2xl font-bold text-foreground capitalize">
                  {category}
                </h2>
                <span className="text-sm font-mono text-muted-foreground">
                  ({categoryExercises.length} exercises)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryExercises.map((exercise) => (
                  <div key={exercise.id} className="neo-card bg-card rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-foreground">{exercise.name}</h3>
                        <p className="text-xs font-mono text-muted-foreground capitalize">
                          {exercise.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 p-2 bg-muted rounded-lg">
                      <div className="text-center">
                        <p className="text-xs font-mono text-muted-foreground">Sets</p>
                        <p className="text-lg font-bold text-foreground font-mono">
                          {exercise.target_sets}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-mono text-muted-foreground">Reps</p>
                        <p className="text-lg font-bold text-foreground font-mono">
                          {exercise.target_reps}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-mono text-muted-foreground">Weight</p>
                        <p className="text-lg font-bold text-foreground font-mono">
                          {exercise.target_weight || 0}<span className="text-xs ml-1">kg</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditExercise(exercise)}
                        size="sm"
                        variant="outline"
                        className="flex-1 neo-button font-mono text-sm"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteExercise(exercise.id)}
                        size="sm"
                        variant="outline"
                        className="neo-button text-destructive font-mono text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {exercises.length === 0 && (
          <div className="text-center py-16">
            <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No exercises yet</h3>
            <p className="font-mono text-muted-foreground mb-4">
              Add your first exercise to get started
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}