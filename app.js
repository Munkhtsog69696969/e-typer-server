"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socketConfig_1 = __importDefault(require("./src/socket/socketConfig"));
const authRoute_1 = __importDefault(require("./src/auth/authRoute"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const port = process.env.PORT || 3001;
// socket io
new socketConfig_1.default(httpServer);
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        app.use(express_1.default.json());
        app.use(express_1.default.urlencoded({ extended: true }));
        app.use('/api', authRoute_1.default);
        httpServer.listen(port, () => {
            console.log(`🚀 Server running at http://localhost:${port}`);
            console.log(`🔌 Socket.IO server initialized`);
        });
    });
}
app.get('/', (req, res) => {
    res.send('E-Typer Server Running');
});
startServer().catch((error) => {
    console.error('Failed to start server:', error);
});
exports.default = app;
