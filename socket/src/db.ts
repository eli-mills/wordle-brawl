import { createClient } from 'redis';
import { Result, Player, Game } from '../../common';

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

type DbPlayer = Omit<Player, "guessResultHistory">

/**
 * Creates a new Player entry in the DB.
 * 
 * @param socketId : ID of the socket connection used by the player
 */
export async function createPlayer(socketId: string) : Promise<void> {
    const newPlayer: DbPlayer = { 
        socketId, 
        roomId: "", 
        name: "",
    };

    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), newPlayer);
    } catch (err) {
        console.error(`DB error when creating Player ${JSON.stringify(newPlayer)}`);
        throw err;
    }    
}

export async function playerJoinGame(socketId: string, roomId: string) : Promise<void> {
    await updatePlayerRoom(socketId, roomId);
    await addPlayerToList(socketId, roomId);
}

/**
 * Retrieves given player from DB.
 * 
 * @param socketId : ID of the socket connection used by the player
 * @returns : Converted Player object, or null if key not found
 */
async function getPlayer(socketId: string) : Promise<Player | null> {
    let player: DbPlayer | {}
    try {
        player = await redisClient.hGetAll(getRedisPlayerKey(socketId));
    } catch (err) { 
        console.error(`DB error when retrieving Player ${socketId}.`); 
        throw err;
    }
    if (Object.keys(player).length <= 0) return null;

    const guessResultHistory = await getGuessResultHistory(socketId);
    
    return {
        guessResultHistory,
        ...player as DbPlayer
    }
};

/**
 * Removes given player from DB.
 * 
 * @param socketId : ID of the socket connection used by the player
 */
export async function deletePlayer(socketId: string) : Promise<void> {
    const player = await getPlayer(socketId);
    if (!player) return;

    try {
        await redisClient.del(getRedisPlayerKey(socketId));
    } catch (err) {
        console.error(`DB error when deleting player ${socketId}.`);
        throw err;
    }

    await deleteGuessResultHistory(socketId);
    await removePlayerFromList(player.roomId, socketId);
}

/**
 * Assigns the given name to the given player in the DB.
 * 
 * @param socketId : ID of the socket connection used by the player
 * @param playerName : name to be assigned to player
 */
export async function updatePlayerName(socketId: string, playerName: string) : Promise<void> {
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), "name", playerName);
    } catch (err) {
        console.error(`DB error when updating player ${socketId} to have name ${playerName}`);
        throw err;
    }
}

async function updatePlayerRoom(socketId: string, roomId: string) : Promise<void> {
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), "roomId", roomId);
    } catch (err) {
        console.error(`DB error when updating player ${socketId} to have roomId ${roomId}`);
        throw err;
    }
}

/**
 * Retrieves the given player's room.
 * 
 * @param socketId : ID of the socket connection used by the player
 * @returns : ID of the room the player's socket has joined
 */
export async function getPlayerRoomId(socketId: string) : Promise<string> {
    try {
        return await redisClient.hGet(getRedisPlayerKey(socketId), "roomId") ?? "";
    } catch (err) {
        console.error(`DB error when retrieving player ${socketId}'s roomId.`);
        throw err;
    }
}

function getRedisPlayerKey(socketId: string) : string {
    return `player:${socketId}`;
}


/************************************************
 *                                              *
 *                  CRUD - GAMES                *
 *                                              *
 ************************************************/

type DbGame = Omit<Game, "playerList" | "leader"> & {
    leader: string;
};

function getRedisGameKey(roomId: string) : string {
    return `game:${roomId}`;
}

/**
 * Creates a new Player entry in the DB.
 * 
 * @param socketId : ID of the socket connection used by the player
 * @returns : newly-created Game, or null if no rooms available
 */
export async function createGame(socketId: string) : Promise<Game | null> {
    const roomId = await getRandomRoomId();
    if (!roomId) return null;

    console.log(`Retrieved room number: ${roomId}`);

    const newGame: DbGame = {
        roomId,
        leader: socketId,
    }

    try {
        await redisClient.hSet(getRedisGameKey(roomId), newGame); 
    } catch (err) {
        console.error(`DB error when creating game ${roomId} for player ${socketId}`);
        throw err;
    }

    return await getGame(roomId);
}

/**
 * Retrieves given game from DB.
 * 
 * @param roomId : ID of the room the game is being hosted in
 * @returns : Converted Game object, or null if not found
 */
export async function getGame(roomId: string) : Promise<Game | null> {
    let game: DbGame | {};
    class GameMissingDataError extends Error {};

    try {
        game = await redisClient.hGetAll(getRedisGameKey(roomId)); 
    } catch (err) {
        console.log(`DB error when retrieving game ${roomId}`);
        throw err;
    }

    if (Object.keys(game).length === 0) return null;

    const playerList = await getPlayerList(roomId);
    const leader = await getPlayer((game as DbGame).leader);
    if (!leader) throw new GameMissingDataError(`Game ${roomId} missing leader.`);

    return {
        roomId,
        leader,
        playerList
    }
}

/**
 * Removes given player from DB.
 * 
 * @param roomId : ID of the room the game is being hosted in
 */
async function deleteGame(roomId: string) : Promise<void> {
    await deletePlayerList(roomId);
    await addRoomId(roomId);

    try {
        await redisClient.del(getRedisGameKey(roomId));
    } catch (err) {
        console.error(`DB error when deleting game ${roomId}.`);
        throw err;
    }
}

export async function gameExists(roomId: string) : Promise<boolean> {
    try {
        return await redisClient.exists(getRedisGameKey(roomId)) > 0;
    } catch (err) {
        console.error(`DB error when checking whether game ${roomId} exists.`);
        throw err;
    }
}


/************************************************
 *                                              *
 *                CRUD - ROOM IDS               *
 *                                              *
 ************************************************/

const AVAILABLE_ROOM_IDS = "availableRoomIds";

async function addRoomId(roomId: string) : Promise<void> {
    try {
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
    } catch (err) {
        console.error(`DB error when adding roomID ${roomId}`);
        throw err;
    }
}

async function getRandomRoomId() : Promise<string | null> {
    try {
        return await redisClient.sPop(AVAILABLE_ROOM_IDS) as unknown as string ?? null;
    } catch (err) {
        console.error(`DB error when retrieving random roomId.`);
        throw err;
    }
}

/**
 * Fills database with 10000 room IDs if not already filled. 
 */
async function populateAvailableRoomIds () : Promise<void> {
    if (await redisClient.sCard(AVAILABLE_ROOM_IDS) === 10000) {
        console.log("Not populating rooms");
        return;
    }
    console.log("Populating rooms");
    for (let i: number = 0; i < 10000; i++) {
        const roomId: string = i.toString().padStart(4, "0");
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
    }
}

/************************************************
 *                                              *
 *                  CRUD - GUESS                *
 *                                              *
 ************************************************/

function getRedisHistoryKey(socketId: string) : string {
    return `guessResultHistory:${socketId}`
}

function serializeGuessResult(guessResult: Result[]) : string {
    return guessResult.join(" ");
}

function deserializeGuessResult(guessResultSerialized: string) : string[] {
    return guessResultSerialized.split(" ");
}

/**
 * Record a guess result for the given player.
 * 
 * @param socketId : ID of the socket connection used by the player
 * @param guessResult : List of eval results corresponding to each letter of guess 
 */
export async function createGuessResult(socketId: string, guessResult: Result[]) : Promise<void> {
    const serialized = serializeGuessResult(guessResult);

    try {
        await redisClient.rPush(getRedisHistoryKey(socketId), serialized);
    } catch (err) {
        console.error(`DB error when adding guess result ${guessResult} for player ${socketId}`);
        throw err;
    }
}

/**
 * Returns given Player's guess result history.
 * @param socketId : ID of the socket connection used by the player
 * @returns : Player's guess result history, or [] if not found.
 */
async function getGuessResultHistory(socketId: string) : Promise<Result[][]> {
    try {
        const history = await redisClient.lRange(getRedisHistoryKey(socketId), 0, -1);
        return history.map((guessResult) => deserializeGuessResult(guessResult)) as Result[][]
    } catch (err) {
        console.error(`DB error when retrieving guessResultHistory for player ${socketId}`);
        throw err;
    }
}

async function deleteGuessResultHistory(socketId: string) : Promise<void> {
    try {
        await redisClient.del(getRedisHistoryKey(socketId));
    } catch (err) {
        console.error(`DB error when deleting guessResultHistory ${socketId}`);
        throw err;
    }
}


/************************************************
 *                                              *
 *               CRUD - PLAYERLIST              *
 *                                              *
 ************************************************/

function getRedisPlayerListKey(roomId: string) : string {
    return `playerList:${roomId}`;
}

/**
 * Retrieve the list of players in the given room.
 * 
 * @param roomId : ID of the room the game is being hosted in
 * @returns : list of converted Player objects within given room, or [] if not found
 */
async function getPlayerList(roomId: string) : Promise<Player[]> {
    let playerIdList: string[];
    try {
        playerIdList = await redisClient.sMembers(getRedisPlayerListKey(roomId));
    } catch (err) { 
        console.error(`DB error when retrieving playerList for game ${roomId}`);
        throw err; 
    }
    
    const playerList = await Promise.all(
        playerIdList.map(async (id: string) => await getPlayer(id))
    );

    return playerList.filter(player => player !== null) as Player[];
}

async function addPlayerToList(socketId: string, roomId: string) : Promise<void> {
    try {
        await redisClient.sAdd(getRedisPlayerListKey(roomId), socketId);
    } catch (err) {
        console.error(`DB error when adding player ${socketId} to playerList ${roomId}`);
        throw err;
    }
}

/**
 * Removes given player from given list, and handles cleanup in DB.
 * 
 * @param roomId : ID of the room containing the Players
 * @param socketId :  ID of the socket connection of the Player to remove
 * @returns 
 */
async function removePlayerFromList(roomId: string, socketId: string) : Promise<void> {
    try {
        await redisClient.sRem(getRedisPlayerListKey(roomId), socketId);
    } catch (err) {
        console.error(`DB error when removing player ${socketId} from playerList ${roomId}`);
        throw err;
    }
    
    await deleteGameIfListEmpty(roomId);
    await replaceLeaderIfRemoved(socketId, roomId);
}

async function deleteGameIfListEmpty(roomId: string) : Promise<void> {
    try {
        if (await redisClient.sCard(getRedisPlayerListKey(roomId)) <= 0) {
            return await deleteGame(roomId);
        }
    } catch (err) {
        console.error(`DB error when checking length of playerList ${roomId}`);
        throw err;
    }
}

async function replaceLeaderIfRemoved(removedSocketId: string, roomId: string) : Promise<void> {
    let leaderId: string | undefined,
        newLeaderId: string | null;
    try {
        leaderId = await redisClient.hGet(getRedisGameKey(roomId), "leader");
    } catch (err) {
        console.error(`DB error when retrieving game ${roomId}'s leader`);
        throw err;
    }

    if (removedSocketId === leaderId) {
        // Leader deleted, replace leader
        try {
            newLeaderId = await redisClient.sRandMember(getRedisPlayerListKey(roomId));
        } catch (err) {
            console.error(`DB error when retrieving new leaderId for game ${roomId}`);
            throw err;
        }
        
        try {
            newLeaderId? 
            await redisClient.hSet(getRedisGameKey(roomId), "leader", newLeaderId)
            : null;
        } catch (err) {
            console.error(`DB error when setting player ${newLeaderId} as leader for game ${roomId}`);
            throw err;
        }
    }
}

async function deletePlayerList(roomId: string) : Promise<void> {
    try {
        await redisClient.del(getRedisPlayerListKey(roomId));
    } catch (err) {
        console.error(`DB error when deleting playerList ${roomId}`);
        throw err;
    }

}