import { Server } from 'socket.io';
import { roomStore } from "./roomStorage";
import { gameStore } from "./gameStorage";
import { sessionStore } from "./sessionStorage";
                            
                            // gameId , Timeout
const gameTimeouts = new Map<string, NodeJS.Timeout>();

let ioInstance: Server;

export const gameTimeoutManagement = {
    setIO(io: Server) {
        ioInstance = io;
    },

    addTimeout(gameId: string, timeout_duration: number): void {
        gameTimeouts.set(gameId, 
            setTimeout(() => {
                const room = roomStore.getRoomByGameId(gameId);

                if (room) {
                    const game = gameStore.getGameById(gameId);
                    if (game) {
                        // Notify players that the game has timed out
                        ioInstance.to(room.roomCode).emit('game_timeout', {
                            message: `Game has timed out due to inactivity.`,
                            game: {
                                ...game,
                                playerTexts: game.playerTexts.map(playerText => ({
                                    ...playerText,
                                    playerName: sessionStore.get(playerText.playerId)?.username,
                                    endTime: new Date(),
                                })),
                            },
                            room:{
                                ...room,
                                playerIds: game?.playerIds.map(playerId => ({
                                    sessionId: playerId,
                                    username: sessionStore.get(playerId)?.username,
                                })),
                            }
                        });
                        
                        roomStore.gameEnd(room.roomCode);
                    }
                }
            }, timeout_duration)
        );
    },
    removeTimeout(gameId: string): void {
        const timeout = gameTimeouts.get(gameId);
        if (timeout) {
            clearTimeout(timeout);
            gameTimeouts.delete(gameId);
        }
    }
}