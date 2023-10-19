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
        origin: "http://eli.local:3000",
        methods: ["GET", "POST"]
    }
});

// Configure socket event listeners
io.on('connection', async (socket) => {
    console.log('a user connected');
    
    // Add event listeners to socket
    socket.on('disconnecting', () => onDisconnect(socket));
    socket.on(GameEvents.DECLARE_NAME, (name : string) => {
        onDeclareName(socket, name);
    });
    socket.on(GameEvents.GUESS, (guessReq : EvaluationRequestData) => onGuess(socket, guessReq));
    socket.on(GameEvents.REQUEST_JOIN_ROOM, async (data: JoinRoomRequestData) => {
        await onJoinRoomRequest(socket, data.room);
    });
    socket.on(GameEvents.REQUEST_NEW_ROOM, async () => await onCreateRoomRequest(socket));
    
});

// Define event listeners
async function onDisconnect (socket: Socket) { 
    console.log(`Player ${socket.id} disconnected`);
    const rooms: Set<string> = socket.rooms;
    if (rooms.size <= 0) return;
    for (let room of rooms) {
        const remainingConnections = io.of("/").adapter.rooms.get(room);
        if (room !== socket.id && remainingConnections?.size === 1) {
            console.log(`Return ${room} to available rooms list`);
            await redisClient.sAdd(availableRoomIds, room);
        }
    }
}

async function onJoinRoomRequest (socket: Socket, roomId: string) {
    console.log(`Received joinRoomRequest for room ${roomId}`);
    if (!io.sockets.adapter.rooms.has(roomId)) {
        console.log(`Room ${roomId} does not exist`);
        socket.emit(GameEvents.ROOM_DNE);
        return;
    }

    socket.join(roomId);
    await createPlayer(socket.id, roomId);
    await emitUpdatedGameState(roomId);
}

async function onCreateRoomRequest (socket: Socket) {
    console.log("create room request received");
    const roomIdList: string[] | string = (await redisClient.sPop(availableRoomIds));
    console.log(`Retrieved roomIDList: ${roomIdList}`);
    const roomId = (typeof roomIdList === "string" ? roomIdList : roomIdList[0]).padStart(4, "0");
    console.log(`retrieved room number: ${roomId}`);
    if (roomId === undefined) return socket.emit(GameEvents.NO_ROOMS_AVAILABLE);

    socket.join(roomId);
    const playerIds = io.of("/").adapter.rooms.get(roomId)?.values();
    console.log(`Just joined room ${roomId}: ${Array.from(playerIds ?? [])}`);
    await createPlayer(socket.id, roomId);

    const gameStateData: GameStateData = {
        roomId,
        playerList: []
    };

    socket.emit(GameEvents.NEW_ROOM_CREATED, gameStateData);
}

async function onDeclareName (socket : Socket, name : string) {
    console.log(`Name received: ${name}. Writing to db.`);

    const player = await getPlayer(socket.id);
    player.name = name;
    await updatePlayer(player);
    await emitUpdatedGameState(player.roomId);
}

async function onGuess ( socket : Socket, guessReq : EvaluationRequestData) {
    console.log(`Guess received: ${guessReq.guess}`);

    // Get socket's name
    const playerName : string = await retrievePlayerName(socket.id);
    console.log(`Guesser name retrieved: ${playerName}`);

    // Evaluate result
    const result : EvaluationResponseData = await evaluateGuess(guessReq.guess);
    const oppResult : OpponentEvaluationResponseData = {playerName, ...result};

    // Send results
    console.log("Sending results");
    socket.emit(GameEvents.EVALUATION, result);
    socket.broadcast.emit(GameEvents.OPP_EVALUATION, oppResult);
}

async function emitUpdatedGameState(roomId: string) : Promise<void> {
    const playerList = await retrieveNamesFromRoom(roomId);
    const gameStateData: GameStateData = {roomId, playerList}
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData);
}

async function createPlayer(socketId: string, roomId: string) : Promise<void> {
    const newPlayer: Player = { socketId, roomId };
    await redisClient.hSet(getPlayerKeyName(socketId), newPlayer);
}

async function getPlayer(socketId: string) : Promise<Player> {
    return await redisClient.hGetAll(getPlayerKeyName(socketId)) as Player;
}

async function updatePlayer(player: Player) : Promise<void> {
    const playerHashName : string = getPlayerKeyName(player.socketId);
    await redisClient.hSet(playerHashName, player);
}

async function retrievePlayerName(socketId: string) : Promise<string> {
    return await redisClient.hGet(getPlayerKeyName(socketId), "name") ?? "";
}

async function retrieveNamesFromRoom(roomId: string) : Promise<string[]> {
    const playerIds: Set<string> | undefined = io.sockets.adapter.rooms.get(roomId);
    console.log(`Got the following player Ids for room ${roomId}: ${Array.from(playerIds?.values() ?? [])}`);
    const playerList: string[] = [];

    if (!playerIds) return [];

    for (const playerId of playerIds) {
        const player: Player = await getPlayer(playerId);
        playerList.push(player.name ?? "");
    }

    console.log(`Returning playerList: ${playerList}`);
    return playerList
}

function getPlayerKeyName(socketId: string) : string {
    return `player:${socketId}`;
}


async function populateAvailableRoomIds () {
    if (await redisClient.exists(availableRoomIds) && await redisClient.sCard(availableRoomIds) === 10000) {
        console.log("Not populating rooms");
        return;
    }
    console.log("Populating rooms");
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
