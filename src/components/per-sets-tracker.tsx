'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dumbbell, Target, CheckCircle, Circle, TrendingDown, TrendingUp, Minus, Flame, Sun } from 'lucide-react'
import { CounterInput } from './counter-input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type SetType = 'warmup' | 'normal' | 'failure'

export interface SetData {
  set_number: number
  target_weight: number
  target_reps: number
  actual_weight: number
  actual_reps: number
  completed: boolean
  set_type: SetType
  notes?: string // Keep in interface for database compatibility
}

interface PerSetTrackerProps {
  targetSets: number
  targetReps: number
  targetWeight: number
  setsData?: SetData[]
  onChange: (setsData: SetData[]) => void
}

const SET_TYPE_CONFIG = {
  warmup: { label: 'W', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500', description: 'Warm-up' },
  normal: { label: 'N', color: 'bg-muted', textColor: 'text-muted-foreground', bgColor: 'bg-muted', borderColor: 'border-border', description: 'Normal' },
  failure: { label: 'F', color: 'bg-red-500', textColor: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500', description: 'Failure' },
}

export function PerSetTracker({ targetSets, targetReps, targetWeight, setsData: externalSetsData, onChange }: PerSetTrackerProps) {
  const initialSets = useMemo(() => {
    if (externalSetsData && externalSetsData.length > 0) return externalSetsData
    return Array.from({ length: targetSets }, (_, i) => ({
      set_number: i + 1, target_weight: targetWeight, target_reps: targetReps,
      actual_weight: 0, actual_reps: 0, completed: false, set_type: 'normal' as SetType, notes: ''
    }))
  }, [externalSetsData, targetSets, targetReps, targetWeight])

  const [setsData, setSetsData] = useState<SetData[]>(initialSets)

  useEffect(() => {
    if (externalSetsData && externalSetsData.length > 0) setSetsData(externalSetsData)
  }, [externalSetsData])

  const notifyChange = useCallback((newData: SetData[]) => { onChange(newData) }, [onChange])

  const updateSet = (setNumber: number, field: keyof SetData, value: number | boolean | SetType | string) => {
    setSetsData(prev => {
      const updated = prev.map(set => (set.set_number === setNumber ? { ...set, [field]: value } : set))
      setTimeout(() => notifyChange(updated), 0)
      return updated
    })
  }

  const meetsTarget = (set: SetData) => {
    const weightMet = set.actual_weight >= set.target_weight
    const repsMet = set.actual_reps >= set.target_reps
    const isOk = set.set_type === 'warmup' || set.set_type === 'failure' || (weightMet && repsMet)
    return { weight: weightMet, reps: repsMet, isOk }
  }

  const getPerformanceIndicator = (set: SetData) => {
    if (set.actual_weight === 0 && set.actual_reps === 0) return { icon: Minus, color: 'text-muted-foreground', label: 'Not started' }
    if (set.set_type === 'failure') return { icon: Flame, color: 'text-red-500', label: 'Failure set' }
    if (set.set_type === 'warmup') return { icon: Sun, color: 'text-yellow-500', label: 'Warm-up' }
    if (meetsTarget(set).isOk) return { icon: TrendingUp, color: 'text-green-500', label: 'Target met' }
    return { icon: TrendingDown, color: 'text-red-500', label: 'Below target' }
  }

  const calculateProgress = () => {
    const workingSets = setsData.filter(s => s.set_type !== 'warmup')
    if (workingSets.length === 0) return 100
    return (workingSets.filter(set => set.completed).length / workingSets.length) * 100
  }
  
  const getTotalReps = () => setsData.reduce((sum, set) => sum + set.actual_reps, 0)
  const getTotalVolume = () => setsData.filter(s => s.set_type !== 'warmup').reduce((sum, set) => sum + (set.actual_weight * set.actual_reps), 0)
  const getCompletedSetsCount = () => setsData.filter(set => set.completed).length
  const getAvgWeight = () => {
    const workingSets = setsData.filter(s => s.set_type !== 'warmup' && s.completed)
    return workingSets.length > 0 ? workingSets.reduce((sum, set) => sum + set.actual_weight, 0) / workingSets.length : 0
  }
  const getSetTypeCount = (type: SetType) => setsData.filter(s => s.set_type === type).length

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <Card className="neo-card bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Progress</span>
            </div>
            <Badge variant="secondary" className={cn("font-mono", getCompletedSetsCount() === targetSets ? "bg-green-500 text-white" : "bg-primary/10 text-primary")}>
              {getCompletedSetsCount()}/{setsData.length} Sets
            </Badge>
          </div>
          <Progress value={calculateProgress()} className="h-3 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground font-mono">{getTotalReps()}</span>
              <span className="text-muted-foreground">Total Reps</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground font-mono">{getTotalVolume().toFixed(0)}</span>
              <span className="text-muted-foreground">Volume (kg)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-foreground font-mono">{getAvgWeight().toFixed(1)}</span>
              <span className="text-muted-foreground">Avg Weight</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1"><span className={cn("w-4 h-4 rounded", SET_TYPE_CONFIG.warmup.color)} /><span className="text-muted-foreground">W: {getSetTypeCount('warmup')}</span></div>
            <div className="flex items-center gap-1"><span className={cn("w-4 h-4 rounded", SET_TYPE_CONFIG.normal.color)} /><span className="text-muted-foreground">N: {getSetTypeCount('normal')}</span></div>
            <div className="flex items-center gap-1"><span className={cn("w-4 h-4 rounded", SET_TYPE_CONFIG.failure.color)} /><span className="text-muted-foreground">F: {getSetTypeCount('failure')}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Set Cards */}
      <div className="space-y-3">
        {setsData.map((set) => {
          const { weight: weightMet, reps: repsMet, isOk } = meetsTarget(set)
          const performance = getPerformanceIndicator(set)
          const PerformanceIcon = performance.icon
          const typeConfig = SET_TYPE_CONFIG[set.set_type]

          return (
            <Card key={set.set_number} className={cn("neo-card bg-card transition-all", set.completed && "border-green-500 border-2", !isOk && set.set_type === 'normal' && "border-red-300")}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateSet(set.set_number, 'completed', !set.completed)} className="flex-shrink-0 transition-transform hover:scale-110">
                      {set.completed ? <CheckCircle className="w-7 h-7 text-green-500" /> : <Circle className="w-7 h-7 text-muted-foreground hover:text-primary" />}
                    </button>
                    <div>
                      <div className="font-bold text-lg text-foreground">Set {set.set_number}</div>
                      {set.completed && <Badge className="bg-green-500 text-white text-xs mt-1">Completed</Badge>}
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1", performance.color)}>
                    <PerformanceIcon className="w-4 h-4" />
                    <span className="text-xs font-mono">{performance.label}</span>
                  </div>
                </div>

                {/* Set Type Toggle */}
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground font-semibold mb-2 font-mono">SET TYPE</div>
                  <div className="flex gap-2">
                    {(['warmup', 'normal', 'failure'] as SetType[]).map((type) => {
                      const config = SET_TYPE_CONFIG[type]
                      const isActive = set.set_type === type
                      return (
                        <button key={type} onClick={() => updateSet(set.set_number, 'set_type', type)}
                          className={cn("flex-1 py-2 px-3 rounded-lg font-mono font-bold text-sm transition-all border-2", isActive ? `${config.color} text-white ${config.borderColor}` : `bg-muted text-muted-foreground border-border hover:bg-muted/80`)}>
                          <div className="text-center">
                            <div className="text-base">{config.label}</div>
                            <div className="text-[10px] opacity-80">{config.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Target Reference */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1 font-semibold font-mono">TARGET</div>
                  <div className="text-sm text-foreground font-medium font-mono">{set.target_weight} kg × {set.target_reps} reps</div>
                </div>

                {/* Actual Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-semibold">WEIGHT (kg)</span>
                      {set.actual_weight > 0 && set.set_type === 'normal' && (
                        <span className={cn("text-xs font-mono font-bold", weightMet ? "text-green-500" : "text-red-500")}>
                          {weightMet ? '✓ Met' : `${(set.actual_weight - set.target_weight).toFixed(1)}`}
                        </span>
                      )}
                    </div>
                    <CounterInput value={set.actual_weight} onChange={(value) => updateSet(set.set_number, 'actual_weight', value)} min={0} max={500} step={2.5} size="sm" unit="kg" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-semibold">REPS</span>
                      {set.actual_reps > 0 && set.set_type === 'normal' && (
                        <span className={cn("text-xs font-mono font-bold", repsMet ? "text-green-500" : "text-red-500")}>
                          {repsMet ? '✓ Met' : `${set.actual_reps - set.target_reps}`}
                        </span>
                      )}
                    </div>
                    <CounterInput value={set.actual_reps} onChange={(value) => updateSet(set.set_number, 'actual_reps', value)} min={0} max={100} step={1} size="sm" unit="reps" />
                  </div>
                </div>

                {/* Visual Indicators */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className={cn("flex items-center gap-2 p-2 rounded-lg", set.set_type === 'warmup' ? "bg-yellow-500/10 text-yellow-600" : set.set_type === 'failure' ? "bg-red-500/10 text-red-500" : weightMet ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500")}>
                      {set.set_type === 'warmup' ? (<><Sun className="w-4 h-4" /><span>Warm-up (light)</span></>) : set.set_type === 'failure' ? (<><Flame className="w-4 h-4" /><span>Failure: {set.actual_reps} reps</span></>) : (<>{weightMet ? <CheckCircle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}<span>Weight: {weightMet ? 'Met' : 'Below'}</span></>)}
                    </div>
                    <div className={cn("flex items-center gap-2 p-2 rounded-lg", set.set_type === 'warmup' ? "bg-yellow-500/10 text-yellow-600" : set.set_type === 'failure' ? "bg-red-500/10 text-red-500" : repsMet ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500")}>
                      {set.set_type === 'warmup' ? (<><Sun className="w-4 h-4" /><span>Warm-up (low)</span></>) : set.set_type === 'failure' ? (<><Flame className="w-4 h-4" /><span>Failed at {set.actual_reps}</span></>) : (<>{repsMet ? <CheckCircle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}<span>Reps: {repsMet ? 'Met' : 'Below'}</span></>)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Helper Text - KEEP THIS */}
      <div className="text-center text-xs text-muted-foreground font-mono p-3 bg-muted/30 rounded-lg space-y-1">
        <p>💡 <span className="font-bold text-yellow-600">[W]</span> Warm-up: Light weight, doesn't count toward volume</p>
        <p>💡 <span className="font-bold text-muted-foreground">[N]</span> Normal: Working set, must meet target</p>
        <p>💡 <span className="font-bold text-red-500">[F]</span> Failure: Train to failure, any reps is OK</p>
      </div>
    </div>
  )
}