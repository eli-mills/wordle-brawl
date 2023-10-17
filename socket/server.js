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
const availableRoomIds = "availableRoomIds";
// Configure redis client
const redisClient = (0, redis_1.createClient)({
    url: "redis://127.0.0.1:6379"
});
redisClient.on("error", err => console.error("Redis client error", err));
// Instantiate socket server
const server = (0, http_1.createServer)();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
// Configure socket event listeners
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('a user connected');
    // Add event listeners to socket
    socket.on('disconnect', onDisconnect);
    socket.on(GameEvents.DECLARE_NAME, (name) => {
        onDeclareName(socket, name);
        emitUpdatedNameList("room1");
    });
    socket.on(GameEvents.GUESS, (guessReq) => onGuess(socket, guessReq));
    socket.on(GameEvents.REQUEST_JOIN_ROOM, (data) => __awaiter(void 0, void 0, void 0, function* () {
        yield onJoinRoomRequest(socket, data.room);
    }));
    socket.on(GameEvents.REQUEST_NEW_ROOM, () => __awaiter(void 0, void 0, void 0, function* () { return yield onCreateRoomRequest(socket); }));
}));
// Define event listeners
function onDisconnect() { console.log("user disconnected"); }
function onJoinRoomRequest(socket, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!io.sockets.adapter.rooms.has(roomId)) {
            console.log(io.sockets.adapter.rooms);
            console.log("Room does not exist");
            socket.emit(GameEvents.ROOM_DNE);
            return;
        }
        socket.join(roomId);
        yield createPlayer(socket.id, roomId);
        yield emitUpdatedNameList(roomId);
    });
}
function onCreateRoomRequest(socket) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("create room request received");
        let [roomId] = (yield redisClient.sPop(availableRoomIds));
        roomId = roomId.padStart(4, "0");
        console.log(`retrieved room number: ${roomId}`);
        if (roomId === undefined)
            return socket.emit(GameEvents.NO_ROOMS_AVAILABLE);
        socket.join(roomId);
        yield createPlayer(socket.id, roomId);
        const gameStateData = {
            roomId,
            playerList: []
        };
        socket.emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
    });
}
function onDeclareName(socket, name) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Name received: ${name}. Writing to db.`);
        yield updatePlayerName(socket.id, name);
        yield addNameToRoom("room1", name);
        yield emitUpdatedNameList("room1"); // "room1" temporary until rooms are implemented
    });
}
function onGuess(socket, guessReq) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Guess received: ${guessReq.guess}`);
        // Get socket's name
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
function emitUpdatedNameList(roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const playerList = yield retrieveNamesFromRoom(roomId);
        const gameStateData = { roomId, playerList };
        io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
    });
}
function createPlayer(socketId, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        const newPlayer = { socketId, roomId };
        yield redisClient.hSet(getPlayerKeyName(socketId), newPlayer);
    });
}
function updatePlayerName(socketId, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const playerHashName = getPlayerKeyName(socketId);
        yield redisClient.hSet(playerHashName, { name });
    });
}
function retrievePlayerName(socketId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield redisClient.hGet(getPlayerKeyName(socketId), "name");
    });
}
function addNameToRoom(room, name) {
    return __awaiter(this, void 0, void 0, function* () {
        yield redisClient.SADD(getRoomKeyName(room), name);
    });
}
function retrieveNamesFromRoom(room) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield redisClient.SMEMBERS(getRoomKeyName(room));
    });
}
function getPlayerKeyName(socketId) {
    return `player:${socketId}`;
}
function getRoomKeyName(roomId) {
    return `room:${roomId}`;
}
function populateAvailableRoomIds() {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield redisClient.exists(availableRoomIds))
            return;
        for (let i = 0; i < 10000; i++) {
            const roomId = i.toString().padStart(4, "0");
            yield redisClient.sAdd(availableRoomIds, roomId);
        }
    });
}
// Connect to database and start server
redisClient.connect()
    .then(populateAvailableRoomIds)
    .then(() => {
    server.listen(3001, () => {
        console.log('server running at http://localhost:3001');
    });
});
