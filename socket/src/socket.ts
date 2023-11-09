import { Socket, Server } from "socket.io"
import { createServer } from "http";
import * as db from "./db.js"
import {
    GameEvents,
    ClientToServerEvents,
    ServerToClientEvents,
} from "../../common/dist/index.js"
import { evaluateGuess, FileWordValidator, ALLOWED_ANSWERS_PATH } from "./evaluation.js"


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
    newSocket.on(GameEvents.REQUEST_BEGIN_GAME, () => onBeginGameRequest(newSocket));
    newSocket.on(GameEvents.CHECK_CHOSEN_WORD_VALID, onCheckChosenWordValid);
    newSocket.on(GameEvents.CHOOSE_WORD, (word: string) => onChooseWord(newSocket, word));
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
    const roomId = await db.getPlayerRoomId(socket.id);
    const result = await evaluateGuess(guess, roomId);
    const guessResult = result.resultByPosition;

    // Store results
    guessResult && await db.createGuessResult(socket.id, guessResult);
    
    // Send results
    console.log("Sending results");
    socket.emit(GameEvents.EVALUATION, result);
    await emitUpdatedGameState(await db.getPlayerRoomId(socket.id));
}

async function onBeginGameRequest(socket: Socket<ClientToServerEvents, ServerToClientEvents>): Promise<void> {

    const roomId = await db.getPlayerRoomId(socket.id);
    if (socket.id !== await db.getGameLeader(roomId)) return;   // Requestor is not the game leader

    await db.setGameStatusChoosing(roomId);
    await emitUpdatedGameState(roomId);

    io.to(roomId).emit(GameEvents.BEGIN_GAME);
}

async function onCheckChosenWordValid(word: string, callback: (isValid: boolean) => void) : Promise<void> {
    const wordIsValid = await validateAnswerWord(word);
    callback(wordIsValid);
}

async function onChooseWord(socket: Socket, word: string) : Promise<void> {
    const wordIsValid = await validateAnswerWord(word);
    if (!wordIsValid) {
        console.error(`Socket server error: player ${socket} submitted invalid answer word ${word}`);
        return;
    }
    const roomId = await db.getPlayerRoomId(socket.id);
    await db.setGameStatusPlaying(roomId, word);
    await emitUpdatedGameState(roomId);
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

async function validateAnswerWord(word: string) : Promise<boolean> {
    const validator = new FileWordValidator(ALLOWED_ANSWERS_PATH);
    return await validator.validateWord(word);
}
