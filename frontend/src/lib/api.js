import axios from 'axios'

/**
 * Axios instance configured for backend API
 * @type {import('axios').AxiosInstance}
 */
export const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

// Response interceptor to normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isCancel(err)) {
      return Promise.reject(new Error('Request canceled'))
    }
    const message = err?.response?.data?.error || err?.message || 'Network error'
    return Promise.reject(new Error(message))
  },
)

/**
 * @param {string} repo_url
 * @param {AbortSignal} [signal]
 */
export const addRepo = (repo_url, signal) => api.post('/add_repo', { repo_url }, { signal })
export const getRepos = (signal) => api.get('/get_repos', { signal })
/**
 * @param {string} repo_url
 * @param {string} query
 * @param {{ signal?: AbortSignal }} [options]
 */
export const chatRepo = (repo_url, query, options = {}) => api.post('/chat', { repo_url, query }, { signal: options.signal })
