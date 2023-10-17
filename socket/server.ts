import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { 
    EvaluationRequestData, 
    EvaluationResponseData,  
    OpponentEvaluationResponseData,
} from "../common/evaluation-types" 
import { GameStateData, JoinRoomRequestData } from "../common/game-setup-types"
import * as GameEvents from "../common/game-events";
import { evaluateGuess } from "./evaluation";
import { Player, Room } from './model';

const availableRoomIds: string = "availableRoomIds";

// Configure redis client
const redisClient = createClient({
    url: "redis://127.0.0.1:6379" 
});
redisClient.on("error", err => console.error("Redis client error", err));



// Instantiate socket server
const server = createServer();
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Configure socket event listeners
io.on('connection', async (socket) => {
    console.log('a user connected');
    
    // Add event listeners to socket
    socket.on('disconnect', onDisconnect);
    socket.on(GameEvents.DECLARE_NAME, (name : string) => {
        onDeclareName(socket, name);
        emitUpdatedNameList("room1");
    });
    socket.on(GameEvents.GUESS, (guessReq : EvaluationRequestData) => onGuess(socket, guessReq));
    socket.on(GameEvents.REQUEST_JOIN_ROOM, async (data: JoinRoomRequestData) => {
        await onJoinRoomRequest(socket, data.room);
    });
    socket.on(GameEvents.REQUEST_NEW_ROOM, async () => await onCreateRoomRequest(socket));
    
});

// Define event listeners
function onDisconnect () { console.log("user disconnected"); }

async function onJoinRoomRequest (socket: Socket, roomId: string) {
    if (!io.sockets.adapter.rooms.has(roomId)) {
        console.log(io.sockets.adapter.rooms);
        console.log("Room does not exist");
        socket.emit(GameEvents.ROOM_DNE);
        return;
    }

    socket.join(roomId);
    await createPlayer(socket.id, roomId);
    await emitUpdatedNameList(roomId);
}

async function onCreateRoomRequest (socket: Socket) {
    console.log("create room request received");
    let [roomId] = (await redisClient.sPop(availableRoomIds));
    roomId = roomId.padStart(4, "0");
    console.log(`retrieved room number: ${roomId}`);
    if (roomId === undefined) return socket.emit(GameEvents.NO_ROOMS_AVAILABLE);

    socket.join(roomId);
    await createPlayer(socket.id, roomId);

    const gameStateData: GameStateData = {
        roomId,
        playerList: []
    };

    socket.emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
}

async function onDeclareName (socket : Socket, name : string) {
    console.log(`Name received: ${name}. Writing to db.`);

    await updatePlayerName(socket.id, name);
    await addNameToRoom("room1", name);
    await emitUpdatedNameList("room1");     // "room1" temporary until rooms are implemented
}

async function onGuess ( socket : Socket, guessReq : EvaluationRequestData) {
    console.log(`Guess received: ${guessReq.guess}`);

    // Get socket's name
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

async function emitUpdatedNameList(roomId: string) : Promise<void> {
    const playerList : string[] = await retrieveNamesFromRoom(roomId);
    const gameStateData: GameStateData = {roomId, playerList}
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
}

async function createPlayer(socketId: string, roomId: string) : Promise<void> {
    const newPlayer: Player = { socketId, roomId };
    await redisClient.hSet(getPlayerKeyName(socketId), newPlayer);
}

async function updatePlayerName(socketId: string, name: string) : Promise<void> {
    const playerHashName : string = getPlayerKeyName(socketId);
    await redisClient.hSet(playerHashName, { name });
}

async function retrievePlayerName(socketId: string) : Promise<string | undefined> {
    return await redisClient.hGet(getPlayerKeyName(socketId), "name");
}

async function addNameToRoom(room: string, name: string) : Promise<void> {
    await redisClient.SADD(getRoomKeyName(room), name);
}

async function retrieveNamesFromRoom(room: string) : Promise<string[]> {
    return await redisClient.SMEMBERS(getRoomKeyName(room))
}

function getPlayerKeyName(socketId: string) : string {
    return `player:${socketId}`;
}

function getRoomKeyName(roomId: string) : string {
    return `room:${roomId}`;
}


async function populateAvailableRoomIds () {
    if (await redisClient.exists(availableRoomIds)) return;
    for (let i: number = 0; i < 10000; i++) {
        const roomId: string = i.toString().padStart(4, "0");
        await redisClient.sAdd(availableRoomIds, roomId);
    }
}
// Connect to database and start server
redisClient.connect()
.then(populateAvailableRoomIds)
.then(() => {
    server.listen(3001, () => {
        console.log('server running at http://localhost:3001');
    });
});
