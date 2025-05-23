import { Socket, Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { sessionStore } from '../memory/sessionStorage';
import { roomStore } from '../memory/roomStorage';
import { gameStore } from '../memory/gameStorage';
import { SocketCustomEvents } from '../types/socketEvents';
import { gameTimeoutManagement } from '../memory/gameTimeouts';

export class SocketService {
    private static io: SocketIOServer;
    private static readonly TIMEOUT_DURATION_GAME = 1000 * 60 * 3;

    public static setIO(io: SocketIOServer): void {
        SocketService.io = io;
    }

    private static readonly CUSTOM_EVENTS:SocketCustomEvents = {
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

    public static handleSocketCustomEvents(socket: Socket): void {
        socket.on(this.CUSTOM_EVENTS.CREATE_ROOM, (roomName:string, isPublic:boolean) => {
            const creatorSessionId = socket.session?.sessionId as string;

            // console.log("room create session:",socket.session)
            // console.log(roomStore.getAll())

            const playerRoom = roomStore.getPlayerRoom(creatorSessionId);

            if(playerRoom) {
                socket.emit(this.CUSTOM_EVENTS.CREATE_ROOM_FAILURE, {
                    message: 'You already have a room',
                });
                return;
            }

            //Room name validation
            if(roomName.length < 3 || roomName.length > 20) {
                socket.emit(this.CUSTOM_EVENTS.CREATE_ROOM_FAILURE, {
                    message: 'Room name must be between 3 and 20 characters',
                });
                return
            }

            const roomCode = uuidv4().slice(0, 6).toUpperCase();

            roomStore.createRoom(roomName, roomCode, creatorSessionId, isPublic);
            roomStore.addPlayerToRoom(roomCode, creatorSessionId);

            const room = roomStore.getRoomByCode(roomCode);

            socket.join(roomCode);

            socket.emit(this.CUSTOM_EVENTS.CREATE_ROOM_SUCCESS, {
                message:"Room created successfully",
                room: {
                    ...room,
                    playerIds: room?.playerIds.map(playerId => ({
                        sessionId: playerId,
                        username: sessionStore.get(playerId)?.username,
                    })),
                }
            })
        });
        socket.on(this.CUSTOM_EVENTS.JOIN_ROOM, (roomCode: string) => {
            const sessionId = socket.session?.sessionId as string;
            
            // Check if player is already in a room
            const existingRoom = roomStore.getPlayerRoom(sessionId);
            if (existingRoom) {
                socket.emit(this.CUSTOM_EVENTS.JOIN_ROOM_FAILURE, {
                    message: 'You are already in another room',
                });
                return;
            }

            const room = roomStore.getRoomByCode(roomCode);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.JOIN_ROOM_FAILURE, {
                    message: 'Room not found',
                });
                return;
            }

            socket.join(roomCode);

            roomStore.addPlayerToRoom(roomCode, sessionId);

            const sendingRoom=roomStore.getRoomByCode(roomCode);

            socket.to(roomCode).emit(this.CUSTOM_EVENTS.PLAYER_JOINED, {
                message : `${sessionStore.get(sessionId)?.username} joined the room`,
                sessionId: sessionId,
                playerName: sessionStore.get(sessionId)?.username,
                room: {
                    ...sendingRoom,
                    playerIds: sendingRoom?.playerIds.map(playerId => ({
                        sessionId: playerId,
                        username: sessionStore.get(playerId)?.username,
                    })),
                },
            });

            
            socket.emit(this.CUSTOM_EVENTS.JOIN_ROOM_SUCCESS, {
                message: 'Joined room successfully',
                room: {
                    ...sendingRoom,
                    playerIds: sendingRoom?.playerIds.map(playerId => ({
                        sessionId: playerId,
                        username: sessionStore.get(playerId)?.username,
                    })),
                }
            });
        });
        socket.on(this.CUSTOM_EVENTS.LEAVE_ROOM, () => {
            const sessionId = socket.session?.sessionId as string;

            const room = roomStore.getPlayerRoom(sessionId);
            if (!room) {
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }
            socket.leave(room.roomCode);

            const playerRoomLeftStatus=roomStore.removePlayerFromRoom(sessionId);

            if(playerRoomLeftStatus==="deleted_room") {
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_SUCCESS, {
                    message: 'Room deleted successfully',
                });
                return;
            }else if(playerRoomLeftStatus==="removed") {
                const sendingRoom=roomStore.getRoomByCode(room.roomCode);
                // Notify other players in the room
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_LEFT, {
                    message: `${sessionStore.get(sessionId)?.username} left the room`,
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });
                // Notify the player who left
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_SUCCESS, {
                    message: 'Left room successfully',
                });
                return;
            }else if(playerRoomLeftStatus=== "not_found"){
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }else{
                const newCreatorName=playerRoomLeftStatus.split("=")[1]

                const sendingRoom=roomStore.getRoomByCode(room.roomCode);
                // Notify other players in the room
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_LEFT, {
                    message: `Room creator changed to ${newCreatorName}`,
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                })
                // Notify the player who left
                socket.emit(this.CUSTOM_EVENTS.LEAVE_ROOM_SUCCESS, {
                    message: `Room creator changed to ${newCreatorName}`,
                });
                return;
            }
        });
        socket.on(this.CUSTOM_EVENTS.SEND_MESSAGE, (message: string) => {
            const sessionId = socket.session?.sessionId as string;

            const room = roomStore.getPlayerRoom(sessionId);

            if(!room) {
                socket.emit(this.CUSTOM_EVENTS.SEND_MESSAGE_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }

            const roomSendMessageStatus=roomStore.sendMessageToRoom(
                sessionId,
                socket.session?.username as string,
                message, 
                room
            );

            if(roomSendMessageStatus) {
                const sendingRoom=roomStore.getRoomByCode(room.roomCode);

                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.RECIEVE_MESSAGE, {
                    sessionId: sessionId,
                    playerName: sessionStore.get(sessionId)?.username,
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });

                socket.emit(this.CUSTOM_EVENTS.SEND_MESSAGE_SUCCESS, {
                    message: 'Message sent successfully',
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });
            } else {
                socket.emit(this.CUSTOM_EVENTS.SEND_MESSAGE_FAILURE, {
                    message: 'Failed to send message',
                });
            }
        });
        socket.on(this.CUSTOM_EVENTS.KICK_PLAYER, (playerId: string) => {
            const sessionId = socket.session?.sessionId as string;
            const room = roomStore.getPlayerRoom(sessionId);

            if(!room) {
                socket.emit(this.CUSTOM_EVENTS.KICK_PLAYER_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }

            const kickPlayerFromRoomStatus = roomStore.kickPlayerFromRoom(sessionId, playerId);

            if(kickPlayerFromRoomStatus.success) {
                const sendingRoom = roomStore.getRoomByCode(room.roomCode);
                
                // Get kicked player's socket
                const kickedPlayerSocket = SocketService.io.sockets.sockets.get(
                    sessionStore.get(playerId)?.socketId || ''
                );

                // Remove kicked player from room
                kickedPlayerSocket?.leave(room.roomCode);

                // Notify kicked player directly through their socket
                kickedPlayerSocket?.emit(this.CUSTOM_EVENTS.PLAYER_KICKED, {
                    playerId: playerId,
                    message: "You have been kicked from the room",
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });

                // this.io

                // Notify the person who initiated the kick (success confirmation)
                socket.emit(this.CUSTOM_EVENTS.PLAYER_KICKED, {
                    playerId: playerId,
                    message: `${sessionStore.get(playerId)?.username} was kicked from the room`,
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });

                // Notify all other players in the room (everyone except the socket that initiated this event)
                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_KICKED, {
                    playerId: playerId,
                    message: `${sessionStore.get(playerId)?.username} was kicked from the room`,
                    room: {
                        ...sendingRoom,
                        playerIds: sendingRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    }
                });
            } else {
                socket.emit(this.CUSTOM_EVENTS.KICK_PLAYER_FAILURE, {
                    message: kickPlayerFromRoomStatus.message,
                });
            }
        });
        socket.on(this.CUSTOM_EVENTS.START_GAME, () => {
            const sessionId = socket.session?.sessionId as string;

            const gameStartStatus=roomStore.startGame(sessionId);

            if(gameStartStatus.success) {
                const room = roomStore.getPlayerRoom(sessionId);

                if(!room){
                    socket.emit(this.CUSTOM_EVENTS.START_GAME_FAILURE, {
                        message: 'You are not in any room',
                    });
                    return;
                }

                const game=gameStore.getGameByRoomCode(room.roomCode);

                if(!game) {
                    socket.emit(this.CUSTOM_EVENTS.START_GAME_FAILURE, {
                        message: 'Game not found',
                    });
                    return;
                }
                
                //Notify all players in the room
                socket.to(room?.roomCode).emit(this.CUSTOM_EVENTS.START_GAME_SUCCESS, {
                    message: gameStartStatus.message,
                    room: {
                        ...room,
                        playerIds: room?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    },
                    game: {
                        ...game,
                        playerIds: game?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                        playerTexts: game?.playerTexts.map(playerText => ({
                            ...playerText,
                            playerName: sessionStore.get(playerText.playerId)?.username,
                        }))
                    }
                });

                socket.emit(this.CUSTOM_EVENTS.START_GAME_SUCCESS, {
                    message: gameStartStatus.message,
                    room: {
                        ...room,
                        playerIds: room?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    },
                    game: {
                        ...game,
                        playerIds: game?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                        playerTexts: game?.playerTexts.map(playerText => ({
                            ...playerText,
                            playerName: sessionStore.get(playerText.playerId)?.username,
                        }))
                    }
                });

                gameTimeoutManagement.addTimeout(game.gameId, this.TIMEOUT_DURATION_GAME);
            } else {
                socket.emit(this.CUSTOM_EVENTS.START_GAME_FAILURE, {
                    message: gameStartStatus.message,
                });
            }
        }); 
        socket.on(this.CUSTOM_EVENTS.PLAYER_TYPING, (currentText:string) => {
            const sessionId = socket.session?.sessionId as string;

            const room = roomStore.getPlayerRoom(sessionId);

            if(!room) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'You are not in any room',
                });
                return;
            }

            const game=gameStore.getGameByRoomCode(room.roomCode);

            if(!game) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'Game not found',
                });
                return;
            }

            if(!game.playerIds.includes(sessionId)){
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'You are not in the game',
                });
                return;
            }

            for(const playerText of game.playerTexts) {
                if (playerText.playerId === sessionId && playerText.completed) {
                    return;
                }
            }

            
            const playerTypingStatus=gameStore.updatePlayerProgress(room.roomCode, sessionId, currentText);
            
            let gameCompleted=true;

            for(const playerText of game.playerTexts) {
                if(!playerText.completed) {
                    gameCompleted=false;
                    break;
                }
            }

            if(gameCompleted) {
                const updatedRoom = roomStore.getRoomByCode(room.roomCode);
                
                socket.emit(this.CUSTOM_EVENTS.GAME_ENDED, {
                    message: 'Game ended successfully',
                    room: {
                        ...updatedRoom,
                        playerIds: updatedRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    },
                    game: {
                        ...game,
                        playerIds: game?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                        playerTexts: game?.playerTexts.map(playerText => ({
                            ...playerText,
                            playerName: sessionStore.get(playerText.playerId)?.username,
                        }))
                    }
                });

                socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.GAME_ENDED, {
                    message: 'Game ended successfully',
                    room: {
                        ...updatedRoom,
                        playerIds: updatedRoom?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                    },
                    game: {
                        ...game,
                        playerIds: game?.playerIds.map(playerId => ({
                            sessionId: playerId,
                            username: sessionStore.get(playerId)?.username,
                        })),
                        playerTexts: game?.playerTexts.map(playerText => ({
                            ...playerText,
                            playerName: sessionStore.get(playerText.playerId)?.username,
                        }))
                    }
                });

                roomStore.gameEnd(room.roomCode);
                gameTimeoutManagement.removeTimeout(game.gameId);
                return;
            }
            
            if(!playerTypingStatus) {
                socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_FAILURE, {
                    message: 'Failed to update player progress',
                });
                return;
            }

            socket.emit(this.CUSTOM_EVENTS.PLAYER_TYPING_SUCCESS, {
                message: 'Player progress updated successfully',
                game: {
                    ...game,
                    playerIds: game?.playerIds.map(playerId => ({
                        sessionId: playerId,
                        username: sessionStore.get(playerId)?.username,
                    })),
                    playerTexts: game?.playerTexts.map(playerText => ({
                        ...playerText,
                        playerName: sessionStore.get(playerText.playerId)?.username,
                    }))
                }
            });

            socket.to(room.roomCode).emit(this.CUSTOM_EVENTS.PLAYER_TYPING_SUCCESS, {
                message: 'Player progress updated successfully',
                game: {
                    ...game,
                    playerIds: game?.playerIds.map(playerId => ({
                        sessionId: playerId,
                        username: sessionStore.get(playerId)?.username,
                    })),
                    playerTexts: game?.playerTexts.map(playerText => ({
                        ...playerText,
                        playerName: sessionStore.get(playerText.playerId)?.username,
                    }))
                }
            });
        });
    }
}