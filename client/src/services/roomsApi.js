import { apiRequest } from "./apiClient";

export const listRooms = () => apiRequest("/rooms");

export const createRoom = ({ visibility, maxPlayers, bots }) =>
  apiRequest("/rooms", {
    method: "POST",
    body: JSON.stringify({ visibility, maxPlayers, bots })
  });

export const getRoom = id => apiRequest(`/rooms/${id}`);

export const getMyRoom = () => apiRequest("/rooms/mine");

export const joinRoom = (id, inviteCode) =>
  apiRequest(`/rooms/${id}/join`, {
    method: "POST",
    body: JSON.stringify({ inviteCode })
  });

export const joinByCode = inviteCode =>
  apiRequest("/rooms/join-by-code", {
    method: "POST",
    body: JSON.stringify({ inviteCode })
  });

export const leaveRoom = id =>
  apiRequest(`/rooms/${id}/leave`, { method: "POST" });

export const addBot = id =>
  apiRequest(`/rooms/${id}/bots`, { method: "POST" });

export const removeBot = (id, seat) =>
  apiRequest(`/rooms/${id}/bots/${seat}`, { method: "DELETE" });
