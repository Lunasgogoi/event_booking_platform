import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import AuthContext from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch {
        setUser(null)
      } finally {
        setIsBootstrapping(false)
      }
    }

    loadUser()
  }, [])

  async function login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    setUser(data.user)
    return data.user
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload)
    setUser(data.user)
    return data.user
  }

  async function logout() {
    await api.post('/auth/logout')
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [isBootstrapping, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
