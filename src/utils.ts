import { filter, from, switchMap, take } from 'rxjs'
import type { Observable } from 'rxjs'
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import type {
  AxiosStreamRefreshCache,
  AxiosStreamRefreshOptions,
} from './model'

/**
 * Returns TRUE: when error.response.status is contained in options.statusCodes
 * Returns FALSE: when error or error.response doesn't exist or options.statusCodes doesn't include response status
 *
 * @return {boolean}
 */
export function shouldInterceptError(
  error: AxiosError,
  options: AxiosStreamRefreshOptions
): boolean {
  if (!error || !error?.config || !error?.response) {
    return false
  }
  const { config } = error

  if (!options.statusCodes || !options.statusCodes.length) {
    return false
  }

  // avoid infinite loop
  if (config?.retry) {
    return false
  }
  config.retry = true

  if (error.config?.skipAuthRefresh) {
    return false
  }

  if (
    (error.response && error.request.status === 0) ||
    !error.response ||
    !options.statusCodes?.includes(error.response.status)
  ) {
    return false
  }

  // Copy config to response if there's a network error, so config can be modified and used in the retry
  if (!error.response) {
    error.response = {
      config: error.config as InternalAxiosRequestConfig,
      data: undefined,
      status: 0,
      statusText: '',
      headers: {},
    }
  }

  return true
}

export function enqueueRequestAfterRefresh<T = unknown>(
  instance: AxiosInstance,
  refreshAuthCall: (originalConfig: AxiosRequestConfig) => Promise<boolean>,
  originalConfig: AxiosRequestConfig,
  cache: AxiosStreamRefreshCache
): Observable<T> {
  if (!cache.isRefreshing) {
    cache.isRefreshing = true
    cache.refreshTokenSubject.next(null)

    from(refreshAuthCall(originalConfig)).subscribe({
      next: (newToken) => {
        cache.isRefreshing = false
        cache.refreshTokenSubject.next(newToken)
      },
      error: (err) => {
        cache.isRefreshing = false
        cache.refreshTokenSubject.error(err)
      },
    })
  }

  return cache.refreshTokenSubject.pipe(
    filter((token): token is boolean => token != null),
    take(1),
    switchMap(() => {
      return from(
        instance.request<T>(originalConfig).then((response) => response.data)
      )
    })
  )
}
