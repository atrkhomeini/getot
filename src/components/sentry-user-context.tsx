'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { setUserContext, clearUserContext } from '@/lib/error-capture'

export function SentryUserContext() {
  const currentUser = useAppStore((state) => state.currentUser)

  useEffect(() => {
    if (currentUser) {
      setUserContext({
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      })
    } else {
      clearUserContext()
    }
  }, [currentUser])

  return null
}