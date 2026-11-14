import { apiRequest } from "./apiClient";
import type { RoomView, RoomVisibility } from "../types";

export interface CreateRoomPayload {
  visibility: RoomVisibility;
  maxPlayers: number;
  bots: number;
}

export const listRooms = () => apiRequest<RoomView[]>("/rooms");

export const createRoom = ({ visibility, maxPlayers, bots }: CreateRoomPayload) =>
  apiRequest<RoomView>("/rooms", {
    method: "POST",
    body: JSON.stringify({ visibility, maxPlayers, bots })
  });

export const getRoom = (id: string) => apiRequest<RoomView>(`/rooms/${id}`);

export const getMyRoom = () => apiRequest<RoomView | null>("/rooms/mine");

export const joinRoom = (id: string, inviteCode?: string) =>
  apiRequest<RoomView>(`/rooms/${id}/join`, {
    method: "POST",
    body: JSON.stringify({ inviteCode })
  });

export const joinByCode = (inviteCode: string) =>
  apiRequest<RoomView>("/rooms/join-by-code", {
    method: "POST",
    body: JSON.stringify({ inviteCode })
  });

export const leaveRoom = (id: string) =>
  apiRequest<null>(`/rooms/${id}/leave`, { method: "POST" });

export const addBot = (id: string) =>
  apiRequest<RoomView>(`/rooms/${id}/bots`, { method: "POST" });

export const removeBot = (id: string, seat: number) =>
  apiRequest<RoomView>(`/rooms/${id}/bots/${seat}`, { method: "DELETE" });
