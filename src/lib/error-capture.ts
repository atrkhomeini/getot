import * as Sentry from '@sentry/nextjs'

export const captureError = (error: Error, context?: Record<string, any>) => {
  console.error('Error captured:', error)
  
  Sentry.captureException(error, {
    extra: context,
  })
}

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level)
}

export const setUserContext = (user: { id: string; name: string; role: string }) => {
  Sentry.setUser({
    id: user.id,
    username: user.name,
    role: user.role,
  })
}

export const clearUserContext = () => {
  Sentry.setUser(null)
}

// Add breadcrumb for user actions
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  })
}