import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { EvaluationRequestData, EvaluationResponseData,  OpponentEvaluationResponseData} from "../common/evaluation-types" 
import * as GameEvents from "../common/game-events";
import { evaluateGuess } from "./evaluation";
import { PlayerNameEntry as Player } from './model';

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
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', onDisconnect);

    socket.on(GameEvents.DECLARE_NAME, (name : string) => onDeclareName(socket, name));

    socket.on("guess", (guessReq : EvaluationRequestData) => onGuess(socket, guessReq));
});


// Define event listeners
function onDisconnect () { console.log("user disconnected"); }

async function onDeclareName (socket : Socket, name : string) {
    if (! redisClient.isReady) await redisClient.connect();
    console.log(`Name received: ${name}. Writing to db.`);
    
    const playerHashName : string = generatePlayerHashName(socket.id);
    const playerData : Player = {name};

    redisClient.hSet(playerHashName, playerData); 

    socket.broadcast.emit(GameEvents.ADD_NAME, name);
}

async function onGuess ( socket : Socket, guessReq : EvaluationRequestData) {
    console.log(`Guess received: ${guessReq.guess}`);

    // Get socket's name
    if (! redisClient.isReady) await redisClient.connect();
    const playerHashName : string = generatePlayerHashName(socket.id);
    const playerName : string | undefined = await redisClient.hGet(playerHashName, "name");
    console.log(`Guesser name retrieved: ${playerName}`);

    // Evaluate result
    const result : EvaluationResponseData = await evaluateGuess(guessReq.guess);
    const oppResult : OpponentEvaluationResponseData = {playerName, ...result};

    // Send results
    console.log("Sending results");
    socket.emit(GameEvents.EVALUATION, result);
    socket.broadcast.emit(GameEvents.OPP_EVALUATION, oppResult);
}

function generatePlayerHashName(socketId: string) : string {
    return `player:${socketId}`;
}

server.listen(3001, () => {
    console.log('server running at http://localhost:3001');
});