# axios-stream-auth-refresh

<div align="center">

[![npm version](https://img.shields.io/npm/v/axios-stream-auth-refresh.svg)](https://www.npmjs.com/package/axios-stream-auth-refresh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

### Smart token refresh interceptor for Axios using RxJS streams

Prevents duplicate refresh token requests when multiple API calls fail simultaneously with 401 errors.

> **Note:** This library is inspired by [axios-auth-refresh](https://github.com/Flyrell/axios-auth-refresh) but redesigned to use RxJS streams for better handling of parallel requests and reactive state management.

[Installation](#installation) • [Quick Start](#quick-start) • [API Reference](#api-reference) • [Examples](#examples) • [Acknowledgments](#acknowledgments)

</div>

---

## The Problem

When your access token expires, multiple API requests might fail at the same time. Without proper handling:

- Each failed request triggers a separate token refresh call
- Race conditions occur between refresh requests
- Server gets bombarded with unnecessary refresh token calls
- Complex state management to track refresh status

## The Solution

`axios-stream-auth-refresh` uses **RxJS BehaviorSubject** to intelligently queue failed requests and refresh the token only once:

- **Single refresh call** for multiple simultaneous failures
- **Automatic request retry** after successful token refresh
- **Queue management** using reactive streams
- **Type-safe** with full TypeScript support
- **Lightweight** with minimal dependencies
- **Configurable** status codes and behaviors

---

## Installation

```bash
npm install axios-stream-auth-refresh rxjs axios
```

Or with other package managers:

```bash
yarn add axios-stream-auth-refresh rxjs axios
pnpm add axios-stream-auth-refresh rxjs axios
bun add axios-stream-auth-refresh rxjs axios
```

### Peer Dependencies

- `axios` >= 1.0.0
- `rxjs` >= 7.0.0

---

## Quick Start

```typescript
import axios from 'axios'
import { createStreamRefreshInterceptor } from 'axios-stream-auth-refresh'

const api = axios.create({
  baseURL: 'https://api.example.com',
})

createStreamRefreshInterceptor(api, async (failedRequest) => {
  const { data } = await axios.post('/auth/refresh', {
    refreshToken: localStorage.getItem('refreshToken'),
  })

  localStorage.setItem('accessToken', data.accessToken)
  failedRequest.headers.Authorization = `Bearer ${data.accessToken}`

  return true
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## How It Works

```
Multiple requests fail (401) ──┐
                                │
                                ├──► First request triggers refresh
                                │    │
Other requests are queued ──────┤    │
                                │    ▼
                                │  Refresh token API call
                                │    │
                                │    ▼
                                │  Token updated
                                │    │
                                └────┴──► All queued requests retry
                                          with new token
```

---

## API Reference

### `createStreamRefreshInterceptor(instance, refreshAuthCall, options?)`

Sets up the refresh token interceptor on an Axios instance.

#### Parameters

| Parameter         | Type                                               | Required | Description                                                           |
| ----------------- | -------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `instance`        | `AxiosInstance`                                    | ✅       | The Axios instance to attach the interceptor to                       |
| `refreshAuthCall` | `(config: AxiosRequestConfig) => Promise<boolean>` | ✅       | Async function that refreshes the token and returns `true` on success |
| `options`         | `AxiosStreamRefreshOptions`                        | ❌       | Configuration options                                                 |

#### Options

```typescript
interface AxiosStreamRefreshOptions {
  statusCodes?: number[]
}
```

Default: `{ statusCodes: [401] }`

#### Request Config Extensions

```typescript
interface AxiosRequestConfig {
  skipAuthRefresh?: boolean
  retry?: boolean
}
```

---

## Examples

### Basic Usage with JWT

```typescript
import axios from 'axios'
import { createStreamRefreshInterceptor } from 'axios-stream-auth-refresh'
import type { AxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
})

const refreshAuthLogic = async (
  originalConfig: AxiosRequestConfig
): Promise<boolean> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    const response = await axios.post('https://api.example.com/auth/refresh', {
      refreshToken,
    })

    const newToken = response?.data?.accessToken

    if (!newToken) {
      throw new Error('No access token received')
    }

    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)

    originalConfig.headers = originalConfig.headers || {}
    originalConfig.headers.Authorization = `Bearer ${newToken}`

    return true
  } catch (error) {
    localStorage.clear()
    window.location.href = '/login'
    throw error
  }
}

createStreamRefreshInterceptor(api, refreshAuthLogic)

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Custom Status Codes

```typescript
createStreamRefreshInterceptor(
  api,
  async (config) => {
    // Refresh logic
    return true
  },
  { statusCodes: [401, 403] }
)
```

### Skip Refresh for Specific Requests

```typescript
axios.post('/auth/refresh', data, {
  skipAuthRefresh: true,
})

axios.post('/auth/login', credentials, {
  skipAuthRefresh: true,
})
```

### With React Context

```typescript
import { createContext, useContext, useEffect } from 'react'
import axios from 'axios'
import { createStreamRefreshInterceptor } from 'axios-stream-auth-refresh'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
})

const ApiContext = createContext(api)

export function ApiProvider({ children }) {
  useEffect(() => {
    createStreamRefreshInterceptor(api, async (config) => {
      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        window.location.href = '/login'
        throw new Error('No refresh token')
      }

      try {
        const { data } = await axios.post('/auth/refresh', {
          refreshToken
        }, { skipAuthRefresh: true })

        localStorage.setItem('accessToken', data.accessToken)
        config.headers.Authorization = `Bearer ${data.accessToken}`

        return true
      } catch (error) {
        localStorage.clear()
        window.location.href = '/login'
        throw error
      }
    })

    api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        originalConfig.headers = originalConfig.headers || {};
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }, [])

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}

export const useApi = () => useContext(ApiContext)
```

### With Next.js

```typescript
import axios from 'axios'
import { createStreamRefreshInterceptor } from 'axios-stream-auth-refresh'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

createStreamRefreshInterceptor(api, async (config) => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Refresh failed')
  }

  const { accessToken } = await response.json()
  config.headers.Authorization = `Bearer ${accessToken}`

  return true
})
```

---

## Testing

```bash
npm test
npm run test:ui
npm run test:coverage
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT © [Pourya Alipanah](https://github.com/Pourya-Alipanah)

---

## Acknowledgments

This library is inspired by [axios-auth-refresh](https://github.com/Flyrell/axios-auth-refresh) by [@Flyrell](https://github.com/Flyrell). While axios-auth-refresh provides excellent token refresh capabilities, this library takes a different approach using **RxJS streams** for:

- Better handling of parallel requests through BehaviorSubject
- Reactive state management for token refresh status
- More predictable queuing behavior with RxJS operators

Special thanks to the axios-auth-refresh project and its contributors for pioneering this pattern in the Axios ecosystem.

---

<div align="center">

**Made with ❤️ and RxJS**

[Report Bug](https://github.com/Pourya-Alipanah/axios-stream-auth-refresh/issues) - [Request Feature](https://github.com/Pourya-Alipanah/axios-stream-auth-refresh/issues)

</div>

---
