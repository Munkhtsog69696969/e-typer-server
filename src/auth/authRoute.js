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
const uuid_1 = require("uuid");
const sessionStorage_1 = require("../memory/sessionStorage");
const router = express_1.default.Router();
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.body;
        if (!username || username.length < 3 || username.length > 20) {
            return res.json({
                success: false,
                message: 'Username must be between 3 and 20 characters',
            });
        }
        const sessionId = (0, uuid_1.v4)();
        const session = {
            sessionId,
            username,
            socketId: null,
        };
        sessionStorage_1.sessionStore.save(session);
        // console.log(sessionStore.getAll())
        return res.status(200).json({
            success: true,
            message: 'Registration successful',
            sessionId,
        });
    }
    catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}));
exports.default = router;
