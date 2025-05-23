"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomStore = void 0;
const sessionStorage_1 = require("./sessionStorage");
const gameStorage_1 = require("./gameStorage");
const uuid_1 = require("uuid");
const generateTexts_1 = require("../utils/generateTexts");
const rooms = new Map();
const playerRoomMap = new Map();
exports.roomStore = {
    createRoom(roomName, roomCode, creatorSessionId, isPublic) {
        const room = {
            creatorSessionId,
            roomCode,
            roomName,
            playerIds: [],
            messages: [],
            createdAt: new Date(),
            isPublic,
            inGame: false,
        };
        rooms.set(roomCode, room);
        playerRoomMap.set(creatorSessionId, roomCode);
    },
    addPlayerToRoom(roomCode, playerId) {
        const room = rooms.get(roomCode);
        if (room) {
            room.playerIds.push(playerId);
            playerRoomMap.set(playerId, roomCode);
        }
    },
    getPlayerRoom(playerId) {
        const roomCode = playerRoomMap.get(playerId);
        return roomCode ? rooms.get(roomCode) : undefined;
    },
    removePlayerFromRoom(playerId) {
        var _a;
        const roomCode = playerRoomMap.get(playerId);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                // Make second player the creator if the first player leaves
                if (room.creatorSessionId === playerId && room.playerIds.length > 1) {
                    room.creatorSessionId = room.playerIds[1];
                    room.playerIds = room.playerIds.filter(id => id !== playerId);
                    const newCreatorName = (_a = sessionStorage_1.sessionStore.get(room.creatorSessionId)) === null || _a === void 0 ? void 0 : _a.username;
                    playerRoomMap.delete(playerId);
                    return `new_creator=${newCreatorName}`;
                }
                // Remove player from the room
                room.playerIds = room.playerIds.filter(id => id !== playerId);
                if (room.playerIds.length === 0) {
                    if (room.inGame) {
                        gameStorage_1.gameStore.deleteGame(room.roomCode);
                    }
                    playerRoomMap.delete(playerId);
                    rooms.delete(roomCode);
                    return "deleted_room";
                }
            }
            playerRoomMap.delete(playerId);
            return "removed";
        }
        return "not_found";
    },
    getRoomByCode(roomCode) {
        return rooms.get(roomCode);
    },
    getRoomByCreatorSessionId(creatorSessionId) {
        for (const room of rooms.values()) {
            if (room.creatorSessionId === creatorSessionId) {
                return room;
            }
        }
        return undefined;
    },
    getAll() {
        return Array.from(rooms.values());
    },
    sendMessageToRoom(playerId, playerName, message, room) {
        const ifPlayerInRoom = room.playerIds.includes(playerId);
        if (ifPlayerInRoom) {
            if (room.messages.length > 30) {
                room.messages.shift();
            }
            const newMessage = {
                senderId: playerId,
                senderName: playerName,
                content: message,
                timestamp: new Date(),
            };
            room.messages.push(newMessage);
            return true;
        }
        else {
            return false;
        }
    },
    kickPlayerFromRoom(initiatorId, playerToKickId) {
        // Get room of initiator
        const room = this.getPlayerRoom(initiatorId);
        if (!room) {
            return {
                success: false,
                message: "Initiator is not in any room"
            };
        }
        // Check if initiator is the room creator
        if (room.creatorSessionId !== initiatorId) {
            return {
                success: false,
                message: "Only room creator can kick players"
            };
        }
        // Check if player to kick exists in the room
        if (!room.playerIds.includes(playerToKickId)) {
            return {
                success: false,
                message: "Player to kick is not in this room"
            };
        }
        // Cannot kick yourself (room creator)
        if (initiatorId === playerToKickId) {
            return {
                success: false,
                message: "Room creator cannot kick themselves"
            };
        }
        // Remove player from room
        room.playerIds = room.playerIds.filter(id => id !== playerToKickId);
        playerRoomMap.delete(playerToKickId);
        // Clean up empty room
        if (room.playerIds.length === 0) {
            if (room.inGame) {
                gameStorage_1.gameStore.deleteGame(room.roomCode);
            }
            rooms.delete(room.roomCode);
        }
        return {
            success: true,
            message: "Player kicked successfully"
        };
    },
    startGame(playerId) {
        const room = this.getRoomByCreatorSessionId(playerId);
        if (!room) {
            return {
                success: false,
                message: "You are not the creator of any room"
            };
        }
        if (room.inGame) {
            return {
                success: false,
                message: "Game already started"
            };
        }
        if (room.playerIds.length < 2) {
            return {
                success: false,
                message: "Not enough players to start the game"
            };
        }
        const gameId = (0, uuid_1.v4)();
        const WORDS_IN_SENTENCE = 10;
        const sentence = (0, generateTexts_1.generateSentence)(WORDS_IN_SENTENCE);
        const createGameStatus = gameStorage_1.gameStore.createGame(sentence, gameId, room.playerIds, room.roomCode);
        if (createGameStatus === false) {
            return {
                success: false,
                message: "Game creation failed"
            };
        }
        room.inGame = true;
        room.gameId = gameId;
        return {
            success: true,
            message: "Game started successfully",
        };
    },
    getRoomByGameId(gameId) {
        for (const room of rooms.values()) {
            if (room.gameId === gameId) {
                return room;
            }
        }
        return undefined;
    },
    gameEnd(roomCode) {
        const room = rooms.get(roomCode);
        if (room) {
            room.inGame = false;
            room.gameId = null;
            gameStorage_1.gameStore.deleteGame(roomCode);
        }
    }
};
