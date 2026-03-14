'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { cancelCheckOutReminder } from '@/lib/notifications'
import UserLayout from '@/components/user-layout'
import { Clock, CheckCircle, Timer } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckOutPage() {
  const router = useRouter()
  const { currentUser, currentCheckIn, setCurrentCheckIn } = useAppStore()
  const [checkingOut, setCheckingOut] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!currentCheckIn) {
      router.push('/check-in')
      return
    }

    // Calculate duration
    const checkInTime = new Date(currentCheckIn.check_in_time).getTime()
    const now = Date.now()
    const minutes = Math.floor((now - checkInTime) / 60000)
    setDuration(minutes)

    // Update duration every minute
    const interval = setInterval(() => {
      const newNow = Date.now()
      const newMinutes = Math.floor((newNow - checkInTime) / 60000)
      setDuration(newMinutes)
    }, 60000)

    return () => clearInterval(interval)
  }, [currentCheckIn, router])

  const handleCheckOut = async () => {
    if (!currentUser || !currentCheckIn) return

    setCheckingOut(true)
    try {
      const checkOutTime = new Date()
      const checkInTime = new Date(currentCheckIn.check_in_time)
      const durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 60000)

      const { error } = await supabase
        .from('check_ins')
        .update({
          check_out_time: checkOutTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', currentCheckIn.id)

      if (error) throw error

      // Cancel any pending reminder
      cancelCheckOutReminder()

      setCurrentCheckIn(null)
      toast.success(`Checked out! Workout duration: ${durationMinutes} minutes`)
      router.push('/home')
    } catch (err) {
      console.error('Error checking out:', err)
      toast.error('Failed to check out')
    } finally {
      setCheckingOut(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutes`
  }

  if (!currentCheckIn) {
    return null
  }

  return (
    <UserLayout>
      <div className="max-w-md mx-auto p-6">
        <div className="neo-card bg-card rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <Timer className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Workout in Progress
          </h1>
          
          <div className="mb-6">
            <p className="font-mono text-4xl font-bold text-primary mb-2">
              {formatDuration(duration)}
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              Started at {new Date(currentCheckIn.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* 3-hour warning */}
          {duration >= 180 && (
            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm font-mono text-yellow-600">
                ⚠️ You've been working out for 3+ hours!
              </p>
            </div>
          )}

          <button
            onClick={handleCheckOut}
            disabled={checkingOut}
            className="neo-button w-full py-4 rounded-xl bg-green-600 text-white font-bold font-mono text-lg"
          >
            {checkingOut ? 'Checking out...' : 'Check Out'}
          </button>
        </div>
      </div>
    </UserLayout>
  )
}