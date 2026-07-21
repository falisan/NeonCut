import type { NeoncutApi } from './index'

declare global {
  interface Window {
    neoncut: NeoncutApi
  }
}
