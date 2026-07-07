import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
const tokenStorageKey = 'ticketo_auth_token'

let authToken = ''

if (typeof window !== 'undefined') {
  authToken = window.localStorage.getItem(tokenStorageKey) || ''
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }

  return config
})

export function setAuthToken(token) {
  authToken = token || ''

  if (typeof window === 'undefined') {
    return
  }

  if (authToken) {
    window.localStorage.setItem(tokenStorageKey, authToken)
  } else {
    window.localStorage.removeItem(tokenStorageKey)
  }
}

export function getApiErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong'
}

export default api
