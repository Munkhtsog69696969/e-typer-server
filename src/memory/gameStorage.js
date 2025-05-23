"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameStore = void 0;
const games = new Map();
exports.gameStore = {
    createGame(text, gameId, playerIds, roomCode) {
        if (games.has(gameId)) {
            return false;
        }
        const game = {
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
    updatePlayerProgress(roomCode, playerId, currentText) {
        const game = games.get(roomCode);
        const playerText = game === null || game === void 0 ? void 0 : game.playerTexts.find(p => p.playerId === playerId);
        if (playerText === null || playerText === void 0 ? void 0 : playerText.completed) {
            return true;
        }
        if (!game || !playerText) {
            return false;
        }
        if (playerText.startTime === null) {
            playerText.startTime = new Date();
        }
        playerText.text = currentText;
        if (playerText.text === game.text) {
            playerText.completed = true;
            playerText.endTime = new Date();
            return true;
        }
        const progress = (currentText.length / game.text.length) * 100;
        const words = currentText.split(' ').length;
        const wpm = Math.round((words / ((new Date().getTime() - playerText.startTime.getTime()) / 1000 / 60)));
        playerText.wpm = wpm;
        playerText.progress = progress;
        return true;
    },
    getGameByRoomCode(roomCode) {
        return games.get(roomCode);
    },
    getGameById(gameId) {
        for (const game of games.values()) {
            if (game.gameId === gameId) {
                return game;
            }
        }
        return undefined;
    },
    deleteGame(roomCode) {
        games.delete(roomCode);
    }
};
