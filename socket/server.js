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
const redis_1 = require("redis");
const evaluation_1 = require("./evaluation");
// Configure redis client
const redisClient = (0, redis_1.createClient)({
    url: "redis://127.0.0.1:6379"
});
redisClient.on("error", err => console.error("Redis client error", err));
redisClient.connect();
// Configure socketio server
const server = (0, http_1.createServer)();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
// Add event listeners to socket
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', onDisconnect);
    socket.on("declare-name", (name) => onDeclareName(socket, name));
    socket.on("guess", (guessReq) => onGuess(socket, guessReq));
});
// Define event listeners
function onDisconnect() { console.log("user disconnected"); }
function onDeclareName(socket, name) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!redisClient.isReady)
            yield redisClient.connect();
        console.log(`Name received: ${name}. Writing to db.`);
        redisClient.set(socket.id, name);
        socket.broadcast.emit("add-name", name);
    });
}
function onGuess(socket, guessReq) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Guess received: ${guessReq.guess}`);
        // Get socket's name
        if (!redisClient.isReady)
            yield redisClient.connect();
        const guesserName = yield redisClient.get(socket.id);
        console.log(`Guesser name retrieved: ${guesserName}`);
        // Evaluate result
        const result = yield (0, evaluation_1.evaluateGuess)(guessReq.guess);
        // Send results
        console.log("Sending results");
        socket.emit("evaluation", result);
        socket.broadcast.emit("other-eval", Object.assign({ guesserName }, result));
    });
}
server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});
