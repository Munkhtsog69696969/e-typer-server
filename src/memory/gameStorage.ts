import { sessionStore } from "./sessionStorage";
import { roomStore } from "./roomStorage";

interface PlayerText {
    playerId: string;
    text: string;
    startTime: Date | null;
    endTime?: Date | null;
    wpm: number;
    progress: number;
    completed: boolean;
}

interface Game {
    text: string;
    gameId: string;
    playerIds: string[];
    roomCode: string;
    playerTexts: PlayerText[];
    startTime: Date;
    isFinished: boolean;
}

const games = new Map<string, Game>();

export const gameStore = {
    createGame(text: string, gameId: string, playerIds: string[], roomCode: string): boolean {
        if (games.has(gameId)) {
            return false;
        }

        const game: Game = {
            text,
            gameId,
            playerIds,
            roomCode,
            isFinished: false,
            startTime: new Date(),
            playerTexts: playerIds.map(playerId => ({
                playerId,
                text: '',
                startTime: null,
                wpm: 0,
                progress: 0,
                completed: false,
            }))
        };

        games.set(roomCode, game);
        return true;
    },

    updatePlayerProgress(roomCode: string, playerId: string, currentText: string): boolean {
        const game = games.get(roomCode);

        const playerText = game?.playerTexts.find(p => p.playerId === playerId);

        if(playerText?.completed) {
            return true;
        }

        if(!game || !playerText) {
            return false;
        }

        if(playerText.startTime === null) {
            playerText.startTime = new Date();
        }

        playerText.text = currentText;

        if(playerText.text === game.text) {
            playerText.completed = true;
            playerText.endTime = new Date();
            return true;
        }

        const progress = (currentText.length / game.text.length) * 100;
        const words= currentText.split(' ').length;
        const wpm = Math.round((words / ((new Date().getTime() - playerText.startTime.getTime()) / 1000 / 60)));
        playerText.wpm = wpm;
        playerText.progress = progress;

        return true;
    },

    getGameByRoomCode(roomCode: string): Game | undefined {
        return games.get(roomCode);
    },

    getGameById(gameId: string): Game | undefined {
        for (const game of games.values()) {
            if (game.gameId === gameId) {
                return game;
            }
        }
        return undefined;
    },

    deleteGame(roomCode: string): void {
        games.delete(roomCode);
    }
}