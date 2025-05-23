"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const uuid_1 = require("uuid");
const sessionStorage_1 = require("../memory/sessionStorage");
const roomStorage_1 = require("../memory/roomStorage");
const gameStorage_1 = require("../memory/gameStorage");
const gameTimeouts_1 = require("../memory/gameTimeouts");
class SocketService {
    static setIO(io) {
        SocketService.io = io;
    }
    static handleSocketCustomEvents(socket) {
        socket.on(this.CUSTOM_EVENTS.CREATE_ROOM, (roomName, isPublic) => {
            var _a;
            const creatorSessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            // console.log("room create session:",socket.session)
            // console.log(roomStore.getAll())
            const playerRoom = roomStorage_1.roomStore.getPlayerRoom(creatorSessionId);
            if (playerRoom) {
                socket.emit(this.CUSTOM_EVENTS.CREATE_ROOM_FAILURE, {
                    message: 'You already have a room',
                });
                return;
            }
            //Room name validation
            if (roomName.length < 3 || roomName.length > 20) {
                socket.emit(this.CUSTOM_EVENTS.CREATE_ROOM_FAILURE, {
                    message: 'Room name must be between 3 and 20 characters',
                });
                return;
            }
            const roomCode = (0, uuid_1.v4)().slice(0, 6).toUpperCase();
            roomStorage_1.roomStore.createRoom(roomName, roomCode, creatorSessionId, isPublic);
            roomStorage_1.roomStore.addPlayerToRoom(roomCode, creatorSessionId);
            const room = roomStorage_1.roomStore.getRoomByCode(roomCode);
            socket.join(roomCode);
            socket.emit(this.CUSTOM_EVENTS.CREATE_ROOM_SUCCESS, {
                message: "Room created successfully",
                room: Object.assign(Object.assign({}, room), { playerIds: room === null || room === void 0 ? void 0 : room.playerIds.map(playerId => {
                        var _a;
                        return ({
                            sessionId: playerId,
                            username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                        });
                    }) })
            });
        });
        socket.on(this.CUSTOM_EVENTS.JOIN_ROOM, (roomCode) => {
            var _a, _b, _c;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            // Check if player is already in a room
            const existingRoom = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            if (existingRoom) {
                socket.emit(this.CUSTOM_EVENTS.JOIN_ROOM_FAILURE, {
                    message: 'You are already in another room',
                });
                return;
            }
            const room = roomStorage_1.roomStore.getRoomByCode(roomCode);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.JOIN_ROOM_FAILURE, {
                    message: 'Room not found',
                });
                return;
            }
            socket.join(roomCode);
            roomStorage_1.roomStore.addPlayerToRoom(roomCode, sessionId);
            const sendingRoom = roomStorage_1.roomStore.getRoomByCode(roomCode);
            socket.to(roomCode).emit(this.CUSTOM_EVENTS.PLAYER_JOINED, {
                message: `${(_b = sessionStorage_1.sessionStore.get(sessionId)) === null || _b === void 0 ? void 0 : _b.username} joined the room`,
                sessionId: sessionId,
                playerName: (_c = sessionStorage_1.sessionStore.get(sessionId)) === null || _c === void 0 ? void 0 : _c.username,
                room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                        var _a;
                        return ({
                            sessionId: playerId,
                            username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                        });
                    }) }),
            });
            socket.emit(this.CUSTOM_EVENTS.JOIN_ROOM_SUCCESS, {
                message: 'Joined room successfully',
                room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                        var _a;
                        return ({
                            sessionId: playerId,
                            username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                        });
                    }) })
            });
        });
        socket.on(this.CUSTOM_EVENTS.LEAVE_ROOM, () => {
            var _a, _b;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }
            socket.leave(room.roomCode);
            const playerRoomLeftStatus = roomStorage_1.roomStore.removePlayerFromRoom(sessionId);
            if (playerRoomLeftStatus === "deleted_room") {
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_SUCCESS, {
                    message: 'Room deleted successfully',
                });
                return;
            }
            else if (playerRoomLeftStatus === "removed") {
                const sendingRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                // Notify other players in the room
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_LEFT, {
                    message: `${(_b = sessionStorage_1.sessionStore.get(sessionId)) === null || _b === void 0 ? void 0 : _b.username} left the room`,
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                // Notify the player who left
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_SUCCESS, {
                    message: 'Left room successfully',
                });
                return;
            }
            else if (playerRoomLeftStatus === "not_found") {
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }
            else {
                const newCreatorName = playerRoomLeftStatus.split("=")[1];
                const sendingRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                // Notify other players in the room
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_LEFT, {
                    message: `Room creator changed to ${newCreatorName}`,
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                // Notify the player who left
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_SUCCESS, {
                    message: `Room creator changed to ${newCreatorName}`,
                });
                return;
            }
        });
        socket.on(this.CUSTOM_EVENTS.SEND_MESSAGE, (message) => {
            var _a, _b, _c;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.SEND_MESSAGE_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }
            const roomSendMessageStatus = roomStorage_1.roomStore.sendMessageToRoom(sessionId, (_b = socket.session) === null || _b === void 0 ? void 0 : _b.username, message, room);
            if (roomSendMessageStatus) {
                const sendingRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.RECIEVE_MESSAGE, {
                    sessionId: sessionId,
                    playerName: (_c = sessionStorage_1.sessionStore.get(sessionId)) === null || _c === void 0 ? void 0 : _c.username,
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                socket.emit(this.CUSTOM_EVENTS.SEND_MESSAGE_SUCCESS, {
                    message: 'Message sent successfully',
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
            }
            else {
                socket.emit(this.CUSTOM_EVENTS.SEND_MESSAGE_FAILURE, {
                    message: 'Failed to send message',
                });
            }
        });
        socket.on(this.CUSTOM_EVENTS.KICK_PLAYER, (playerId) => {
            var _a, _b, _c, _d;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.KICK_PLAYER_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }
            const kickPlayerFromRoomStatus = roomStorage_1.roomStore.kickPlayerFromRoom(sessionId, playerId);
            if (kickPlayerFromRoomStatus.success) {
                const sendingRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                // Get kicked player's socket
                const kickedPlayerSocket = SocketService.io.sockets.sockets.get(((_b = sessionStorage_1.sessionStore.get(playerId)) === null || _b === void 0 ? void 0 : _b.socketId) || '');
                // Remove kicked player from room
                kickedPlayerSocket === null || kickedPlayerSocket === void 0 ? void 0 : kickedPlayerSocket.leave(room.roomCode);
                // Notify kicked player directly through their socket
                kickedPlayerSocket === null || kickedPlayerSocket === void 0 ? void 0 : kickedPlayerSocket.emit(this.CUSTOM_EVENTS.PLAYER_KICKED, {
                    playerId: playerId,
                    message: "You have been kicked from the room",
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                // this.io
                // Notify the person who initiated the kick (success confirmation)
                socket.emit(this.CUSTOM_EVENTS.PLAYER_KICKED, {
                    playerId: playerId,
                    message: `${(_c = sessionStorage_1.sessionStore.get(playerId)) === null || _c === void 0 ? void 0 : _c.username} was kicked from the room`,
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
                // Notify all other players in the room (everyone except the socket that initiated this event)
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_KICKED, {
                    playerId: playerId,
                    message: `${(_d = sessionStorage_1.sessionStore.get(playerId)) === null || _d === void 0 ? void 0 : _d.username} was kicked from the room`,
                    room: Object.assign(Object.assign({}, sendingRoom), { playerIds: sendingRoom === null || sendingRoom === void 0 ? void 0 : sendingRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) })
                });
            }
            else {
                socket.emit(this.CUSTOM_EVENTS.KICK_PLAYER_FAILURE, {
                    message: kickPlayerFromRoomStatus.message,
                });
            }
        });
        socket.on(this.CUSTOM_EVENTS.START_GAME, () => {
            var _a;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            const gameStartStatus = roomStorage_1.roomStore.startGame(sessionId);
            if (gameStartStatus.success) {
                const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
                if (!room) {
                    socket.emit(this.CUSTOM_EVENTS.START_GAME_FAILURE, {
                        message: 'You are not in any room',
                    });
                    return;
                }
                const game = gameStorage_1.gameStore.getGameByRoomCode(room.roomCode);
                if (!game) {
                    socket.emit(this.CUSTOM_EVENTS.START_GAME_FAILURE, {
                        message: 'Game not found',
                    });
                    return;
                }
                //Notify all players in the room
                socket.to(room === null || room === void 0 ? void 0 : room.roomCode).emit(this.CUSTOM_EVENTS.START_GAME_SUCCESS, {
                    message: gameStartStatus.message,
                    room: Object.assign(Object.assign({}, room), { playerIds: room === null || room === void 0 ? void 0 : room.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) }),
                    game: Object.assign(Object.assign({}, game), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }), playerTexts: game === null || game === void 0 ? void 0 : game.playerTexts.map(playerText => {
                            var _a;
                            return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                        }) })
                });
                socket.emit(this.CUSTOM_EVENTS.START_GAME_SUCCESS, {
                    message: gameStartStatus.message,
                    room: Object.assign(Object.assign({}, room), { playerIds: room === null || room === void 0 ? void 0 : room.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) }),
                    game: Object.assign(Object.assign({}, game), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }), playerTexts: game === null || game === void 0 ? void 0 : game.playerTexts.map(playerText => {
                            var _a;
                            return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                        }) })
                });
                gameTimeouts_1.gameTimeoutManagement.addTimeout(game.gameId, this.TIMEOUT_DURATION_GAME);
            }
            else {
                socket.emit(this.CUSTOM_EVENTS.START_GAME_FAILURE, {
                    message: gameStartStatus.message,
                });
            }
        });
        socket.on(this.CUSTOM_EVENTS.PLAYER_TYPING, (currentText) => {
            var _a;
            const sessionId = (_a = socket.session) === null || _a === void 0 ? void 0 : _a.sessionId;
            const room = roomStorage_1.roomStore.getPlayerRoom(sessionId);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }
            const game = gameStorage_1.gameStore.getGameByRoomCode(room.roomCode);
            if (!game) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'Game not found',
                });
                return;
            }
            if (!game.playerIds.includes(sessionId)) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'You are not in the game',
                });
                return;
            }
            for (const playerText of game.playerTexts) {
                if (playerText.playerId === sessionId && playerText.completed) {
                    return;
                }
            }
            const playerTypingStatus = gameStorage_1.gameStore.updatePlayerProgress(room.roomCode, sessionId, currentText);
            let gameCompleted = true;
            for (const playerText of game.playerTexts) {
                if (!playerText.completed) {
                    gameCompleted = false;
                    break;
                }
            }
            if (gameCompleted) {
                const updatedRoom = roomStorage_1.roomStore.getRoomByCode(room.roomCode);
                socket.emit(this.CUSTOM_EVENTS.GAME_ENDED, {
                    message: 'Game ended successfully',
                    room: Object.assign(Object.assign({}, updatedRoom), { playerIds: updatedRoom === null || updatedRoom === void 0 ? void 0 : updatedRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) }),
                    game: Object.assign(Object.assign({}, game), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }), playerTexts: game === null || game === void 0 ? void 0 : game.playerTexts.map(playerText => {
                            var _a;
                            return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                        }) })
                });
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.GAME_ENDED, {
                    message: 'Game ended successfully',
                    room: Object.assign(Object.assign({}, updatedRoom), { playerIds: updatedRoom === null || updatedRoom === void 0 ? void 0 : updatedRoom.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }) }),
                    game: Object.assign(Object.assign({}, game), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                            var _a;
                            return ({
                                sessionId: playerId,
                                username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                            });
                        }), playerTexts: game === null || game === void 0 ? void 0 : game.playerTexts.map(playerText => {
                            var _a;
                            return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                        }) })
                });
                roomStorage_1.roomStore.gameEnd(room.roomCode);
                gameTimeouts_1.gameTimeoutManagement.removeTimeout(game.gameId);
                return;
            }
            if (!playerTypingStatus) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'Failed to update player progress',
                });
                return;
            }
            socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_SUCCESS, {
                message: 'Player progress updated successfully',
                game: Object.assign(Object.assign({}, game), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                        var _a;
                        return ({
                            sessionId: playerId,
                            username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                        });
                    }), playerTexts: game === null || game === void 0 ? void 0 : game.playerTexts.map(playerText => {
                        var _a;
                        return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                    }) })
            });
            socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_TYPING_SUCCESS, {
                message: 'Player progress updated successfully',
                game: Object.assign(Object.assign({}, game), { playerIds: game === null || game === void 0 ? void 0 : game.playerIds.map(playerId => {
                        var _a;
                        return ({
                            sessionId: playerId,
                            username: (_a = sessionStorage_1.sessionStore.get(playerId)) === null || _a === void 0 ? void 0 : _a.username,
                        });
                    }), playerTexts: game === null || game === void 0 ? void 0 : game.playerTexts.map(playerText => {
                        var _a;
                        return (Object.assign(Object.assign({}, playerText), { playerName: (_a = sessionStorage_1.sessionStore.get(playerText.playerId)) === null || _a === void 0 ? void 0 : _a.username }));
                    }) })
            });
        });
    }
}
exports.SocketService = SocketService;
SocketService.TIMEOUT_DURATION_GAME = 1000 * 60 * 3;
SocketService.CUSTOM_EVENTS = {
    CREATE_ROOM: 'create_room',
    CREATE_ROOM_SUCCESS: 'create_room_success',
    CREATE_ROOM_FAILURE: 'create_room_failure',
    JOIN_ROOM: 'join_room',
    JOIN_ROOM_SUCCESS: 'join_room_success',
    JOIN_ROOM_FAILURE: 'join_room_failure',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',
    PLAYER_KICKED: 'player_kicked',
    LEAVE_ROOM: 'leave_room',
    LEAVE_ROOM_SUCCESS: 'leave_room_success',
    LEAVE_ROOM_FAILURE: 'leave_room_failure',
    SEND_MESSAGE: 'send_message',
    SEND_MESSAGE_SUCCESS: 'send_message_success',
    SEND_MESSAGE_FAILURE: 'send_message_failure',
    RECIEVE_MESSAGE: 'recieve_message',
    KICK_PLAYER: 'kick_player',
    KICK_PLAYER_SUCCESS: 'kick_player_success',
    KICK_PLAYER_FAILURE: 'kick_player_failure',
    START_GAME: 'start_game',
    START_GAME_SUCCESS: 'start_game_success',
    START_GAME_FAILURE: 'start_game_failure',
    PLAYER_TYPING: 'player_typing',
    PLAYER_TYPING_SUCCESS: 'player_typing_success',
    PLAYER_TYPING_FAILURE: 'player_typing_failure',
    GAME_ENDED: 'game_ended',
    GAME_TIMEOUT: 'game_timeout',
};
