/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStreamRefreshInterceptor } from '../index'
import type { AxiosInstance, AxiosError } from 'axios'

describe('createStreamRefreshInterceptor', () => {
  let mockInstance: AxiosInstance
  let mockRefreshAuthCall: () => Promise<boolean>
  let responseInterceptor: {
    onSuccess: (response: unknown) => unknown
    onError: (error: unknown) => unknown
  }

  beforeEach(() => {
    mockInstance = {
      interceptors: {
        response: {
          use: vi.fn((onSuccess, onError) => {
            responseInterceptor = { onSuccess, onError }
          }),
        },
      },
    } as any

    mockRefreshAuthCall = vi.fn().mockResolvedValue(true)
  })

  it('should throw error if refreshAuthCall is not a function', () => {
    expect(() => {
      createStreamRefreshInterceptor(
        mockInstance,
        null as unknown as () => Promise<boolean>
      )
    }).toThrow(
      'axios-stream-refresh requires `refreshAuthCall` to be a function that returns a promise.'
    )
  })

  it('should register response interceptor', () => {
    createStreamRefreshInterceptor(mockInstance, mockRefreshAuthCall)
    expect(mockInstance.interceptors.response.use).toHaveBeenCalled()
  })

  it('should pass through successful responses', () => {
    createStreamRefreshInterceptor(mockInstance, mockRefreshAuthCall)

    const response = { data: 'test', status: 200 }
    const result = responseInterceptor.onSuccess(response)

    expect(result).toBe(response)
  })

  it('should reject errors that should not be intercepted', async () => {
    createStreamRefreshInterceptor(mockInstance, mockRefreshAuthCall)

    const error = {
      config: undefined,
      response: { status: 401 },
    } as AxiosError

    await expect(responseInterceptor.onError(error)).rejects.toBe(error)
  })

  it('should use custom status codes from options', () => {
    createStreamRefreshInterceptor(mockInstance, mockRefreshAuthCall, {
      statusCodes: [403, 401],
    })

    expect(mockInstance.interceptors.response.use).toHaveBeenCalled()
  })

  it('should handle 401 error and trigger refresh', async () => {
    mockInstance.request = vi.fn().mockResolvedValue({ data: 'refreshed-data' })

    createStreamRefreshInterceptor(mockInstance, mockRefreshAuthCall)

    const error = {
      config: { url: '/test' },
      response: { status: 401 },
      request: { status: 401 },
    } as AxiosError

    const result = await responseInterceptor.onError(error)

    expect(mockRefreshAuthCall).toHaveBeenCalled()
    expect(result).toBe('refreshed-data')
  })
})
