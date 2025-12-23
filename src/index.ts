import { BehaviorSubject, firstValueFrom } from 'rxjs'
import { enqueueRequestAfterRefresh, shouldInterceptError } from './utils'
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import type {
  AxiosStreamRefreshCache,
  AxiosStreamRefreshOptions,
} from './model'

export function createStreamRefreshInterceptor(
  instance: AxiosInstance,
  refreshAuthCall: (originalConfig: AxiosRequestConfig) => Promise<boolean>,
  options: AxiosStreamRefreshOptions = {
    statusCodes: [401],
  }
) {
  if (typeof refreshAuthCall !== 'function') {
    throw new Error(
      'axios-stream-refresh requires `refreshAuthCall` to be a function that returns a promise.'
    )
  }

  const cache: AxiosStreamRefreshCache = {
    isRefreshing: false,
    refreshTokenSubject: new BehaviorSubject<boolean | null>(null),
  }

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (!shouldInterceptError(error, options)) {
        return Promise.reject(error)
      }

      // we can confirm that error.config are defined here because of shouldInterceptError check
      const result$ = enqueueRequestAfterRefresh(
        instance,
        refreshAuthCall,
        error.config!,
        cache
      )
      return firstValueFrom(result$)
    }
  )
}
