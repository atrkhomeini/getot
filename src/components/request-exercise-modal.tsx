'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Send, Loader2, MessageSquare, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface RequestExerciseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestExerciseModal({ open, onOpenChange }: RequestExerciseModalProps) {
  const { currentUser } = useAppStore()
  const [requestText, setRequestText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('Please log in first')
      return
    }

    if (!requestText.trim()) {
      toast.error('Please describe the exercise you want')
      return
    }

    if (requestText.trim().length < 10) {
      toast.error('Please provide more details (at least 10 characters)')
      return
    }

    setSubmitting(true)
    try {
      // Step 1: Save to database
      const { data, error } = await supabase
        .from('exercise_requests')
        .insert({
          user_id: currentUser.id,
          request_text: requestText.trim(),
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // Step 2: Send email notification (non-blocking)
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'exercise_request',
          data: {
            userName: currentUser.name,
            requestText: requestText.trim(),
            requestDate: new Date().toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        }),
      }).catch(err => {
        // Log error but don't fail the request
        console.error('Failed to send email notification:', err)
      })

      toast.success('Request submitted! We\'ll review it soon.')
      setRequestText('')
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error submitting request:', err)
      toast.error(err?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setRequestText('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="neo-card bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Request New Exercise
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-mono">
            Can't find an exercise? Tell us what you need and we'll add it for you!
          </p>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2 font-mono">
              Your Request
            </label>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="e.g., I need a 'Cable Crossover' exercise for chest day. I usually do 3 sets of 12 reps with 20kg."
              className="w-full h-32 px-4 py-3 rounded-xl bg-muted border-2 border-border focus:border-primary focus:outline-none font-mono text-foreground resize-none"
              disabled={submitting}
              maxLength={500}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground font-mono">
                Be specific: exercise name, sets, reps, weight
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {requestText.length}/500
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
            <p className="text-xs font-mono text-foreground font-bold mb-1">💡 Tips for better requests:</p>
            <ul className="text-xs font-mono text-muted-foreground space-y-1">
              <li>• Include exercise name</li>
              <li>• Suggest target sets, reps, and weight</li>
              <li>• Mention the category (chest, back, etc.)</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 neo-button font-mono"
              disabled={submitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !requestText.trim()}
              className="flex-1 neo-button bg-primary text-primary-foreground font-mono"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}