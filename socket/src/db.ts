import { createClient } from 'redis';

export type Player = {
    socketId: string
    roomId: string
    name?: string,
}

const AVAILABLE_ROOM_IDS = "availableRoomIds";


/************************************************
 *                                              *
 *                 CONFIGURATION                *
 *                                              *
 ************************************************/

const redisClient = createClient({
    url: process.env.DB_URL
});

redisClient.on("error", err => console.error("Redis client error", err));

export async function initializeDbConn() : Promise<void> {
    await redisClient.connect();
    await populateAvailableRoomIds();
}


/************************************************
 *                                              *
 *                CRUD - PLAYERS                *
 *                                              *
 ************************************************/

export async function createPlayer(socketId: string, roomId: string) : Promise<void> {
    const newPlayer: Player = { socketId, roomId };
    await redisClient.hSet(getPlayerKeyName(socketId), newPlayer);
}

export async function getPlayer(socketId: string) : Promise<Player> {
    return await redisClient.hGetAll(getPlayerKeyName(socketId)) as Player;
}

export async function updatePlayer(player: Player) : Promise<void> {
    const playerHashName = getPlayerKeyName(player.socketId);
    await redisClient.hSet(playerHashName, player);
}

export async function deletePlayer(socketId: string) : Promise<void> {
    const playerHashName = getPlayerKeyName(socketId);
    await redisClient.del(playerHashName);
}

export async function retrievePlayerName(socketId: string) : Promise<string> {
    return await redisClient.hGet(getPlayerKeyName(socketId), "name") ?? "";
}

export async function retrievePlayerRoom(socketId: string) : Promise<string> {
    return await redisClient.hGet(getPlayerKeyName(socketId), "roomId") ?? "";
}

function getPlayerKeyName(socketId: string) : string {
    return `player:${socketId}`;
}


/************************************************
 *                                              *
 *                  CRUD - ROOMS                *
 *                                              *
 ************************************************/

export async function addRoomId(roomId: string) : Promise<void> {
    redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
}

export async function getRandomRoomId() : Promise<string | null> {
    return await redisClient.sPop(AVAILABLE_ROOM_IDS) as unknown as string | null;
}

async function populateAvailableRoomIds () {
    if (await redisClient.exists(AVAILABLE_ROOM_IDS) && await redisClient.sCard(AVAILABLE_ROOM_IDS) === 10000) {
        console.log("Not populating rooms");
        return;
    }
    console.log("Populating rooms");
    for (let i: number = 0; i < 10000; i++) {
        const roomId: string = i.toString().padStart(4, "0");
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
    }
}