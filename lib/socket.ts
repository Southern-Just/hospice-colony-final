import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  if (socket?.connected) return socket;

  // Create (or reuse) a singleton socket
  if (!socket) {
    socket = io({
      path: "/api/socketio",
      auth: { token },
      autoConnect: true,
    });
  } else {
    // update token if it changed
    (socket as any).auth = { token };
    if (!socket.connected) socket.connect();
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
