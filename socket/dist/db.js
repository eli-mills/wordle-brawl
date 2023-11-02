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
    const newPlayer = {
        socketId,
        roomId,
        name: "",
    };
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), newPlayer);
    }
    catch (err) {
        console.log(`DB error when creating Player ${JSON.stringify(newPlayer)}`);
        console.log(err);
    }
    try {
        await addPlayerToList(roomId, socketId);
    }
    catch (err) {
        console.log(`DB error when adding Player ${JSON.stringify(newPlayer)} to list ${roomId}`);
        console.log(err);
    }
}
async function getPlayer(socketId) {
    let player;
    try {
        player = await redisClient.hGetAll(getRedisPlayerKey(socketId));
    }
    catch (err) {
        console.log("err6");
        return null;
    }
    const guessResultHistory = await getGuessResultHistory(socketId);
    return {
        guessResultHistory,
        ...player
    };
}
;
export async function deletePlayer(socketId) {
    const player = await getPlayer(socketId);
    if (!player)
        return;
    await redisClient.del(getRedisPlayerKey(socketId));
    await deleteGuessResultHistory(socketId);
    await removePlayerFromList(player.roomId, socketId);
}
export async function updatePlayerName(socketId, playerName) {
    await redisClient.hSet(getRedisPlayerKey(socketId), "name", playerName);
}
export async function getPlayerRoomId(socketId) {
    return await redisClient.hGet(getRedisPlayerKey(socketId), "roomId") ?? "";
}
function getRedisPlayerKey(socketId) {
    return `player:${socketId}`;
}
/************************************************
 *                                              *
 *                  CRUD - GAMES                *
 *                                              *
 ************************************************/
function getRedisGameKey(roomId) {
    return `game:${roomId}`;
}
export async function createGame(socketId) {
    const roomId = await getRandomRoomId();
    if (!roomId)
        return null;
    console.log(`Retrieved room number: ${roomId}`);
    const newGame = {
        roomId,
        leader: socketId,
    };
    await redisClient.hSet(getRedisGameKey(roomId), newGame);
    return await getGame(roomId);
}
export async function getGame(roomId) {
    let game, playerList, leader;
    try {
        game = await redisClient.hGetAll(getRedisGameKey(roomId));
    }
    catch (err) {
        console.log("err 1");
        return null;
    }
    if (!Object.hasOwn(game, "leader"))
        return null;
    try {
        playerList = await getPlayerList(roomId);
        if (playerList === null)
            return null;
    }
    catch (err) {
        console.log("err 2");
        return null;
    }
    try {
        leader = await getPlayer(game.leader ?? "");
    }
    catch (err) {
        console.log("err 3");
        return null;
    }
    if (!leader) {
        console.log("Error: game with no leader.");
        return null;
    }
    ;
    return {
        roomId,
        leader,
        playerList
    };
}
async function deleteGame(roomId) {
    await deletePlayerList(roomId);
    await addRoomId(roomId);
    await redisClient.del(getRedisGameKey(roomId));
}
export async function gameExists(roomId) {
    return await redisClient.exists(getRedisGameKey(roomId)) > 0;
}
/************************************************
 *                                              *
 *                  CRUD - ROOMS                *
 *                                              *
 ************************************************/
async function addRoomId(roomId) {
    await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
}
async function getRandomRoomId() {
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
/************************************************
 *                                              *
 *                  CRUD - GUESS                *
 *                                              *
 ************************************************/
function getRedisHistoryKey(socketId) {
    return `guessResultHistory:${socketId}`;
}
function serializeGuessResult(guessResult) {
    return guessResult.join(" ");
}
function deserializeGuessResult(guessResultSerialized) {
    return guessResultSerialized.split(" ");
}
export async function createGuessResult(socketId, guessResult) {
    const serialized = serializeGuessResult(guessResult);
    await redisClient.rPush(getRedisHistoryKey(socketId), serialized);
}
async function getGuessResultHistory(socketId) {
    const history = await redisClient.lRange(getRedisHistoryKey(socketId), 0, -1);
    return history.map((guessResult) => deserializeGuessResult(guessResult));
}
async function deleteGuessResultHistory(socketId) {
    await redisClient.del(getRedisHistoryKey(socketId));
}
/************************************************
 *                                              *
 *               CRUD - PLAYERLIST              *
 *                                              *
 ************************************************/
function getRedisPlayerListKey(roomId) {
    return `playerList:${roomId}`;
}
async function getPlayerList(roomId) {
    let playerIdList;
    try {
        playerIdList = await redisClient.sMembers(getRedisPlayerListKey(roomId));
    }
    catch (err) {
        console.log("err 4");
        return [];
    }
    const playerList = playerIdList.map(async (id) => await getPlayer(id));
    try {
        const resolvedPlayerList = await Promise.all(playerList);
        if (resolvedPlayerList.includes(null))
            return [];
        return resolvedPlayerList;
    }
    catch (err) {
        console.log("err 5");
        return [];
    }
}
async function addPlayerToList(roomId, socketId) {
    await redisClient.sAdd(getRedisPlayerListKey(roomId), socketId);
}
async function removePlayerFromList(roomId, socketId) {
    await redisClient.sRem(getRedisPlayerListKey(roomId), socketId);
    // Check if list empty
    const playerList = await getPlayerList(roomId);
    if (playerList === null || playerList.length <= 0) {
        return await deleteGame(roomId);
    }
    // Check if player is leader
    const leaderId = await redisClient.hGet(getRedisGameKey(roomId), "leader");
    if (socketId === leaderId) {
        await redisClient.hSet(getRedisGameKey(roomId), "leader", playerList[0].socketId);
    }
}
async function deletePlayerList(roomId) {
    await redisClient.del(getRedisPlayerListKey(roomId));
}
