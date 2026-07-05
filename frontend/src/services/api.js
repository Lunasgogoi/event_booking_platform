import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

export function getApiErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong'
}

export default api
