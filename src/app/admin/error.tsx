'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="neo-card bg-card rounded-2xl p-8 max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'An error occurred while loading the admin page.'}
        </p>
        <Button
          onClick={reset}
          className="neo-button bg-primary text-primary-foreground font-mono"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}