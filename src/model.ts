import type { BehaviorSubject } from 'rxjs'

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean
    retry?: boolean
  }
}

export interface AxiosStreamRefreshOptions {
  statusCodes?: Array<number>
}

export interface AxiosStreamRefreshCache {
  isRefreshing: boolean
  refreshTokenSubject: BehaviorSubject<boolean | null>
}
