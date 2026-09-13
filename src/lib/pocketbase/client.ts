import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

const originalSend = pb.send.bind(pb)
;(pb as any).send = function <T = any>(path: string, options: any = {}) {
  return originalSend(path, options) as Promise<T>
}

export default pb
