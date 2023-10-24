import { Server } from "socket.io";
import { createServer } from "http";
import * as db from "./db.js";
import { GameEvents } from "../../common/dist/index.js";
import { evaluateGuess } from "./evaluation.js";
// Instantiate socket server
export const httpServer = createServer();
export const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});
function getConnectionsFromRoomId(roomId) {
    return io.of("/").adapter.rooms.get(roomId) ?? new Set();
}
function roomDoesExist(roomId) {
    return io.sockets.adapter.rooms.has(roomId);
}
export function onDisconnect(socket) {
    // Delete player from db
    console.log(`Player ${socket.id} disconnected`);
    db.deletePlayer(socket.id);
    // Return room to available rooms list
    for (let roomId of socket.rooms) {
        if (roomId === socket.id)
            continue;
        if (getConnectionsFromRoomId(roomId).size === 1) {
            console.log(`Returning ${roomId} to available rooms list`);
            db.addRoomId(roomId);
        }
    }
}
export async function onJoinRoomRequest(socket, roomId) {
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
export async function onCreateRoomRequest(socket) {
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
export async function onDeclareName(socket, name) {
    console.log(`Name received: ${name}. Writing to db.`);
    const player = await db.getPlayer(socket.id);
    player.name = name;
    await db.updatePlayer(player);
    await emitUpdatedGameState(player.roomId);
}
export async function onGuess(socket, guessReq) {
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
