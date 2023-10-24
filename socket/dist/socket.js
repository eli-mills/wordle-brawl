import { Server } from "socket.io";
import { createServer } from "http";
import * as db from "./db.js";
import { GameEvents } from "../../common/dist/index.js";
import { evaluateGuess } from "./evaluation.js";
/************************************************
 *                                              *
 *                CONFIGURATION                 *
 *                                              *
 ************************************************/
// Instantiate socket server
export const httpServer = createServer();
export const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});
// Configure socket event listeners
io.on('connection', async (newSocket) => {
    console.log(`User ${newSocket.id} connected.`);
    newSocket.on(GameEvents.REQUEST_NEW_ROOM, () => onCreateRoomRequest(newSocket));
    newSocket.on(GameEvents.REQUEST_JOIN_ROOM, (data) => onJoinRoomRequest(newSocket, data.room));
    newSocket.on(GameEvents.DECLARE_NAME, (name) => onDeclareName(newSocket, name));
    newSocket.on(GameEvents.GUESS, (guessReq) => onGuess(newSocket, guessReq));
    newSocket.on('disconnecting', () => onDisconnect(newSocket));
});
/************************************************
 *                                              *
 *                EVENT LISTENERS               *
 *                                              *
 ************************************************/
function onDisconnect(socket) {
    // Delete player from db
    console.log(`Player ${socket.id} disconnected`);
    db.deletePlayer(socket.id);
    // Return room to available rooms list
    for (let roomId of socket.rooms) {
        if (roomId === socket.id)
            continue;
        // TODO: add code to update other players on leaving
        if (getConnectionsFromRoomId(roomId).size === 1) {
            console.log(`Returning ${roomId} to available rooms list`);
            db.addRoomId(roomId);
        }
    }
}
async function onJoinRoomRequest(socket, roomId) {
    console.log(`Player ${socket.id} request to join room ${roomId}`);
    if (!roomDoesExist(roomId)) {
        console.log(`Room ${roomId} does not exist`);
        socket.emit(GameEvents.ROOM_DNE);
        return;
    }
    socket.join(roomId);
    console.log(`Player ${socket.id} successfully joined room ${roomId}`);
    await db.createPlayer(socket.id, roomId);
    await emitUpdatedGameState(roomId);
}
async function onCreateRoomRequest(socket) {
    console.log("Create room request received");
    // Retrieve room number
    const roomId = await db.getRandomRoomId();
    const roomIdPadded = roomId?.padStart(4, "0");
    if (roomIdPadded === undefined)
        return socket.emit(GameEvents.NO_ROOMS_AVAILABLE);
    console.log(`Retrieved room number: ${roomIdPadded}`);
    // Create room and add player to db
    socket.join(roomIdPadded);
    console.log(`Player ${socket.id} joined room ${roomIdPadded}`);
    db.createPlayer(socket.id, roomIdPadded);
    const gameStateData = {
        roomId: roomIdPadded,
        playerList: []
    };
    socket.emit(GameEvents.NEW_ROOM_CREATED, gameStateData);
}
async function onDeclareName(socket, name) {
    console.log(`Name received: ${name}. Writing to db.`);
    const player = await db.getPlayer(socket.id);
    player.name = name;
    await db.updatePlayer(player);
    await emitUpdatedGameState(player.roomId);
}
async function onGuess(socket, guessReq) {
    console.log(`Guess received: ${guessReq.guess}`);
    // Get socket's name
    const playerName = await db.retrievePlayerName(socket.id);
    console.log(`Guesser name retrieved: ${playerName}`);
    // Evaluate result
    const result = await evaluateGuess(guessReq.guess);
    const oppResult = { playerName, ...result };
    // Send results
    console.log("Sending results");
    socket.emit(GameEvents.EVALUATION, result);
    socket.broadcast.emit(GameEvents.OPP_EVALUATION, oppResult);
}
/************************************************
 *                                              *
 *                    HELPERS                   *
 *                                              *
 ************************************************/
async function emitUpdatedGameState(roomId) {
    const playerList = await retrieveNamesFromRoom(roomId);
    const gameStateData = { roomId, playerList };
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
}
async function retrieveNamesFromRoom(roomId) {
    const playerIds = io.sockets.adapter.rooms.get(roomId);
    console.log(`Got the following player Ids for room ${roomId}: ${Array.from(playerIds?.values() ?? [])}`);
    const playerList = [];
    if (!playerIds)
        return [];
    for (const playerId of playerIds) {
        const player = await db.getPlayer(playerId);
        playerList.push(player.name ?? "");
    }
    console.log(`Returning playerList: ${playerList}`);
    return playerList;
}
function getConnectionsFromRoomId(roomId) {
    return io.of("/").adapter.rooms.get(roomId) ?? new Set();
}
function roomDoesExist(roomId) {
    return io.sockets.adapter.rooms.has(roomId);
}
