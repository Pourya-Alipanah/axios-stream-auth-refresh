/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shouldInterceptError, enqueueRequestAfterRefresh } from '../utils'
import { BehaviorSubject } from 'rxjs'
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import type { AxiosStreamRefreshCache } from '../model'

describe('shouldInterceptError', () => {
  it('should return false when error is null', () => {
    const result = shouldInterceptError(null as any, { statusCodes: [401] })
    expect(result).toBe(false)
  })

  it('should return false when config is missing', () => {
    const error = {
      response: { status: 401 },
      config: undefined,
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401] })
    expect(result).toBe(false)
  })

  it('should return false when response is missing', () => {
    const error = {
      config: {},
      response: undefined,
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401] })
    expect(result).toBe(false)
  })

  it('should return false when retry flag is already set', () => {
    const error = {
      config: { retry: true },
      response: { status: 401 },
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401] })
    expect(result).toBe(false)
  })

  it('should return false when skipAuthRefresh is true', () => {
    const error = {
      config: { skipAuthRefresh: true },
      response: { status: 401 },
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401] })
    expect(result).toBe(false)
  })

  it('should return false when status code is not in options', () => {
    const error = {
      config: {},
      response: { status: 403 },
      request: { status: 403 },
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401] })
    expect(result).toBe(false)
  })

  it('should return true and set retry flag for valid 401 error', () => {
    const config: AxiosRequestConfig = {}
    const error = {
      config,
      response: { status: 401 },
      request: { status: 401 },
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401] })
    expect(result).toBe(true)
    expect(config.retry).toBe(true)
  })

  it('should handle multiple status codes', () => {
    const error = {
      config: {},
      response: { status: 403 },
      request: { status: 403 },
    } as AxiosError

    const result = shouldInterceptError(error, { statusCodes: [401, 403] })
    expect(result).toBe(true)
  })
})

describe('enqueueRequestAfterRefresh', () => {
  let mockInstance: AxiosInstance
  let mockRefreshAuthCall: any
  let cache: AxiosStreamRefreshCache

  beforeEach(() => {
    mockInstance = {
      request: vi.fn().mockResolvedValue({ data: 'test-data' }),
    } as any

    mockRefreshAuthCall = vi.fn().mockResolvedValue(true)

    cache = {
      isRefreshing: false,
      refreshTokenSubject: new BehaviorSubject<boolean | null>(null),
    }
  })

  it('should start refresh process when not already refreshing', () => {
    return new Promise<void>((resolve) => {
      const originalConfig = { url: '/test' }

      const result$ = enqueueRequestAfterRefresh(
        mockInstance,
        mockRefreshAuthCall,
        originalConfig,
        cache
      )

      expect(cache.isRefreshing).toBe(true)
      expect(mockRefreshAuthCall).toHaveBeenCalledWith(originalConfig)

      result$.subscribe({
        next: (data) => {
          expect(data).toBe('test-data')
          expect(mockInstance.request).toHaveBeenCalledWith(originalConfig)
          resolve()
        },
      })
    })
  })

  it('should queue requests when already refreshing', () => {
    return new Promise<void>((resolve) => {
      cache.isRefreshing = true
      const originalConfig = { url: '/test' }

      const result$ = enqueueRequestAfterRefresh(
        mockInstance,
        mockRefreshAuthCall,
        originalConfig,
        cache
      )

      // Simulate refresh completion
      setTimeout(() => {
        cache.isRefreshing = false
        cache.refreshTokenSubject.next(true)
      }, 50)

      result$.subscribe({
        next: (data) => {
          expect(data).toBe('test-data')
          resolve()
        },
      })
    })
  })

  it('should handle refresh error', () => {
    return new Promise<void>((resolve) => {
      const refreshError = new Error('Refresh failed')
      mockRefreshAuthCall = vi.fn().mockRejectedValue(refreshError)

      const originalConfig = { url: '/test' }

      const result$ = enqueueRequestAfterRefresh(
        mockInstance,
        mockRefreshAuthCall,
        originalConfig,
        cache
      )

      result$.subscribe({
        error: (err) => {
          expect(err).toBe(refreshError)
          expect(cache.isRefreshing).toBe(false)
          resolve()
        },
      })
    })
  })

  it('should set isRefreshing to false after successful refresh', () => {
    return new Promise<void>((resolve) => {
      const originalConfig = { url: '/test' }

      const result$ = enqueueRequestAfterRefresh(
        mockInstance,
        mockRefreshAuthCall,
        originalConfig,
        cache
      )

      result$.subscribe({
        next: () => {
          setTimeout(() => {
            expect(cache.isRefreshing).toBe(false)
            resolve()
          }, 10)
        },
      })
    })
  })
})
