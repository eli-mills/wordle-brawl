import { createClient } from 'redis';
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
export async function initializeDbConn() {
    await redisClient.connect();
    await populateAvailableRoomIds();
}
/************************************************
 *                                              *
 *                CRUD - PLAYERS                *
 *                                              *
 ************************************************/
export async function createPlayer(socketId, roomId) {
    const newPlayer = { socketId, roomId };
    await redisClient.hSet(getPlayerKeyName(socketId), newPlayer);
}
export async function getPlayer(socketId) {
    return await redisClient.hGetAll(getPlayerKeyName(socketId));
}
export async function updatePlayer(player) {
    const playerHashName = getPlayerKeyName(player.socketId);
    await redisClient.hSet(playerHashName, player);
}
export async function deletePlayer(socketId) {
    const playerHashName = getPlayerKeyName(socketId);
    await redisClient.del(playerHashName);
}
export async function retrievePlayerName(socketId) {
    return await redisClient.hGet(getPlayerKeyName(socketId), "name") ?? "";
}
function getPlayerKeyName(socketId) {
    return `player:${socketId}`;
}
/************************************************
 *                                              *
 *                  CRUD - ROOMS                *
 *                                              *
 ************************************************/
export async function addRoomId(roomId) {
    redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
}
export async function getRandomRoomId() {
    return await redisClient.sPop(AVAILABLE_ROOM_IDS);
}
async function populateAvailableRoomIds() {
    if (await redisClient.exists(AVAILABLE_ROOM_IDS) && await redisClient.sCard(AVAILABLE_ROOM_IDS) === 10000) {
        console.log("Not populating rooms");
        return;
    }
    console.log("Populating rooms");
    for (let i = 0; i < 10000; i++) {
        const roomId = i.toString().padStart(4, "0");
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
    }
}
