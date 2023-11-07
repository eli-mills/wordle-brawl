import { Socket, Server } from "socket.io"
import { createServer } from "http";
import * as db from "./db.js"
import {
    GameEvents,
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../common/dist/index.js"
import { evaluateGuess } from "./evaluation.js"


/************************************************
 *                                              *
 *                CONFIGURATION                 *
 *                                              *
 ************************************************/

// Instantiate socket server
export const httpServer = createServer();
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});

// Configure socket event listeners
io.on('connection', async (newSocket) => {
    console.log(`User ${newSocket.id} connected.`);
    await db.createPlayer(newSocket.id);
    newSocket.on(GameEvents.REQUEST_NEW_GAME, () => onCreateGameRequest(newSocket));
    newSocket.on(GameEvents.REQUEST_JOIN_GAME, (roomId: string) => onJoinGameRequest(newSocket, roomId));
    newSocket.on(GameEvents.DECLARE_NAME, (name : string) => onDeclareName(newSocket, name));
    newSocket.on(GameEvents.GUESS, (guess: string) => onGuess(newSocket, guess));
    newSocket.on('disconnect', () => onDisconnect(newSocket));
    
});


/************************************************
 *                                              *
 *                EVENT LISTENERS               *
 *                                              *
 ************************************************/

async function onDisconnect(socket: Socket) : Promise<void> {
    // Get player room
    const roomId = await db.getPlayerRoomId(socket.id);
    
    // Delete player from db
    console.log(`Player ${socket.id} disconnected`);
    await db.deletePlayer(socket.id);
    
    emitUpdatedGameState(roomId);
}

async function onCreateGameRequest (socket: Socket) : Promise<void> {
    console.log("Create game request received");

    const newRoomId = await db.createGame(socket.id);
    if (newRoomId === null) {
        socket.emit(GameEvents.NO_ROOMS_AVAILABLE);
        return;
    }
    
    await db.setPlayerIsLeader(socket.id);
    await emitUpdatedPlayer(socket);
    socket.emit(GameEvents.NEW_GAME_CREATED, newRoomId);
}

async function onJoinGameRequest (socket: Socket, roomId: string) : Promise<void> {
    console.log(`Player ${socket.id} request to join room ${roomId}`);
    if (! await db.gameExists(roomId)) {
        console.log(`Game ${roomId} does not exist`);
        socket.emit(GameEvents.GAME_DNE);
        return;
    }

    socket.join(roomId);
    console.log(`Player ${socket.id} successfully joined room ${roomId}`);
    await db.updatePlayerRoom(socket.id, roomId);
    await emitUpdatedGameState(roomId);
}

async function onDeclareName (socket : Socket, name : string) {
    // TODO: add check for name uniqueness in room

    console.log(`Name received: ${name}. Writing to db.`);

    await db.updatePlayerName(socket.id, name);
    const roomId = await db.getPlayerRoomId(socket.id);
    
    await emitUpdatedPlayer(socket);
    await emitUpdatedGameState(roomId);
}

async function onGuess ( socket: Socket, guess: string) {
    console.log(`Guess received: ${guess}`);

    // Evaluate result
    const result = await evaluateGuess(guess);
    const guessResult = result.resultByPosition;

    // Store results
    guessResult && await db.createGuessResult(socket.id, guessResult);
    
    // Send results
    console.log("Sending results");
    socket.emit(GameEvents.EVALUATION, result);
    await emitUpdatedGameState(await db.getPlayerRoomId(socket.id));
}


/************************************************
 *                                              *
 *                    HELPERS                   *
 *                                              *
 ************************************************/

async function emitUpdatedGameState(roomId: string) : Promise<void> {
    const gameStateData = await db.getGame(roomId);
    if (gameStateData !== null) {
        io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
    }
}

async function emitUpdatedPlayer(socket: Socket) : Promise<void> {
    const player = await db.getPlayer(socket.id);
    console.log(`Retrieved player for update: ${JSON.stringify(player)}`);
    player && socket.emit(GameEvents.UPDATE_PLAYER, player);
}
