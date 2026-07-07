import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

export function getApiErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong'
}

export default api
