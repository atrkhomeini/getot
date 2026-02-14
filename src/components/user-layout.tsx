'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { Clock, Moon, Sun, LogOut, Home, BarChart3, LogIn, LogOut as CheckOut } from 'lucide-react'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const { currentUser, setCurrentUser } = useAppStore()
  const [time, setTime] = useState(new Date())
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    setCurrentUser(null)
    router.push('/')
  }

  const navItems = [
    { icon: LogIn, label: 'Check In', path: '/check-in' },
    { icon: Home, label: 'Home', path: '/home' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: CheckOut, label: 'Check Out', path: '/check-out' },
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
            {currentUser && (
              <span className="text-sm font-mono text-muted-foreground">
                • {currentUser.name}
              </span>
            )}
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

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom Floating Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-3 border-border">
        <div className="max-w-7xl mx-auto px-4 py-2">
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
    </div>
  )
}
