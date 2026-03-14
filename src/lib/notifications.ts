// Notification utility for PWA push notifications

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported')
    return
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    })
  }
}

export const scheduleCheckOutReminder = (checkInTime: Date) => {
  const THREE_HOURS = 3 * 60 * 60 * 1000 // 3 hours in milliseconds
  const now = new Date()
  const timeUntilReminder = checkInTime.getTime() + THREE_HOURS - now.getTime()

  if (timeUntilReminder <= 0) {
    // Already past 3 hours, show immediately
    showNotification('🏋️ Time to Check Out!', {
      body: "You've been at the gym for 3 hours. Don't forget to check out!",
      tag: 'checkout-reminder',
      requireInteraction: true,
    })
    return null
  }

  // Store in localStorage so it persists across page refreshes
  const reminderTime = new Date(checkInTime.getTime() + THREE_HOURS).toISOString()
  localStorage.setItem('checkoutReminderTime', reminderTime)

  // Schedule the notification
  const timeoutId = setTimeout(() => {
    showNotification('🏋️ Time to Check Out!', {
      body: "You've been at the gym for 3 hours. Don't forget to check out!",
      tag: 'checkout-reminder',
      requireInteraction: true,
    })
    localStorage.removeItem('checkoutReminderTime')
  }, timeUntilReminder)

  return timeoutId
}

export const cancelCheckOutReminder = () => {
  localStorage.removeItem('checkoutReminderTime')
}

export const checkPendingReminder = () => {
  const reminderTime = localStorage.getItem('checkoutReminderTime')
  if (!reminderTime) return

  const reminderDate = new Date(reminderTime)
  const now = new Date()

  if (now >= reminderDate) {
    // Reminder time has passed, show notification
    showNotification('🏋️ Time to Check Out!', {
      body: "You've been at the gym for 3 hours. Don't forget to check out!",
      tag: 'checkout-reminder',
      requireInteraction: true,
    })
    localStorage.removeItem('checkoutReminderTime')
  }
}