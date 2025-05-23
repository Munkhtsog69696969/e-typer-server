export interface Session {
  sessionId: string;
  username: string;
  socketId?: string | null;
}

const sessions = new Map<string, Session>();

export const sessionStore = {
  save(session: Session) : void {
    sessions.set(session.sessionId, session);
  },
  get(sessionId: string) : Session | undefined {
    return sessions.get(sessionId);
  },
  remove(sessionId: string) : void {
    sessions.delete(sessionId);
  },
  getAll() : Session[] {
    return Array.from(sessions.values());
  },
  updateSocketId(sessionId: string, socketId: string) : void {
    const session = sessions.get(sessionId);
    if (session) {
      session.socketId = socketId;
    }
  }
};
