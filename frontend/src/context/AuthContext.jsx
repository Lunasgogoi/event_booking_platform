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

  async function updateProfile(payload) {
    const { data } = await api.patch('/auth/me', payload)
    setUser(data.user)
    return data.user
  }

  async function changePassword(payload) {
    const { data } = await api.patch('/auth/password', payload)
    return data
  }

  async function uploadAvatar(formData) {
    const { data } = await api.patch('/auth/avatar', formData)
    setUser(data.user)
    return data.user
  }

  const value = useMemo(
    () => ({
      changePassword,
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
      uploadAvatar,
      updateProfile,
    }),
    [isBootstrapping, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
