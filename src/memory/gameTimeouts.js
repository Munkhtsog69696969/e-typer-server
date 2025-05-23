"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameTimeoutManagement = void 0;
const roomStorage_1 = require("./roomStorage");
const gameStorage_1 = require("./gameStorage");
const sessionStorage_1 = require("./sessionStorage");
// gameId , Timeout
const gameTimeouts = new Map();
let ioInstance;
exports.gameTimeoutManagement = {
    setIO(io) {
        ioInstance = io;
    },
    addTimeout(gameId, timeout_duration) {
        gameTimeouts.set(gameId, setTimeout(() => {
            const room = roomStorage_1.roomStore.getRoomByGameId(gameId);
            if (room) {
                const game = gameStorage_1.gameStore.getGameById(gameId);
                if (game) {
                    // Notify players that the game has timed out
                    ioInstance.to(room.roomCode).emit('game_timeout', {
                        message: `Game has timed out due to inactivity.`,
                        game: Object.assign(Object.assign({}, game), { playerTexts: game.playerTexts.map(playerText => {
                                var _a;
                                return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username, endTime: new Date() }));
                            }) }),
                        room: Object.assign(Object.assign({}, room), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                                var _a;
                                return ({
                                    sessionId: playerId,
                                    username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                                });
                            }) })
                    });
                    roomStorage_1.roomStore.gameEnd(room.roomCode);
                }
            }
        }, timeout_duration));
    },
    removeTimeout(gameId) {
        const timeout = gameTimeouts.get(gameId);
        if (timeout) {
            clearTimeout(timeout);
            gameTimeouts.delete(gameId);
        }
    }
};
