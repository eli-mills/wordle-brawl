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
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const evaluation_1 = require("./evaluation");
const server = (0, http_1.createServer)();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
let socketConn;
io.on('connection', (socket) => {
    socketConn = socket;
    console.log('a user connected');
    socket.on('disconnect', () => console.log('user disconnected'));
    socket.on("guess", handleGuessRequest);
});
const handleGuessRequest = (guessReq) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, evaluation_1.evaluateGuess)(guessReq.guess);
    io.emit("evaluation", result);
});
server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});
