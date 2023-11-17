import { createClient } from 'redis';
/************************************************
 *                                              *
 *                 CONFIGURATION                *
 *                                              *
 ************************************************/
const redisClient = createClient({
    url: process.env.DB_URL,
});
redisClient.on('error', (err) => console.error('Redis client error', err));
export async function initializeDbConn() {
    await redisClient.connect();
    await populateAvailableRoomIds();
}
/**
 * Creates a new Player entry in the DB.
 *
 * @param socketId : ID of the socket connection used by the player
 */
export async function createPlayer(socketId) {
    const newPlayer = {
        socketId,
        roomId: '',
        name: '',
        isLeader: 'false',
        score: 0,
        solved: 'false',
    };
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), newPlayer);
    }
    catch (err) {
        console.error(`DB error when creating Player ${JSON.stringify(newPlayer)}`);
        throw err;
    }
}
/**
 * Retrieves given player from DB.
 *
 * @param socketId : ID of the socket connection used by the player
 * @returns : Converted Player object, or null if key not found
 */
export async function getPlayer(socketId) {
    let player;
    try {
        player = (await redisClient.hGetAll(getRedisPlayerKey(socketId)));
    }
    catch (err) {
        console.error(`DB error when retrieving Player ${socketId}.`);
        throw err;
    }
    if (Object.keys(player).length === 0)
        throw new Error(`Bad request: could not retrieve player ${socketId}`);
    const guessResultHistory = await getGuessResultHistory(socketId);
    return {
        ...player,
        guessResultHistory,
        isLeader: player.isLeader === 'true',
        solved: player.solved === 'true',
    };
}
// export async function updatePlayerField<K extends keyof DbPlayer>(socketId: string, field: K, value: DbPlayer[K]) {
//     try {
//         await redisClient.hSet(getRedisPlayerKey(socketId), field, value)
//     } catch (err) {
//         console.error(`DB error when setting player ${socketId} field ${field} to value ${value}`);
//         throw err;
//     }
// }
function convertPlayerToDbPlayer(player) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { guessResultHistory, ...rest } = player;
    return {
        ...rest,
        isLeader: player.isLeader ? 'true' : 'false',
        solved: player.solved ? 'true' : 'false',
    };
}
export async function updatePlayer(player) {
    const dbPlayer = convertPlayerToDbPlayer(player);
    try {
        redisClient.hSet(getRedisPlayerKey(player.socketId), dbPlayer);
    }
    catch (err) {
        console.error(`DB error when setting player ${player.socketId} to be ${JSON.stringify(dbPlayer)}`);
        throw err;
    }
}
/**
 * Removes given player from DB.
 *
 * @param socketId : ID of the socket connection used by the player
 */
export async function deletePlayer(socketId) {
    const player = await getPlayer(socketId);
    try {
        await redisClient.del(getRedisPlayerKey(socketId));
    }
    catch (err) {
        console.error(`DB error when deleting player ${socketId}.`);
        throw err;
    }
    await deleteGuessResultHistory(socketId);
    await removePlayerFromList(socketId, player.roomId);
}
// /**
//  * Assigns the given roomId and adds player to that room's playerList.
//  *
//  * @param socketId : ID of the socket connection used by the player
//  * @param roomId : ID of the room of the game the player has joined
//  */
// export async function updatePlayerRoom(
//     socketId: string,
//     roomId: string
// ): Promise<void> {
//     try {
//         await redisClient.hSet(getRedisPlayerKey(socketId), 'roomId', roomId)
//     } catch (err) {
//         console.error(
//             `DB error when updating player ${socketId} to have roomId ${roomId}`
//         )
//         throw err
//     }
//     await addPlayerToList(socketId, roomId)
// }
// /**
//  * Retrieves the given player's room.
//  *
//  * @param socketId : ID of the socket connection used by the player
//  * @returns : ID of the room the player's socket has joined
//  */
// export async function getPlayerRoomId(socketId: string): Promise<string> {
//     try {
//         return (
//             (await redisClient.hGet(getRedisPlayerKey(socketId), 'roomId')) ??
//             ''
//         )
//     } catch (err) {
//         console.error(`DB error when retrieving player ${socketId}'s roomId.`)
//         throw err
//     }
// }
// /**
//  * Increase the given player's scoreby the given number of points.
//  *
//  * @param socketId : ID of the socket connection used by the player
//  * @param numberOfPoints : number of points to increment player's score
//  */
// export async function addToPlayerScore(
//     socketId: string,
//     numberOfPoints: number
// ): Promise<void> {
//     try {
//         console.log(
//             `Adding ${numberOfPoints} points to player ${socketId}'s score.`
//         )
//         const newScore = await redisClient.hIncrBy(
//             getRedisPlayerKey(socketId),
//             'score',
//             numberOfPoints
//         )
//         console.log(`New score: ${newScore}`)
//     } catch (err) {
//         console.error(
//             `DB error when incrementing player ${socketId}'s score by ${numberOfPoints}`
//         )
//         throw err
//     }
// }
// export async function setPlayerHasSolved(
//     socketId: string,
//     playerHasSolved: 'true' | 'false'
// ): Promise<void> {
//     try {
//         await redisClient.hSet(
//             getRedisPlayerKey(socketId),
//             'solved',
//             playerHasSolved
//         )
//     } catch (err) {
//         console.error(`DB error when setting player ${socketId} as solved.`)
//         throw err
//     }
// }
function getRedisPlayerKey(socketId) {
    return `player:${socketId}`;
}
function getRedisGameKey(roomId) {
    return `game:${roomId}`;
}
/**
 * Creates a new Player entry in the DB.
 *
 * @param socketId : ID of the socket connection used by the player
 * @returns : new Game's roomId, or null if no rooms available
 */
export async function createGame(socketId) {
    const roomId = await getRandomRoomId();
    if (!roomId)
        return '';
    console.log(`Retrieved room number: ${roomId}`);
    const newGame = {
        roomId,
        leader: socketId,
        status: 'lobby',
        chooser: '',
        currentAnswer: '',
    };
    try {
        await redisClient.hSet(getRedisGameKey(roomId), newGame);
    }
    catch (err) {
        console.error(`DB error when creating game ${roomId} for player ${socketId}`);
        throw err;
    }
    return roomId;
}
/**
 * Retrieves given game from DB.
 *
 * @param roomId : ID of the room the game is being hosted in
 * @returns : Converted Game object
 */
export async function getGame(roomId) {
    let game;
    class GameMissingDataError extends Error {
    }
    try {
        game = (await redisClient.hGetAll(getRedisGameKey(roomId)));
    }
    catch (err) {
        console.log(`DB error when retrieving game ${roomId}`);
        throw err;
    }
    if (Object.keys(game).length === 0)
        throw new Error(`Bad request: could not retrieve game ${roomId} from DB.`);
    const playerList = await getPlayerList(roomId);
    const leader = await getPlayer(game.leader);
    const chooser = game.chooser ? await getPlayer(game.chooser) : null;
    if (!leader)
        throw new GameMissingDataError(`Game ${roomId} missing leader.`);
    return {
        ...game,
        roomId,
        leader,
        playerList,
        chooser,
    };
}
/**
 * Sets one of a game's fields to the given value
 *
 * Source for typing: https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript
 * @param roomId : ID of the room the game is being hosted in
 * @param field : field to update
 * @param value : value to save to field
 */
export async function updateGameField(roomId, field, value) {
    try {
        await redisClient.hSet(getRedisGameKey(roomId), field, value);
    }
    catch (err) {
        console.error(`DB error when setting game ${roomId} field ${field} to value ${value}`);
        throw err;
    }
}
export async function pickRandomChooser(roomId) {
    const newChooser = await getRandomChooserFromList(roomId);
    try {
        await redisClient.hSet(getRedisGameKey(roomId), 'chooser', newChooser.socketId);
    }
    catch (err) {
        console.error(`DB error when setting game ${roomId} to have chooser ${newChooser.socketId}`);
        throw err;
    }
}
// export async function setGameStatusPlaying(
//     roomId: string,
//     chosenAnswer: string
// ): Promise<void> {
//     const playingStatus: GameStatus = 'playing'
//     try {
//         await redisClient.hSet(getRedisGameKey(roomId), 'status', playingStatus)
//     } catch (err) {
//         console.error(
//             `DB error when setting game ${roomId} to ${playingStatus} status`
//         )
//         throw err
//     }
//     await setCurrentAnswer(roomId, chosenAnswer)
// }
// async function setCurrentAnswer(
//     roomId: string,
//     chosenAnswer: string
// ): Promise<void> {
//     try {
//         console.log(`Saving answer ${chosenAnswer} to db for game ${roomId}`)
//         await redisClient.hSet(
//             getRedisGameKey(roomId),
//             'currentAnswer',
//             chosenAnswer.toUpperCase()
//         )
//     } catch (err) {
//         console.error(
//             `DB error when setting currentAnswer for game ${roomId} to ${chosenAnswer}`
//         )
//         throw err
//     }
// }
export async function getCurrentAnswer(roomId) {
    try {
        const answer = await redisClient.hGet(getRedisGameKey(roomId), 'currentAnswer');
        if (!answer)
            throw new Error(`Answer for game ${roomId} could not be retrieved.`);
        return answer;
    }
    catch (err) {
        console.error(`DB error when retrieving answer for game ${roomId}`);
        throw err;
    }
}
/**
 * Removes given player from DB.
 *
 * @param roomId : ID of the room the Game is being hosted in
 */
async function deleteGame(roomId) {
    await deletePlayerList(roomId);
    await addRoomId(roomId);
    try {
        await redisClient.del(getRedisGameKey(roomId));
    }
    catch (err) {
        console.error(`DB error when deleting game ${roomId}.`);
        throw err;
    }
}
export async function gameExists(roomId) {
    try {
        return (await redisClient.exists(getRedisGameKey(roomId))) > 0;
    }
    catch (err) {
        console.error(`DB error when checking whether game ${roomId} exists.`);
        throw err;
    }
}
/**
 * Retrieve the given game's leader ID.
 * @param roomId : ID of the room the game is being hosted in
 * @returns socketID of the given game's leader
 */
export async function getGameLeader(roomId) {
    try {
        return (await redisClient.hGet(getRedisGameKey(roomId), 'leader')) ?? '';
    }
    catch (err) {
        console.error(`DB error when getting Game ${roomId}'s leader.`);
        throw err;
    }
}
/************************************************
 *                                              *
 *                CRUD - ROOM IDS               *
 *                                              *
 ************************************************/
const AVAILABLE_ROOM_IDS = 'availableRoomIds';
async function addRoomId(roomId) {
    try {
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId);
    }
    catch (err) {
        console.error(`DB error when adding roomID ${roomId}`);
        throw err;
    }
}
async function getRandomRoomId() {
    try {
        return ((await redisClient.sPop(AVAILABLE_ROOM_IDS)) ?? null);
    }
    catch (err) {
        console.error(`DB error when retrieving random roomId.`);
        throw err;
    }
}
/**
 * Fills database with 10000 room IDs if not already filled.
 */
async function populateAvailableRoomIds() {
    if ((await redisClient.sCard(AVAILABLE_ROOM_IDS)) >= 10000) {
        console.log('Not populating rooms');
        return;
    }
    console.log('Populating rooms');
    for (let i = 0; i < 10000; i++) {
        const roomId = i.toString().padStart(4, '0');
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
    return guessResult.join(' ');
}
function deserializeGuessResult(guessResultSerialized) {
    return guessResultSerialized.split(' ');
}
/**
 * Record a guess result for the given player.
 *
 * @param socketId : ID of the socket connection used by the player
 * @param guessResult : List of eval results corresponding to each letter of guess
 */
export async function createGuessResult(socketId, guessResult) {
    const serialized = serializeGuessResult(guessResult);
    try {
        await redisClient.rPush(getRedisHistoryKey(socketId), serialized);
    }
    catch (err) {
        console.error(`DB error when adding guess result ${guessResult} for player ${socketId}`);
        throw err;
    }
}
/**
 * Returns given Player's guess result history.
 * @param socketId : ID of the socket connection used by the player
 * @returns : Player's guess result history, or [] if not found.
 */
async function getGuessResultHistory(socketId) {
    try {
        const history = await redisClient.lRange(getRedisHistoryKey(socketId), 0, -1);
        return history.map((guessResult) => deserializeGuessResult(guessResult));
    }
    catch (err) {
        console.error(`DB error when retrieving guessResultHistory for player ${socketId}`);
        throw err;
    }
}
async function deleteGuessResultHistory(socketId) {
    try {
        await redisClient.del(getRedisHistoryKey(socketId));
    }
    catch (err) {
        console.error(`DB error when deleting guessResultHistory ${socketId}`);
        throw err;
    }
}
/************************************************
 *                                              *
 *              CRUD - PLAYERLISTS              *
 *                                              *
 ************************************************/
function getRedisPlayerListKey(roomId) {
    return `playerList:${roomId}`;
}
function getRedisChooserListKey(roomId) {
    return `chooserList:${roomId}`;
}
function getRedisSolvedListKey(roomId) {
    return `solvedList:${roomId}`;
}
/**
 * Retrieve the list of players in the given room.
 *
 * @param roomId : ID of the room the game is being hosted in
 * @returns : record of converted Player objects within given room keyed on socketId
 */
async function getPlayerList(roomId) {
    let playerIdList;
    try {
        playerIdList = await redisClient.sMembers(getRedisPlayerListKey(roomId));
    }
    catch (err) {
        console.error(`DB error when retrieving playerList for game ${roomId}`);
        throw err;
    }
    const output = {};
    for (const socketId of playerIdList) {
        const player = await getPlayer(socketId);
        if (player)
            output[socketId] = player;
    }
    return output;
}
export async function addPlayerToList(socketId, roomId) {
    try {
        await redisClient.sAdd(getRedisPlayerListKey(roomId), socketId);
    }
    catch (err) {
        console.error(`DB error when adding player ${socketId} to playerList ${roomId}`);
        throw err;
    }
}
/**
 * Re-adds player to list with new score to indicate player has had a turn to choose word.
 * @param socketId :  ID of the socket connection of the Player to remove
 * @param roomId : ID of the room containing the Players
 */
async function markPlayerAsChooser(socketId, roomId) {
    try {
        await redisClient.sAdd(getRedisChooserListKey(roomId), socketId);
    }
    catch (err) {
        console.error(`DB error when marking ${socketId} as chooser in playerL:ist ${roomId}`);
        throw err;
    }
}
/**
 * Removes given player from given list, and handles cleanup in DB.
 *
 * @param socketId :  ID of the socket connection of the Player to remove
 * @param roomId : ID of the room containing the Players
 * @returns
 */
async function removePlayerFromList(socketId, roomId) {
    try {
        await redisClient.sRem(getRedisPlayerListKey(roomId), socketId);
    }
    catch (err) {
        console.error(`DB error when removing player ${socketId} from playerList ${roomId}`);
        throw err;
    }
    if (!(await deleteGameIfListEmpty(roomId))) {
        await replaceLeaderIfRemoved(socketId, roomId);
    }
}
/**
 * Check if playerList is empty. Delete game and return true if empty, else return false.
 * @param roomId : ID of the room containing the Players
 * @returns : true if game deleted, else false
 */
async function deleteGameIfListEmpty(roomId) {
    try {
        if ((await redisClient.sCard(getRedisPlayerListKey(roomId))) <= 0) {
            console.log(`List empty, deleting game ${roomId}`);
            await deleteGame(roomId);
            return true;
        }
        else {
            return false;
        }
    }
    catch (err) {
        console.error(`DB error when checking length of playerList ${roomId}`);
        throw err;
    }
}
async function replaceLeaderIfRemoved(removedSocketId, roomId) {
    let leaderId, newLeaderId;
    try {
        leaderId = await redisClient.hGet(getRedisGameKey(roomId), 'leader');
    }
    catch (err) {
        console.error(`DB error when retrieving game ${roomId}'s leader`);
        throw err;
    }
    if (removedSocketId !== leaderId)
        return;
    // Leader deleted, replace leader
    console.log(`Player ${leaderId} was the leader, need replacement.`);
    try {
        newLeaderId = await redisClient.sRandMember(getRedisPlayerListKey(roomId));
        console.log(`New leader chosen: ${newLeaderId}`);
    }
    catch (err) {
        console.error(`DB error when retrieving new leaderId for game ${roomId}`);
        throw err;
    }
    try {
        newLeaderId
            ? await redisClient.hSet(getRedisGameKey(roomId), 'leader', newLeaderId)
            : null;
    }
    catch (err) {
        console.error(`DB error when setting player ${newLeaderId} as leader for game ${roomId}`);
        throw err;
    }
}
async function deletePlayerList(roomId) {
    try {
        await redisClient.del(getRedisPlayerListKey(roomId));
        await redisClient.del(getRedisChooserListKey(roomId));
    }
    catch (err) {
        console.error(`DB error when deleting playerList ${roomId}`);
        throw err;
    }
}
/**
 * Get a random player from the given player list to choose the next word, and marks them as previous chooser.
 * @param roomId : ID of the room containing the Players
 * @returns : Random member Player
 */
async function getRandomChooserFromList(roomId) {
    try {
        const potentialChoosers = await redisClient.sDiff([
            getRedisPlayerListKey(roomId),
            getRedisChooserListKey(roomId),
        ]);
        if (potentialChoosers.length === 0)
            throw new Error(`No potential choosers left in playerList ${roomId}`);
        const nextChooserId = potentialChoosers[0];
        await markPlayerAsChooser(nextChooserId, roomId);
        const player = await getPlayer(nextChooserId);
        if (!player)
            throw new Error(`Player ${nextChooserId} in playerList ${roomId} does not exist.`);
        return player;
    }
    catch (err) {
        console.error(`DB error when retrieving random member from playerList ${roomId}`);
        throw err;
    }
}
/**
 * Resets 'solved' status for every player in list and deletes each guessResultHistory
 *
 * @param roomId : ID of the room containing the Players
 */
export async function resetPlayersSolved(roomId) {
    const playerList = await getPlayerList(roomId);
    for (const player of Object.values(playerList)) {
        player.solved = false;
        await updatePlayer(player);
        await deleteGuessResultHistory(player.socketId);
    }
    try {
        await redisClient.del(getRedisSolvedListKey(roomId));
    }
    catch (err) {
        console.error(`DB error when deleting solvedList ${roomId}`);
        throw err;
    }
}
// /**
//  * Saves given playerList to database using roomId for key
//  * @param roomId : ID of the room containing the Players
//  * @param playerList : set of Player objects keyed on socketId to be saved to db
//  */
// async function updatePlayerList(
//     roomId: string,
//     playerList: Record<string, Player>
// ): Promise<void> {
//     const socketIdList = Object.keys(playerList)
//     try {
//         redisClient.sAdd(getRedisPlayerListKey(roomId), socketIdList)
//     } catch (err) {
//         console.error(
//             `DB error when updating playerList ${roomId} to ${socketIdList}`
//         )
//         throw err
//     }
// }
export async function addPlayerToSolvedList(socketId, roomId) {
    try {
        await redisClient.rPush(getRedisSolvedListKey(roomId), socketId);
    }
    catch (err) {
        console.error(`DB error when adding player ${socketId} to solved list ${roomId}`);
        throw err;
    }
}
export async function getFirstSolver(roomId) {
    let firstSolverId;
    try {
        firstSolverId = await redisClient.lIndex(getRedisSolvedListKey(roomId), 0);
    }
    catch (err) {
        console.error(`DB error when retrieving first solver from list ${roomId}`);
        throw err;
    }
    if (!firstSolverId)
        throw new Error(`Invalid state: getFirstSolver called for game ${roomId} with empty list.`);
    const firstSolver = await getPlayer(firstSolverId);
    if (!firstSolver)
        throw new Error(`Invalid state: bad playerId ${firstSolverId} added to solved list ${roomId}`);
    return firstSolver;
}
