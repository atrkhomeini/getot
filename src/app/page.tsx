'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { Lock, Users } from 'lucide-react'
import { toast } from 'sonner'

type User = Database['public']['Tables']['users']['Row']

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, setCurrentUser } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    // If already logged in, redirect to home
    if (currentUser) {
      if (currentUser.role === 'owner') {
        router.push('/admin')
      } else {
        router.push('/home')
      }
      return
    }
    fetchUsers()
  }, [currentUser, router])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!selectedUser) {
      toast.error('Please select a user')
      return
    }

    if (!password) {
      toast.error('Please enter your password')
      return
    }

    setLoggingIn(true)

    try {
      // Verify password
      if (password !== selectedUser.password) {
        toast.error('Incorrect password')
        setLoggingIn(false)
        return
      }

      // Set current user in store
      setCurrentUser({
        id: selectedUser.id,
        name: selectedUser.name,
        role: selectedUser.role,
        avatar_color: selectedUser.avatar_color,
      })

      toast.success(`Welcome, ${selectedUser.name}!`)

      // Redirect based on role
      if (selectedUser.role === 'owner') {
        router.push('/admin')
      } else {
        router.push('/home')
      }
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Login failed')
    } finally {
      setLoggingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="font-mono text-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Logo/Header */}
        <div className="text-center mb-12 pt-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-4xl">🏋️</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Getot</h1>
          <p className="font-mono text-muted-foreground">
            Your Gym Guide & Logbook
          </p>
        </div>

        {/* User Selection (Netflix-style) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">Who's working out?</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`neo-card rounded-2xl p-6 text-center transition-all ${
                  selectedUser?.id === user.id
                    ? 'border-2 border-primary bg-primary/5 scale-105'
                    : 'border-2 border-transparent hover:border-border'
                }`}
              >
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <p className="font-bold text-foreground">{user.name}</p>
                <p className="text-xs font-mono text-muted-foreground capitalize">
                  {user.role}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Password Input */}
        {selectedUser && (
          <div className="neo-card bg-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-bold text-foreground">Enter Password</h3>
            </div>

            <div className="flex gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your password"
                className="flex-1 px-4 py-3 rounded-xl bg-muted border-2 border-border focus:border-primary focus:outline-none font-mono text-foreground"
                autoFocus
              />
              <button
                onClick={handleLogin}
                disabled={loggingIn}
                className="neo-button px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50"
              >
                {loggingIn ? '...' : 'Enter'}
              </button>
            </div>
          </div>
        )}

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">No users found</h3>
            <p className="font-mono text-muted-foreground">
              Contact the owner to create your account
            </p>
          </div>
        )}
      </div>
    </div>
  )
}