var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createServer } from "http";
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { GameEvents } from "../../common/dist/index.js";
import { evaluateGuess } from "./evaluation.js";
const availableRoomIds = "availableRoomIds";
// Configure redis client
const redisClient = createClient({
    url: "redis://127.0.0.1:6379"
});
redisClient.on("error", err => console.error("Redis client error", err));
// Instantiate socket server
const server = createServer();
const io = new Server(server, {
    cors: {
        origin: "http://eli.local:3000",
        methods: ["GET", "POST"]
    }
});
// Configure socket event listeners
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('a user connected');
    // Add event listeners to socket
    socket.on(GameEvents.REQUEST_NEW_ROOM, () => onCreateRoomRequest(socket));
    socket.on(GameEvents.REQUEST_JOIN_ROOM, (data) => onJoinRoomRequest(socket, data.room));
    socket.on(GameEvents.DECLARE_NAME, (name) => onDeclareName(socket, name));
    socket.on(GameEvents.GUESS, (guessReq) => onGuess(socket, guessReq));
    socket.on('disconnecting', () => onDisconnect(socket));
}));
// Define event listeners
function onDisconnect(socket) {
    // Delete player from db
    console.log(`Player ${socket.id} disconnected`);
    deletePlayer(socket.id);
    // Return room to available rooms list
    for (let room of socket.rooms) {
        const remainingConnections = io.of("/").adapter.rooms.get(room);
        if (room !== socket.id && (remainingConnections === null || remainingConnections === void 0 ? void 0 : remainingConnections.size) === 1) {
            console.log(`Returning ${room} to available rooms list`);
            redisClient.sAdd(availableRoomIds, room);
        }
    }
}
function onJoinRoomRequest(socket, roomId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Player ${socket.id} request to join room ${roomId}`);
        if (!io.sockets.adapter.rooms.has(roomId)) {
            console.log(`Room ${roomId} does not exist`);
            socket.emit(GameEvents.ROOM_DNE);
            return;
        }
        socket.join(roomId);
        console.log(`Player ${socket.id} successfully joined room ${roomId}`);
        yield createPlayer(socket.id, roomId);
        yield emitUpdatedGameState(roomId);
    });
}
function onCreateRoomRequest(socket) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Create room request received");
        // Retrieve room number
        const roomId = (yield redisClient.sPop(availableRoomIds));
        const roomIdPadded = roomId === null || roomId === void 0 ? void 0 : roomId.padStart(4, "0");
        if (roomIdPadded === undefined)
            return socket.emit(GameEvents.NO_ROOMS_AVAILABLE);
        console.log(`Retrieved room number: ${roomIdPadded}`);
        // Create room and add player to db
        socket.join(roomIdPadded);
        console.log(`Player ${socket.id} joined room ${roomIdPadded}`);
        createPlayer(socket.id, roomIdPadded);
        const gameStateData = {
            roomId: roomIdPadded,
            playerList: []
        };
        socket.emit(GameEvents.NEW_ROOM_CREATED, gameStateData);
    });
}
function onDeclareName(socket, name) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Name received: ${name}. Writing to db.`);
        const player = yield getPlayer(socket.id);
        player.name = name;
        yield updatePlayer(player);
        yield emitUpdatedGameState(player.roomId);
    });
}
function onGuess(socket, guessReq) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Guess received: ${guessReq.guess}`);
        // Get socket's name
        const playerName = yield retrievePlayerName(socket.id);
        console.log(`Guesser name retrieved: ${playerName}`);
        // Evaluate result
        const result = yield evaluateGuess(guessReq.guess);
        const oppResult = Object.assign({ playerName }, result);
        // Send results
        console.log("Sending results");
        socket.emit(GameEvents.EVALUATION, result);
        socket.broadcast.emit(GameEvents.OPP_EVALUATION, oppResult);
    });
}
function emitUpdatedGameState(roomId) {
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
function getPlayer(socketId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield redisClient.hGetAll(getPlayerKeyName(socketId));
    });
}
function updatePlayer(player) {
    return __awaiter(this, void 0, void 0, function* () {
        const playerHashName = getPlayerKeyName(player.socketId);
        yield redisClient.hSet(playerHashName, player);
    });
}
function deletePlayer(socketId) {
    return __awaiter(this, void 0, void 0, function* () {
        const playerHashName = getPlayerKeyName(socketId);
        yield redisClient.del(playerHashName);
    });
}
function retrievePlayerName(socketId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        return (_a = yield redisClient.hGet(getPlayerKeyName(socketId), "name")) !== null && _a !== void 0 ? _a : "";
    });
}
function retrieveNamesFromRoom(roomId) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const playerIds = io.sockets.adapter.rooms.get(roomId);
        console.log(`Got the following player Ids for room ${roomId}: ${Array.from((_a = playerIds === null || playerIds === void 0 ? void 0 : playerIds.values()) !== null && _a !== void 0 ? _a : [])}`);
        const playerList = [];
        if (!playerIds)
            return [];
        for (const playerId of playerIds) {
            const player = yield getPlayer(playerId);
            playerList.push((_b = player.name) !== null && _b !== void 0 ? _b : "");
        }
        console.log(`Returning playerList: ${playerList}`);
        return playerList;
    });
}
function getPlayerKeyName(socketId) {
    return `player:${socketId}`;
}
function populateAvailableRoomIds() {
    return __awaiter(this, void 0, void 0, function* () {
        if ((yield redisClient.exists(availableRoomIds)) && (yield redisClient.sCard(availableRoomIds)) === 10000) {
            console.log("Not populating rooms");
            return;
        }
        console.log("Populating rooms");
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
