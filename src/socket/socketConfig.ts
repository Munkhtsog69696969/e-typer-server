import { Server as SocketIOServer, Socket } from 'socket.io';
import { Session } from '../memory/sessionStorage';
import { roomStore } from '../memory/roomStorage';

declare module 'socket.io' {
    interface Socket {
        session?: Session;
    }
}

import { Server as HTTPServer } from 'http';
import { SocketService } from '../services/socketService';
import { sessionStore } from '../memory/sessionStorage';
import { SocketDefaultEvents } from '../types/socketEvents';
import { timeoutManagement } from '../memory/disconnectTimeouts';
import { gameTimeoutManagement } from '../memory/gameTimeouts';
import { gameStore } from '../memory/gameStorage';

export class SocketConfig {
    private io: SocketIOServer;
    private readonly TIMEOUT_DURATION = 1000 * 60 * 5; // 5 minutes

    private readonly EVENTS: SocketDefaultEvents = {
        CONNECTION: 'connection',
        DISCONNECT: 'disconnect',
        PLAYER_JOINED: 'player_joined',
        PLAYER_LEFT: 'player_left',
        PLAYER_KICKED: 'player_kicked',
        ROOM_FOUND: 'room_found',
        GAME_FOUND: 'game_found',
    };

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
            transports: ['websocket', 'polling']
        });
        timeoutManagement.setIO(this.io);
        gameTimeoutManagement.setIO(this.io);
        SocketService.setIO(this.io);
        this.setupMiddleware();
        this.initializeSocketEvents();
    }

    private initializeSocketEvents(): void {
        this.io.on(this.EVENTS.CONNECTION, (socket) => {
            console.log(`Client connected: ${socket.id}`);
            
            const session=socket.session;
            const sessionId = socket.session?.sessionId
            
            sessionStore.updateSocketId(sessionId, socket.id)
            
            const room = roomStore.getPlayerRoom(sessionId);

            if (room) {
                socket.join(room.roomCode);
                console.log(`Socket ${socket.id} rejoined room ${room.roomCode}`);
                
                // Notify other room members of rejoin
                socket.to(room.roomCode).emit(this.EVENTS.PLAYER_JOINED, {
                    message: `${session.username} reconnected`,
                    room:{
                        ...room,
                        playerIds: room.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });
                socket.emit(this.EVENTS.ROOM_FOUND, {
                    room: {
                        ...room,
                        playerIds: room.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });
                if(room.inGame) {
                    const game = gameStore.getGameByRoomCode(room.roomCode);
                    if(!game) return;
                    socket.emit(this.EVENTS.GAME_FOUND, {
                        game: {
                            ...game,
                            playerTexts: game.playerTexts.map(playerText => ({
                                ...playerText,
                                playerName: sessionStore.get(playerText.playerId)?.username,
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
                }

            }

            // console.log(sessionStore.getAll());
            SocketService.handleSocketCustomEvents(socket);
            
            socket.on(this.EVENTS.DISCONNECT, () => {
                console.log(`Client disconnected: ${socket.id}`);
                if (socket.session) {
                    const sessionId = socket.session.sessionId;
                    const room = roomStore.getPlayerRoom(sessionId);
                    
                    if (room) {
                        // Notify other players in room before removal
                        socket.to(room.roomCode).emit(this.EVENTS.PLAYER_LEFT, {
                            message: `${sessionStore.get(sessionId)?.username} disconnected`,
                            room:{
                                ...room,
                                playerIds: room.playerIds.map(playerId => ({
                                    sessionId: playerId,
                                    username: sessionStore.get(playerId)?.username,
                                })),
                            }
                        });
                    }
                    
                    // Start disconnect timeout
                    timeoutManagement.addTimeout(sessionId, this.TIMEOUT_DURATION);
                }
            });
        });
    }

    // middelware with EVENT exception
    private setupMiddleware(): void {
        this.io.use(async (socket, next) => {
            try {
                // console.log(sessionStore.getAll());
                const sessionId = socket.handshake.auth.sessionId;
                if (!sessionId) {
                    console.error(`Authentication failed: No session ID provided for socket ${socket.id}`);
                    socket.disconnect(true)
                    return next(new Error('No session ID provided'));
                }

                const session = sessionStore.get(sessionId);
                if (!session) {
                    console.error(`Authentication failed: Invalid session ID ${sessionId} for socket ${socket.id}`);
                    socket.disconnect(true)
                    return next(new Error('Invalid session, register again'));
                }

                sessionStore.updateSocketId(sessionId, socket.id);
                timeoutManagement.removeTimeout(sessionId);
                
                socket.session = session;
                next();
            } catch (error) {
                socket.disconnect(true)
                console.error('Middleware error:', error);
                next(new Error('Internal server error'));
            }
        });
    }

    public getIO(): SocketIOServer {
        return this.io;
    }
}

export default SocketConfig;