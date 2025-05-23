import { Server } from 'socket.io';
import { sessionStore } from "./sessionStorage";
import { roomStore } from "./roomStorage";
import { SocketCustomEvents } from '../types/socketEvents';

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

// Add io instance
let ioInstance: Server;

export const timeoutManagement = {
  // Add method to set io instance
  setIO(io: Server) {
    ioInstance = io;
  },

  addTimeout(sessionId: string, timeout_duration: number): void {
    disconnectTimeouts.set(sessionId, 
      setTimeout(() => {
        const room = roomStore.getPlayerRoom(sessionId);
        const socketId = sessionStore.get(sessionId)?.socketId;

        if (room) {
          // If player is room creator
          if (room.creatorSessionId === sessionId) {

            roomStore.removePlayerFromRoom(sessionId);

            const sendingRoom=roomStore.getRoomByCode(room.roomCode);
            // Notify room members before removing creator
            ioInstance.to(room.roomCode).emit('player_left', {
              message: `Room creator has left the game, ${sessionStore.get(room.playerIds[0])?.username} is now the new creator`,
              room: {
                ...sendingRoom,
                playerIds: sendingRoom?.playerIds.map(playerId => ({
                  sessionId: playerId,
                  username: sessionStore.get(playerId)?.username,
                })),
              }
            });
            
            // Remove from room and socket room
            if (socketId) {
              ioInstance.sockets.sockets.get(socketId)?.leave(room.roomCode);
            }
          } else {
            roomStore.removePlayerFromRoom(sessionId);
            
            const sendingRoom=roomStore.getRoomByCode(room.roomCode);
            // Regular player leaving
            ioInstance.to(room.roomCode).emit('player_left', {
              message: `${sessionStore.get(sessionId)?.username} left the room`,
              room: {
                ...sendingRoom,
                playerIds: sendingRoom?.playerIds.map(playerId => ({
                  sessionId: playerId,
                  username: sessionStore.get(playerId)?.username,
                })),
              }
            });
            
            // Remove from room and socket room
            if (socketId) {
              ioInstance.sockets.sockets.get(socketId)?.leave(room.roomCode);
            }
          }
        }

        // Clean up session
        sessionStore.remove(sessionId);
        disconnectTimeouts.delete(sessionId);
        // console.log(`Session and room cleanup completed for socket ${socketId}`);
      }, timeout_duration)
    );
  },
  removeTimeout(sessionId: string): void {
    const timeout = disconnectTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      disconnectTimeouts.delete(sessionId);
      // console.log(`Player returned!`);
    }
  }
};