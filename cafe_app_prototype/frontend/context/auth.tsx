import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import API from '@/constants/api'

type AuthContextType = {
  token: string | null
  email: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('email'),
    ]).then(([t, e]) => {
      setToken(t)
      setEmail(e)
      setLoading(false)
    })
  }, [])

  const login = async (emailInput: string, password: string) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    await AsyncStorage.multiSet([['token', data.token], ['email', data.email]])
    setToken(data.token)
    setEmail(data.email)
  }

  const register = async (emailInput: string, password: string) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    await AsyncStorage.multiSet([['token', data.token], ['email', data.email]])
    setToken(data.token)
    setEmail(data.email)
  }

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'email'])
    setToken(null)
    setEmail(null)
  }

  return (
    <AuthContext.Provider value={{ token, email, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
