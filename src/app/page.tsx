'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import { Dumbbell, Lock } from 'lucide-react'

type User = Database['public']['Tables']['users']['Row']

export default function LoginPage() {
  const router = useRouter()
  const { setCurrentUser } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
  try {
    console.log('=== Starting to fetch users ===')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...')
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    console.log('Response data:', data)
    console.log('Response error:', error)
    console.log('Data type:', typeof data)
    console.log('Data is array:', Array.isArray(data))
    console.log('Data length:', data?.length)
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    console.log('Setting users state...')
    setUsers(data || [])
    console.log('Users set:', data?.length, 'users')
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No users found in database!')
    }
    
  } catch (err) {
    console.error('❌ Error fetching users:', err)
    setError('Failed to load users')
  } finally {
    console.log('=== Fetch complete, setting loading to false ===')
    setLoading(false)
  }
}

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setPassword('')
    setError('')
  }

  const handleLogin = () => {
    if (!selectedUser || !password) {
      setError('Please enter password')
      return
    }

    if (password === selectedUser.password) {
      setCurrentUser({
        id: selectedUser.id,
        name: selectedUser.name,
        role: selectedUser.role,
        avatar_color: selectedUser.avatar_color,
      })

      if (selectedUser.role === 'owner') {
        router.push('/admin')
      } else {
        router.push('/home')
      }
    } else {
      setError('Incorrect password')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin()
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-bold font-mono text-foreground flex items-center gap-3">
          <Dumbbell className="w-12 h-12 md:w-16 md:h-16" />
          GYM LOG
        </h1>
      </div>

      {/* User Grid */}
      <div className="w-full max-w-6xl">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
          {selectedUser ? `Welcome, ${selectedUser.name}!` : 'Who\'s working out today?'}
        </h2>

        {!selectedUser ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="neo-card w-32 h-32 md:w-40 md:h-40 rounded-2xl flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted transition-all cursor-pointer group"
                style={{
                  backgroundColor: user.role === 'owner' ? 'var(--secondary)' : 'var(--card)',
                }}
              >
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-foreground text-sm md:text-base group-hover:underline">
                  {user.name}
                </span>
                {user.role === 'owner' && (
                  <span className="text-xs font-mono text-muted-foreground">ADMIN</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* Selected User Card */}
            <div
              className="neo-card w-64 h-64 rounded-2xl flex flex-col items-center justify-center gap-4 bg-card p-6"
              style={{ backgroundColor: selectedUser.avatar_color }}
            >
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-5xl font-bold text-white">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-white text-2xl">{selectedUser.name}</span>
            </div>

            {/* Password Input */}
            <div className="w-full max-w-md">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter password"
                  className="neo-input w-full pl-12 pr-4 py-4 rounded-xl bg-background text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-destructive font-mono text-sm mt-2">{error}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setPassword('')
                  setError('')
                }}
                className="neo-button px-8 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold font-mono hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={handleLogin}
                className="neo-button px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold font-mono hover:bg-primary/90"
              >
                Enter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t-3 border-border p-4">
        <p className="text-center font-mono text-sm text-muted-foreground">
          © 2025 Gym Logbook • Built with 💪
        </p>
      </footer>
    </div>
  )
}
