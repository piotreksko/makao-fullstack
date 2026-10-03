import { io } from "socket.io-client"
import { getToken, clearToken } from "./tokenStorage"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

let socket = null
let unauthorizedHandler = null

export class SocketError extends Error {
  constructor(event, error) {
    super(`${event} failed: ${error?.message || "unknown error"}`)
    this.status = error?.status
    this.code = error?.code
    // The server's own message, already written for display (e.g. "Only the
    // host can manage bots"); .message above has the "<event> failed:" prefix
    this.serverMessage = error?.message
  }
}

export const setUnauthorizedHandler = handler => {
  unauthorizedHandler = handler
}

export const connectSocket = () => {
  if (socket) return socket

  socket = io(`${API_URL}/game`, { auth: { token: getToken() } })

  // The gateway rejects the handshake itself on a bad/missing token, so this
  // is the only place an auth failure on connect ever surfaces
  socket.on("connect_error", err => {
    if (err.message === "unauthorized") {
      clearToken()
      if (unauthorizedHandler) unauthorizedHandler()
    }
  })

  return socket
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}

// Every client->server event replies through an ack callback, not a
// separate event; this turns that into something callers can await
export const emit = (event, payload = {}) =>
  new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket is not connected"))
      return
    }
    socket.emit(event, payload, ({ ok, error, ...data }) => {
      if (ok) resolve(data)
      else reject(new SocketError(event, error))
    })
  })

// Subscribes to a server-pushed event (room:state, game:state, ...);
// returns an unsubscribe function
export const on = (event, handler) => {
  socket?.on(event, handler)
  return () => socket?.off(event, handler)
}
