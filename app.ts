import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import SocketConfig from './src/socket/socketConfig';
import authRoute from './src/auth/authRoute';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// socket io
new SocketConfig(httpServer);

async function startServer() {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api', authRoute);

    httpServer.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
        console.log(`🔌 Socket.IO server initialized`);
    });
}

app.get('/', (req, res) => {
    res.send('E-Typer Server Running');
});

startServer().catch((error) => {
    console.error('Failed to start server:', error);
});

export default app;