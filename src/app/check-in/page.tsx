'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { requestNotificationPermission, scheduleCheckOutReminder } from '@/lib/notifications'
import UserLayout from '@/components/user-layout'
import { Clock, CheckCircle, Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckInPage() {
  const router = useRouter()
  const { currentUser, currentCheckIn, setCurrentCheckIn, notificationsEnabled, setNotificationsEnabled } = useAppStore()
  const [checkingIn, setCheckingIn] = useState(false)

  const handleCheckIn = async () => {
    if (!currentUser) return

    setCheckingIn(true)
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
      toast.success('Checked in successfully!')

      // Request notification permission and schedule reminder
      const hasPermission = await requestNotificationPermission()
      setNotificationsEnabled(hasPermission)
      
      if (hasPermission) {
        scheduleCheckOutReminder(new Date(data.check_in_time))
        toast.info('We\'ll remind you to check out in 3 hours!')
      }

      router.push('/home')
    } catch (err) {
      console.error('Error checking in:', err)
      toast.error('Failed to check in')
    } finally {
      setCheckingIn(false)
    }
  }

  if (currentCheckIn) {
    router.push('/check-out')
    return null
  }

  return (
    <UserLayout>
      <div className="max-w-md mx-auto p-6">
        <div className="neo-card bg-card rounded-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Ready to Workout?
          </h1>
          <p className="font-mono text-muted-foreground mb-6">
            Check in to start tracking your session
          </p>

          {/* Notification Info */}
          <div className="mb-6 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 justify-center">
              {notificationsEnabled ? (
                <>
                  <Bell className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-mono text-green-600">
                    Notifications enabled
                  </span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">
                    Enable notifications for check-out reminders
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="neo-button w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-lg"
          >
            {checkingIn ? 'Checking in...' : 'Check In'}
          </button>
        </div>
      </div>
    </UserLayout>
  )
}