"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const GameEvents = __importStar(require("../common/game-events"));
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
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('a user connected');
    socket.on('disconnect', onDisconnect);
    socket.on(GameEvents.DECLARE_NAME, (name) => onDeclareName(socket, name));
    socket.on(GameEvents.GUESS, (guessReq) => onGuess(socket, guessReq));
    // Broadcast current names
    yield emitUpdatedNameList("room1"); // "room1" temporary until rooms are implemented
}));
// Define event listeners
function onDisconnect() { console.log("user disconnected"); }
function onDeclareName(socket, name) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!redisClient.isReady)
            yield redisClient.connect();
        console.log(`Name received: ${name}. Writing to db.`);
        yield storePlayerName(socket.id, name);
        yield addNameToRoom("room1", name);
        yield emitUpdatedNameList("room1"); // "room1" temporary until rooms are implemented
    });
}
function onGuess(socket, guessReq) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Guess received: ${guessReq.guess}`);
        // Get socket's name
        if (!redisClient.isReady)
            yield redisClient.connect();
        const playerName = yield retrievePlayerName(socket.id);
        console.log(`Guesser name retrieved: ${playerName}`);
        // Evaluate result
        const result = yield (0, evaluation_1.evaluateGuess)(guessReq.guess);
        const oppResult = Object.assign({ playerName }, result);
        // Send results
        console.log("Sending results");
        socket.emit(GameEvents.EVALUATION, result);
        socket.broadcast.emit(GameEvents.OPP_EVALUATION, oppResult);
    });
}
function emitUpdatedNameList(room) {
    return __awaiter(this, void 0, void 0, function* () {
        const playerNames = yield retrieveNamesFromRoom(room);
        console.log(`Retrieved player names: ${playerNames}`);
        io.emit(GameEvents.UPDATE_NAME_LIST, playerNames);
    });
}
function storePlayerName(socketId, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const playerHashName = generatePlayerHashName(socketId);
        const playerData = { name };
        yield redisClient.hSet(playerHashName, playerData);
    });
}
function retrievePlayerName(socketId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield redisClient.hGet(generatePlayerHashName(socketId), "name");
    });
}
function addNameToRoom(room, name) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redisClient.SADD(generateRoomKeyName(room), name);
    });
}
function retrieveNamesFromRoom(room) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield redisClient.SMEMBERS(generateRoomKeyName(room));
    });
}
function generatePlayerHashName(socketId) {
    return `player:${socketId}`;
}
function generateRoomKeyName(room) {
    return `room:${room}`;
}
server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});
