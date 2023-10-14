import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { EvaluationRequestData, EvaluationResponseData,  OpponentEvaluationResponseData} from "../common/evaluation-types" 
import * as GameEvents from "../common/game-events";
import { evaluateGuess } from "./evaluation";
import { Player } from './model';

// Configure redis client
const redisClient = createClient({
    url: "redis://127.0.0.1:6379" 
});
redisClient.on("error", err => console.error("Redis client error", err));
redisClient.connect();

// Configure socketio server
const server = createServer();
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Add event listeners to socket
io.on('connection', async (socket) => {
    console.log('a user connected');
    socket.on('disconnect', onDisconnect);

    socket.on(GameEvents.DECLARE_NAME, (name : string) => onDeclareName(socket, name));

    socket.on(GameEvents.GUESS, (guessReq : EvaluationRequestData) => onGuess(socket, guessReq));

    // Broadcast current names
    await emitUpdatedNameList("room1");  // "room1" temporary until rooms are implemented
    
});


// Define event listeners
function onDisconnect () { console.log("user disconnected"); }

async function onDeclareName (socket : Socket, name : string) {
    if (! redisClient.isReady) await redisClient.connect();
    console.log(`Name received: ${name}. Writing to db.`);

    await storePlayerName(socket.id, name);
    await addNameToRoom("room1", name);
    await emitUpdatedNameList("room1");     // "room1" temporary until rooms are implemented
}

async function onGuess ( socket : Socket, guessReq : EvaluationRequestData) {
    console.log(`Guess received: ${guessReq.guess}`);

    // Get socket's name
    if (! redisClient.isReady) await redisClient.connect();
    const playerName : string | undefined = await retrievePlayerName(socket.id);
    console.log(`Guesser name retrieved: ${playerName}`);

    // Evaluate result
    const result : EvaluationResponseData = await evaluateGuess(guessReq.guess);
    const oppResult : OpponentEvaluationResponseData = {playerName, ...result};

    // Send results
    console.log("Sending results");
    socket.emit(GameEvents.EVALUATION, result);
    socket.broadcast.emit(GameEvents.OPP_EVALUATION, oppResult);
}

async function emitUpdatedNameList(room: string) : Promise<void> {
    const playerNames : string[] = await retrieveNamesFromRoom(room);
    console.log(`Retrieved player names: ${playerNames}`);
    io.emit(GameEvents.UPDATE_NAME_LIST, playerNames);
}

async function storePlayerName(socketId: string, name: string) : Promise<void> {
    const playerHashName : string = generatePlayerHashName(socketId);
    const playerData : Player = {name};
    await redisClient.hSet(playerHashName, playerData);
}

async function retrievePlayerName(socketId: string) : Promise<string | undefined> {
    return await redisClient.hGet(generatePlayerHashName(socketId), "name");
}

async function addNameToRoom(room: string, name: string) : Promise<void> {
    await redisClient.SADD(generateRoomKeyName(room), name);
}

async function retrieveNamesFromRoom(room: string) : Promise<string[]> {
    return await redisClient.SMEMBERS(generateRoomKeyName(room))
}

function generatePlayerHashName(socketId: string) : string {
    return `player:${socketId}`;
}

function generateRoomKeyName(room: string) : string {
    return `room:${room}`;
}


server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});