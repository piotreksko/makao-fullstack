import { io, type Socket } from "socket.io-client"
import { getToken, clearToken } from "./tokenStorage"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

interface AckError {
  message?: string
  status?: number
  code?: string
}

let socket: Socket | null = null
let unauthorizedHandler: (() => void) | null = null

export class SocketError extends Error {
  status?: number
  code?: string
  // The server's own message, already written for display (e.g. "Only the
  // host can manage bots"); .message above has the "<event> failed:" prefix
  serverMessage?: string

  constructor(event: string, error?: AckError) {
    super(`${event} failed: ${error?.message || "unknown error"}`)
    this.status = error?.status
    this.code = error?.code
    this.serverMessage = error?.message
  }
}

export const setUnauthorizedHandler = (handler: () => void): void => {
  unauthorizedHandler = handler
}

export const connectSocket = (): Socket => {
  if (socket) return socket

  const s = io(`${API_URL}/game`, { auth: { token: getToken() } })
  socket = s

  // The gateway rejects the handshake itself on a bad/missing token, so this
  // is the only place an auth failure on connect ever surfaces
  s.on("connect_error", err => {
    if (err.message === "unauthorized") {
      clearToken()
      if (unauthorizedHandler) unauthorizedHandler()
    }
  })

  return s
}

export const disconnectSocket = (): void => {
  socket?.disconnect()
  socket = null
}

type Ack<T> = ({ ok: true } & T) | { ok: false; error: AckError }

// Every client->server event replies through an ack callback, not a
// separate event; this turns that into something callers can await
export const emit = <T = Record<string, never>>(
  event: string,
  payload: object = {}
): Promise<T> =>
  new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket is not connected"))
      return
    }
    socket.emit(event, payload, (res: Ack<T>) => {
      if (res.ok) {
        const { ok: _ok, ...data } = res
        resolve(data as unknown as T)
      } else reject(new SocketError(event, res.error))
    })
  })

// Subscribes to a server-pushed event (room:state, game:state, ...);
// returns an unsubscribe function
export const on = <A extends unknown[]>(
  event: string,
  handler: (...args: A) => void
): (() => void) => {
  const h = handler as (...args: unknown[]) => void
  socket?.on(event, h)
  return () => {
    socket?.off(event, h)
  }
}
