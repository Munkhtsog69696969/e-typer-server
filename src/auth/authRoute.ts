import express, { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionStore, Session } from '../memory/sessionStorage';

const router = express.Router();

router.post('/register', async (req: Request, res: Response): Promise<any> => {
  try{
    const { username } = req.body;

    if (!username || username.length < 3 || username.length > 20) {
      return res.json({
        success: false,
        message: 'Username must be between 3 and 20 characters',
      });
    }

    const sessionId = uuidv4();
    const session: Session = {
        sessionId,
        username,
        socketId: null,
    };

    sessionStore.save(session);

    // console.log(sessionStore.getAll())

    return res.status(200).json({
        success: true,
        message: 'Registration successful',
        sessionId,
    });
  }catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;