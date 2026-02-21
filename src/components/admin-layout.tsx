'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Clock, Moon, Sun, LogOut, LayoutDashboard, Users, Dumbbell, BarChart3, List } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const { currentUser, setCurrentUser } = useAppStore()
  const [time, setTime] = useState(new Date())
  const [isChecking, setIsChecking] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Only check authentication once on mount
    if (currentUser === undefined) {
      // User state not loaded yet, wait
      return
    }

    setIsChecking(false)

    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/')
    }
  }, [currentUser, router])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-foreground">Loading...</div>
      </div>
    )
  }

  const handleLogout = () => {
    setCurrentUser(null)
    router.push('/')
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Dumbbell, label: 'Exercises', path: '/admin/exercises' },
    { icon: List, label: 'Sequences', path: '/admin/sequence' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-background border-b-3 border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-foreground">
              GYM LOG
            </span>
            <span className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold font-mono">
              ADMIN
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock */}
            <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg border-2 border-border">
              <Clock className="w-4 h-4 text-foreground" />
              <span className="font-mono text-sm font-bold text-foreground">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="neo-button p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="neo-button p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r-3 border-border p-4 hidden md:block">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-mono text-sm font-bold
                    ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Bottom Navbar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-3 border-border md:hidden">
          <div className="px-4 py-2">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const isActive = pathname === item.path
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`
                      flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all
                      ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                    `}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-bold font-mono">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 pb-24 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}