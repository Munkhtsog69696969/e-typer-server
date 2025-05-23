"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketConfig = void 0;
const socket_io_1 = require("socket.io");
const roomStorage_1 = require("../memory/roomStorage");
const socketService_1 = require("../services/socketService");
const sessionStorage_1 = require("../memory/sessionStorage");
const disconnectTimeouts_1 = require("../memory/disconnectTimeouts");
const gameTimeouts_1 = require("../memory/gameTimeouts");
const gameStorage_1 = require("../memory/gameStorage");
class SocketConfig {
    constructor(server) {
        this.TIMEOUT_DURATION = 1000 * 15;
        this.EVENTS = {
            CONNECTION: 'connection',
            DISCONNECT: 'disconnect',
            PLAYER_JOINED: 'player_joined',
            PLAYER_LEFT: 'player_left',
            PLAYER_KICKED: 'player_kicked',
            ROOM_FOUND: 'room_found',
            GAME_FOUND: 'game_found',
        };
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
            transports: ['websocket', 'polling']
        });
        disconnectTimeouts_1.timeoutManagement.setIO(this.io);
        gameTimeouts_1.gameTimeoutManagement.setIO(this.io);
        socketService_1.SocketService.setIO(this.io);
        this.setupMiddleware();
        this.initializeSocketEvents();
    }
    initializeSocketEvents() {
        this.io.on(this.EVENTS.CONNECTION, (socket) => {
            // console.log(`Client connected: ${socket.id}`);
            var _a;
            const session = socket.session;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            sessionStorage_1.sessionStore.updateSocketId(sessionId, socket.id);
            const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            if (room) {
                socket.join(room.roomCode);
                // console.log(`Socket ${socket.id} rejoined room ${room.roomCode}`);
                // Notify other room members of rejoin
                socket.to(room.roomCode).emit(this.EVENTS.PLAYER_JOINED, {
                    message: `${session.username} reconnected`,
                    room: Object.assign(Object.assign({}, room), { playerIds: room.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                socket.emit(this.EVENTS.ROOM_FOUND, {
                    room: Object.assign(Object.assign({}, room), { playerIds: room.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                if (room.inGame) {
                    const game = gameStorage_1.gameStore.getGameByRoomCode(room.roomCode);
                    if (!game)
                        return;
                    socket.emit(this.EVENTS.GAME_FOUND, {
                        game: Object.assign(Object.assign({}, game), { playerTexts: game.playerTexts.map(playerText => {
                                var _a;
                                return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                            }) }),
                        room: Object.assign(Object.assign({}, room), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                                var _a;
                                return ({
                                    sessionId: playerId,
                                    username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                                });
                            }) })
                    });
                }
            }
            // console.log(sessionStore.getAll());
            socketService_1.SocketService.handleSocketCustomEvents(socket);
            socket.on(this.EVENTS.DISCONNECT, () => {
                var _a;
                // console.log(`Client disconnected: ${socket.id}`);
                if (socket.session) {
                    const sessionId = socket.session.sessionId;
                    const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
                    if (room) {
                        // Notify other players in room before removal
                        socket.to(room.roomCode).emit(this.EVENTS.PLAYER_LEFT, {
                            message: `${(_a = sessionStorage_1.sessionStore.get(sessionId)) === null || _a === void 0 ? void 0 : _a.username} disconnected`,
                            room: Object.assign(Object.assign({}, room), { playerIds: room.playerIds.map(playerId => {
                                    var _a;
                                    return ({
                                        sessionId: playerId,
                                        username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                                    });
                                }) })
                        });
                    }
                    // Start disconnect timeout
                    disconnectTimeouts_1.timeoutManagement.addTimeout(sessionId, this.TIMEOUT_DURATION);
                }
            });
        });
    }
    // middelware with EVENT exception
    setupMiddleware() {
        this.io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                // console.log(sessionStore.getAll());
                const sessionId = socket.handshake.auth.sessionId;
                if (!sessionId) {
                    console.error(`Authentication failed: No session ID provided for socket ${socket.id}`);
                    socket.disconnect(true);
                    return next(new Error('No session ID provided'));
                }
                const session = sessionStorage_1.sessionStore.get(sessionId);
                if (!session) {
                    console.error(`Authentication failed: Invalid session ID ${sessionId} for socket ${socket.id}`);
                    socket.disconnect(true);
                    return next(new Error('Invalid session, register again'));
                }
                sessionStorage_1.sessionStore.updateSocketId(sessionId, socket.id);
                disconnectTimeouts_1.timeoutManagement.removeTimeout(sessionId);
                socket.session = session;
                next();
            }
            catch (error) {
                socket.disconnect(true);
                console.error('Middleware error:', error);
                next(new Error('Internal server error'));
            }
        }));
    }
    getIO() {
        return this.io;
    }
}
exports.SocketConfig = SocketConfig;
exports.default = SocketConfig;
