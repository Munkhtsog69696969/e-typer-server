import { sessionStore } from "./sessionStorage";
import { gameStore } from "./gameStorage";
import { v4 as uuidv4 } from 'uuid';
import { generateSentence } from "../utils/generateTexts";

export interface Room {
    creatorSessionId: string;
    roomCode: string;
    roomName: string;
    playerIds : string[];
    createdAt: Date;
    isPublic: boolean;
    messages: Message[];
    inGame: boolean;
    gameId?: string | null;
}

interface Message {
    senderId: string;
    senderName: string;
    content: string;
    timestamp: Date;
}

const rooms= new Map<string, Room>();
const playerRoomMap = new Map<string, string>();

export const roomStore = {
    createRoom(roomName: string, roomCode: string, creatorSessionId: string, isPublic: boolean): void {
        const room: Room = {
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

    addPlayerToRoom(roomCode: string, playerId: string): void {
        const room = rooms.get(roomCode);
        if (room) {
            room.playerIds.push(playerId);
            playerRoomMap.set(playerId, roomCode);
        }
    },

    getPlayerRoom(playerId: string): Room | undefined {
        const roomCode = playerRoomMap.get(playerId);
        return roomCode ? rooms.get(roomCode) : undefined;
    },

    removePlayerFromRoom(playerId: string): string {
        const roomCode = playerRoomMap.get(playerId);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                // Make second player the creator if the first player leaves
                if(room.creatorSessionId=== playerId && room.playerIds.length > 1) {
                    room.creatorSessionId=room.playerIds[1]
                    room.playerIds = room.playerIds.filter(id => id !== playerId);
                    const newCreatorName=sessionStore.get(room.creatorSessionId)?.username
                    playerRoomMap.delete(playerId);
                    return `new_creator=${newCreatorName}`
                }
                // Remove player from the room
                room.playerIds = room.playerIds.filter(id => id !== playerId);
                if (room.playerIds.length === 0) {
                    if(room.inGame){
                        gameStore.deleteGame(room.roomCode);
                    }
                    playerRoomMap.delete(playerId);
                    rooms.delete(roomCode);
                    return "deleted_room"
                }
            }
            playerRoomMap.delete(playerId);
            return "removed"
        }
        return "not_found"
    },

    getRoomByCode(roomCode:string) : Room | undefined {
        return rooms.get(roomCode);
    },

    getRoomByCreatorSessionId(creatorSessionId:string) : Room | undefined {
        for (const room of rooms.values()) {
            if (room.creatorSessionId === creatorSessionId) {
                return room;
            }
        }   
        return undefined;
    },

    getAll() :Room[] {
        return Array.from(rooms.values());
    },

    sendMessageToRoom(playerId:string, playerName:string, message:string, room:Room) : boolean {
        const ifPlayerInRoom=room.playerIds.includes(playerId)

        if(ifPlayerInRoom) {
            if(room.messages.length > 30) {
                room.messages.shift(); 
            }

            const newMessage: Message = {
                senderId: playerId,
                senderName: playerName,
                content: message,
                timestamp: new Date(),
            };
            room.messages.push(newMessage);
            return true;
        } else {
            return false;
        }
    },

    kickPlayerFromRoom(initiatorId: string, playerToKickId: string): {success: boolean, message: string} {
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
            if(room.inGame){
                gameStore.deleteGame(room.roomCode);
            }
            rooms.delete(room.roomCode);
        }

        return {
            success: true,
            message: "Player kicked successfully"
        };
    },

    startGame(playerId:string) : {success: boolean, message: string} {
        const room = this.getRoomByCreatorSessionId(playerId)

        if(!room){
            return {
                success: false,
                message: "You are not the creator of any room"
            }
        }

        if(room.inGame) {
            return {
                success: false,
                message: "Game already started"
            }
        }

        if(room.playerIds.length < 2) {
            return {
                success: false,
                message: "Not enough players to start the game"
            }
        }

        const gameId = uuidv4();

        const WORDS_IN_SENTENCE = 10

        const sentence = generateSentence(WORDS_IN_SENTENCE);

        const createGameStatus=gameStore.createGame(sentence, gameId, room.playerIds, room.roomCode)

        if(createGameStatus===false) {
            return {
                success: false,
                message: "Game creation failed"
            }
        }

        room.inGame = true;
        room.gameId = gameId;

        return {
            success: true,
            message: "Game started successfully",
        }
    },

    getRoomByGameId(gameId:string) : Room | undefined {
        for (const room of rooms.values()) {
            if (room.gameId === gameId) {
                return room;
            }
        }
        return undefined;
    },

    gameEnd(roomCode:string) :void {
        const room = rooms.get(roomCode);
        if (room) {
            room.inGame = false;
            room.gameId = null;
            gameStore.deleteGame(roomCode);
        }
    }

};