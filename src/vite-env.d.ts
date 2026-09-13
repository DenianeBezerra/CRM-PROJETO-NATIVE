/// <reference types="vite/client" />

import 'pocketbase'

declare module 'pocketbase' {
  interface ClientResponseError {
    status: number
    response: any
  }

  export default interface PocketBase {
    send<T = any>(path: string, options?: any): Promise<T>
  }
}
