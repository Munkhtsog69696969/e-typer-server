"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeoutManagement = void 0;
const sessionStorage_1 = require("./sessionStorage");
const roomStorage_1 = require("./roomStorage");
const disconnectTimeouts = new Map();
// Add io instance
let ioInstance;
exports.timeoutManagement = {
    // Add method to set io instance
    setIO(io) {
        ioInstance = io;
    },
    addTimeout(sessionId, timeout_duration) {
        disconnectTimeouts.set(sessionId, setTimeout(() => {
            var _a, _b, _c, _d, _e;
            const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            const socketId = (_a = sessionStorage_1.sessionStore.get(sessionId)) === null || _a === void 0 ? void 0 : _a.socketId;
            if (room) {
                // If player is room creator
                if (room.creatorSessionId === sessionId) {
                    roomStorage_1.roomStore.removePlayerFromRoom(sessionId);
                    const sendingRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                    // Notify room members before removing creator
                    ioInstance.to(room.roomCode).emit('player_left', {
                        message: `Room creator has left the game, ${(_b = sessionStorage_1.sessionStore.get(room.playerIds[0])) === null || _b === void 0 ? void 0 : _b.username} is now the new creator`,
                        room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                                var _a;
                                return ({
                                    sessionId: playerId,
                                    username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                                });
                            }) })
                    });
                    // Remove from room and socket room
                    if (socketId) {
                        (_c = ioInstance.sockets.sockets.get(socketId)) === null || _c === void 0 ? void 0 : _c.leave(room.roomCode);
                    }
                }
                else {
                    roomStorage_1.roomStore.removePlayerFromRoom(sessionId);
                    const sendingRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                    // Regular player leaving
                    ioInstance.to(room.roomCode).emit('player_left', {
                        message: `${(_d = sessionStorage_1.sessionStore.get(sessionId)) === null || _d === void 0 ? void 0 : _d.username} left the room`,
                        room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                                var _a;
                                return ({
                                    sessionId: playerId,
                                    username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                                });
                            }) })
                    });
                    // Remove from room and socket room
                    if (socketId) {
                        (_e = ioInstance.sockets.sockets.get(socketId)) === null || _e === void 0 ? void 0 : _e.leave(room.roomCode);
                    }
                }
            }
            // Clean up session
            sessionStorage_1.sessionStore.remove(sessionId);
            disconnectTimeouts.delete(sessionId);
            // console.log(`Session and room cleanup completed for socket ${socketId}`);
        }, timeout_duration));
    },
    removeTimeout(sessionId) {
        const timeout = disconnectTimeouts.get(sessionId);
        if (timeout) {
            clearTimeout(timeout);
            disconnectTimeouts.delete(sessionId);
            // console.log(`Player returned!`);
        }
    }
};
