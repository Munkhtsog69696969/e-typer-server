"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStore = void 0;
const sessions = new Map();
exports.sessionStore = {
    save(session) {
        sessions.set(session.sessionId, session);
    },
    get(sessionId) {
        return sessions.get(sessionId);
    },
    remove(sessionId) {
        sessions.delete(sessionId);
    },
    getAll() {
        return Array.from(sessions.values());
    },
    updateSocketId(sessionId, socketId) {
        const session = sessions.get(sessionId);
        if (session) {
            session.socketId = socketId;
        }
    }
};
