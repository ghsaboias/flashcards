// Consolidated API client to eliminate duplication across 12+ API functions

import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type {
  SessionResponse,
  SessionConfig,
  AnswerPayload,
  StatsPayload,
  SrsRow,
  PerformancePayload,
  Domain
} from '../types/api-types'

export class ApiClient {
  private client: AxiosInstance

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE || '/api') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor for consistent error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        })

        // Transform errors to be more user-friendly
        if (error.response?.status === 404) {
          throw new Error('Resource not found')
        } else if (error.response?.status === 500) {
          throw new Error('Server error - please try again')
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - please try again')
        } else {
          throw new Error(error.message || 'Network error')
        }
      }
    )
  }

  // Generic GET method with params support
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const { data } = await this.client.get(endpoint, { params })
    return data
  }

  // Generic POST method with payload support
  async post<T>(endpoint: string, payload?: Record<string, unknown> | SessionConfig | AnswerPayload): Promise<T> {
    const { data } = await this.client.post(endpoint, payload)
    return data
  }

  // === DATA LISTING METHODS ===

  async listSets(domainId?: string): Promise<string[]> {
    const params = domainId ? { domain_id: domainId } : undefined
    return this.get<string[]>('/sets', params)
  }

  async listCategories(domainId?: string): Promise<string[]> {
    const params = domainId ? { domain_id: domainId } : undefined
    return this.get<string[]>('/categories', params)
  }

  async listDomains(): Promise<Domain[]> {
    return this.get<Domain[]>('/domains')
  }

  // === STATISTICS METHODS ===

  async getStats(scope: 'set' | 'category', identifier: string, domainId?: string): Promise<StatsPayload> {
    const params: Record<string, string> = {
      [scope === 'set' ? 'set_name' : 'category']: identifier
    }
    if (domainId) {
      params.domain_id = domainId
    }
    return this.get<StatsPayload>(`/stats/${scope}`, params)
  }

  async getStatsForSet(setName: string, domainId?: string): Promise<StatsPayload> {
    return this.getStats('set', setName, domainId)
  }

  async getStatsForCategory(category: string, domainId?: string): Promise<StatsPayload> {
    return this.getStats('category', category, domainId)
  }

  // === SRS METHODS ===

  async getSrs(scope: 'set' | 'category', identifier: string, domainId?: string): Promise<SrsRow[]> {
    const params: Record<string, string> = {
      [scope === 'set' ? 'set_name' : 'category']: identifier
    }
    if (domainId) {
      params.domain_id = domainId
    }
    return this.get<SrsRow[]>(`/srs/${scope}`, params)
  }

  async getSrsForSet(setName: string, domainId?: string): Promise<SrsRow[]> {
    return this.getSrs('set', setName, domainId)
  }

  async getSrsForCategory(category: string, domainId?: string): Promise<SrsRow[]> {
    return this.getSrs('category', category, domainId)
  }

  // === PERFORMANCE ANALYTICS ===

  async getPerformanceData(): Promise<PerformancePayload> {
    return this.get<PerformancePayload>('/performance')
  }

  // === SESSION METHODS ===

  async startSession(config: SessionConfig): Promise<SessionResponse> {
    return this.post<SessionResponse>('/sessions/start', config)
  }

  async startAutoSession(config: {
    user_level?: 'beginner' | 'intermediate' | 'advanced'
    focus_mode?: 'review' | 'challenge'
    domain_id?: string
  } = {}): Promise<SessionResponse> {
    return this.post<SessionResponse>('/sessions/auto-start', config)
  }

  async answerQuestion(sessionId: string, answer: string): Promise<SessionResponse> {
    const payload: AnswerPayload = {
      session_id: sessionId,
      answer,
    }
    return this.post<SessionResponse>(`/sessions/${sessionId}/answer`, payload)
  }

  async answerQuestionWithTiming(
    sessionId: string,
    answer: string,
    responseTimeMs: number
  ): Promise<SessionResponse> {
    const payload: AnswerPayload = {
      session_id: sessionId,
      answer,
      response_time_ms: responseTimeMs,
    }
    return this.post<SessionResponse>(`/sessions/${sessionId}/answer`, payload)
  }

  // === BATCH OPERATIONS ===

  async getMultiSetStats(setNames: string[], domainId?: string): Promise<StatsPayload[]> {
    return Promise.all(setNames.map(setName => this.getStatsForSet(setName, domainId)))
  }

  async getMultiSetSrs(setNames: string[], domainId?: string): Promise<SrsRow[]> {
    const allSrsData = await Promise.all(
      setNames.map(async (setName) => {
        try {
          return await this.getSrsForSet(setName, domainId)
        } catch (error) {
          console.warn(`Failed to load SRS data for set ${setName}:`, error)
          return []
        }
      })
    )
    return allSrsData.flat()
  }
}

// Export a singleton instance
export const apiClient = new ApiClient()