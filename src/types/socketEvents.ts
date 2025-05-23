export interface SocketDefaultEvents {
    CONNECTION: string;
    DISCONNECT: string;
    PLAYER_JOINED: string;
    PLAYER_LEFT: string;
    PLAYER_KICKED: string;
    ROOM_FOUND: string;
    GAME_FOUND: string;
}

export interface SocketCustomEvents {
    CREATE_ROOM: string;
    CREATE_ROOM_SUCCESS: string;
    CREATE_ROOM_FAILURE: string;
    JOIN_ROOM: string;
    JOIN_ROOM_SUCCESS: string;
    JOIN_ROOM_FAILURE: string;
    PLAYER_JOINED: string;
    PLAYER_LEFT: string;
    PLAYER_KICKED: string;
    LEAVE_ROOM: string;
    LEAVE_ROOM_SUCCESS: string;
    LEAVE_ROOM_FAILURE: string;
    SEND_MESSAGE: string;
    SEND_MESSAGE_SUCCESS: string;
    SEND_MESSAGE_FAILURE: string;
    RECIEVE_MESSAGE: string;
    KICK_PLAYER: string;
    KICK_PLAYER_SUCCESS: string;
    KICK_PLAYER_FAILURE: string;
    START_GAME: string;
    START_GAME_SUCCESS: string;
    START_GAME_FAILURE: string;
    PLAYER_TYPING: string;
    PLAYER_TYPING_SUCCESS: string;
    PLAYER_TYPING_FAILURE: string;
    GAME_ENDED: string;
    GAME_TIMEOUT: string;
}