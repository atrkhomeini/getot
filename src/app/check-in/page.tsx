'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UserLayout from '@/components/user-layout'
import { useAppStore } from '@/lib/store'
import { LogIn, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckInPage() {
  const router = useRouter()
  const { currentUser, currentCheckIn, setCurrentCheckIn } = useAppStore()
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    // Check if already checked in today
    checkTodaysCheckIn()
  }, [currentUser, router])

  const checkTodaysCheckIn = async () => {
    if (!currentUser) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('check_in_time', `${today}T00:00:00`)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setAlreadyCheckedIn(true)
        setCurrentCheckIn(data)
        setCheckInTime(data.check_in_time)
      }
    } catch (err) {
      console.error('Error checking check-in status:', err)
    }
  }

  const handleCheckIn = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          user_id: currentUser.id,
          check_in_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setCurrentCheckIn(data)
      setAlreadyCheckedIn(true)
      setCheckInTime(data.check_in_time)
      toast.success('Checked in successfully! 💪')
    } catch (err) {
      console.error('Error checking in:', err)
      toast.error('Failed to check in')
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <UserLayout>
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        {!alreadyCheckedIn ? (
          <>
            {/* Check In Button */}
            <div className="neo-card bg-card rounded-3xl p-12 text-center mb-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Check In
              </h1>
              <p className="font-mono text-muted-foreground mb-8">
                Ready to start your workout?
              </p>
              <button
                onClick={handleCheckIn}
                className="neo-button w-full py-6 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-105 transition-all"
              >
                <LogIn className="w-8 h-8" />
                CHECK IN
              </button>
            </div>

            {/* Current Time */}
            <div className="flex items-center gap-3 bg-muted px-6 py-4 rounded-xl border-2 border-border">
              <Clock className="w-6 h-6 text-foreground" />
              <span className="font-mono text-2xl font-bold text-foreground">
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Already Checked In */}
            <div className="neo-card bg-card rounded-3xl p-12 text-center mb-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-secondary/10 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-secondary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                You're Checked In!
              </h1>
              <p className="font-mono text-muted-foreground mb-4">
                Checked in at
              </p>
              {checkInTime && (
                <p className="font-mono text-3xl font-bold text-primary mb-8">
                  {formatTime(checkInTime)}
                </p>
              )}
              <button
                onClick={() => router.push('/check-out')}
                className="neo-button w-full py-6 rounded-2xl bg-destructive text-destructive-foreground font-bold text-xl flex items-center justify-center gap-3 hover:bg-destructive/90 hover:scale-105 transition-all"
              >
                Go to Check Out
              </button>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  )
}
