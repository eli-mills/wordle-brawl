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
        return null;
    const guessResultHistory = await getGuessResultHistory(socketId);
    return {
        ...player,
        guessResultHistory,
        isLeader: player.isLeader === 'true',
        solved: player.solved === 'true',
    };
}
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
    }
    // TODO: update guessResultHistory
}
/**
 * Removes given player from DB.
 *
 * @param socketId : ID of the socket connection used by the player
 */
export async function deletePlayer(socketId) {
    const player = await getPlayer(socketId);
    if (!player)
        return;
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
/**
 * Assigns the given name to the given player in the DB.
 *
 * @param socketId : ID of the socket connection used by the player
 * @param playerName : name to be assigned to player
 */
export async function updatePlayerName(socketId, playerName) {
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), 'name', playerName);
    }
    catch (err) {
        console.error(`DB error when updating player ${socketId} to have name ${playerName}`);
        throw err;
    }
}
/**
 * Assigns the given roomId and adds player to that room's playerList.
 *
 * @param socketId : ID of the socket connection used by the player
 * @param roomId : ID of the room of the game the player has joined
 */
export async function updatePlayerRoom(socketId, roomId) {
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), 'roomId', roomId);
    }
    catch (err) {
        console.error(`DB error when updating player ${socketId} to have roomId ${roomId}`);
        throw err;
    }
    await addPlayerToList(socketId, roomId);
}
/**
 * Retrieves the given player's room.
 *
 * @param socketId : ID of the socket connection used by the player
 * @returns : ID of the room the player's socket has joined
 */
export async function getPlayerRoomId(socketId) {
    try {
        return ((await redisClient.hGet(getRedisPlayerKey(socketId), 'roomId')) ??
            '');
    }
    catch (err) {
        console.error(`DB error when retrieving player ${socketId}'s roomId.`);
        throw err;
    }
}
/**
 * Increase the given player's scoreby the given number of points.
 *
 * @param socketId : ID of the socket connection used by the player
 * @param numberOfPoints : number of points to increment player's score
 */
export async function addToPlayerScore(socketId, numberOfPoints) {
    try {
        console.log(`Adding ${numberOfPoints} points to player ${socketId}'s score.`);
        const newScore = await redisClient.hIncrBy(getRedisPlayerKey(socketId), 'score', numberOfPoints);
        console.log(`New score: ${newScore}`);
    }
    catch (err) {
        console.error(`DB error when incrementing player ${socketId}'s score by ${numberOfPoints}`);
        throw err;
    }
}
export async function setPlayerHasSolved(socketId) {
    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), 'solved', 'true');
    }
    catch (err) {
        console.error(`DB error when setting player ${socketId} as solved.`);
        throw err;
    }
}
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
        return null;
    console.log(`Retrieved room number: ${roomId}`);
    const newGame = {
        roomId,
        leader: socketId,
        status: 'lobby',
        chooser: '',
        currentAnswer: '',
        speedBonusWinner: '',
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
 * @returns : Converted Game object, or null if not found
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
        return null;
    const playerList = await getPlayerList(roomId);
    const leader = await getPlayer(game.leader);
    const chooser = await getPlayer(game.chooser);
    const speedBonusFirst = await getPlayer(game.speedBonusWinner);
    if (!leader)
        throw new GameMissingDataError(`Game ${roomId} missing leader.`);
    return {
        ...game,
        roomId,
        leader,
        playerList,
        chooser,
        speedBonusWinner: speedBonusFirst,
    };
}
function convertGameToDbGame(game) {
    return {
        roomId: game.roomId,
        status: game.status,
        currentAnswer: game.currentAnswer,
        leader: game.leader.socketId,
        chooser: game.chooser?.socketId ?? '',
        speedBonusWinner: game.speedBonusWinner?.socketId ?? '',
    };
}
export async function updateGame(game) {
    const dbGame = convertGameToDbGame(game);
    try {
        await redisClient.hSet(getRedisGameKey(game.roomId), dbGame);
    }
    catch (err) {
        console.error(`DB error when updating game ${game.roomId} to be ${JSON.stringify(dbGame)}`);
        throw err;
    }
    // TODO: update player list
}
/**
 * Set game status to choosing and handles side effects.
 * @param roomId : ID of the room the Game is being hosted in
 */
export async function setGameStatusChoosing(roomId) {
    const choosingStatus = 'choosing';
    try {
        await redisClient.hSet(getRedisGameKey(roomId), 'status', choosingStatus);
    }
    catch (err) {
        console.error(`DB error when setting game ${roomId} to ${choosingStatus} status`);
        throw err;
    }
    await pickRandomChooser(roomId);
}
async function pickRandomChooser(roomId) {
    const newChooser = await getRandomChooserFromList(roomId);
    try {
        await redisClient.hSet(getRedisGameKey(roomId), 'chooser', newChooser.socketId);
    }
    catch (err) {
        console.error(`DB error when setting game ${roomId} to have chooser ${newChooser.socketId}`);
        throw err;
    }
}
export async function setGameStatusPlaying(roomId, chosenAnswer) {
    const playingStatus = 'playing';
    try {
        await redisClient.hSet(getRedisGameKey(roomId), 'status', playingStatus);
    }
    catch (err) {
        console.error(`DB error when setting game ${roomId} to ${playingStatus} status`);
        throw err;
    }
    await setCurrentAnswer(roomId, chosenAnswer);
}
async function setCurrentAnswer(roomId, chosenAnswer) {
    try {
        console.log(`Saving answer ${chosenAnswer} to db for game ${roomId}`);
        await redisClient.hSet(getRedisGameKey(roomId), 'currentAnswer', chosenAnswer.toUpperCase());
    }
    catch (err) {
        console.error(`DB error when setting currentAnswer for game ${roomId} to ${chosenAnswer}`);
        throw err;
    }
}
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
 *               CRUD - PLAYERLIST              *
 *                                              *
 ************************************************/
function getRedisPlayerListKey(roomId) {
    return `playerList:${roomId}`;
}
const HAS_NOT_CHOSEN = 0;
const HAS_CHOSEN = 1;
/**
 * Retrieve the list of players in the given room.
 *
 * @param roomId : ID of the room the game is being hosted in
 * @returns : list of converted Player objects within given room, or [] if not found
 */
async function getPlayerList(roomId) {
    let playerIdList;
    try {
        playerIdList = await redisClient.zRange(getRedisPlayerListKey(roomId), 0, -1);
    }
    catch (err) {
        console.error(`DB error when retrieving playerList for game ${roomId}`);
        throw err;
    }
    const playerList = await Promise.all(playerIdList.map(async (id) => await getPlayer(id)));
    return playerList.filter((player) => player !== null);
}
async function addPlayerToList(socketId, roomId) {
    try {
        await redisClient.zAdd(getRedisPlayerListKey(roomId), {
            score: HAS_NOT_CHOSEN,
            value: socketId,
        });
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
        await redisClient.zAdd(getRedisPlayerListKey(roomId), {
            score: HAS_CHOSEN,
            value: socketId,
        });
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
        await redisClient.zRem(getRedisPlayerListKey(roomId), socketId);
    }
    catch (err) {
        console.error(`DB error when removing player ${socketId} from playerList ${roomId}`);
        throw err;
    }
    await deleteGameIfListEmpty(roomId);
    await replaceLeaderIfRemoved(socketId, roomId);
}
async function deleteGameIfListEmpty(roomId) {
    try {
        if ((await redisClient.zCard(getRedisPlayerListKey(roomId))) <= 0) {
            console.log(`List empty, deleting game ${roomId}`);
            return await deleteGame(roomId);
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
        newLeaderId = await redisClient.zRandMember(getRedisPlayerListKey(roomId));
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
        const nextChooserId = await redisClient.zPopMin(getRedisPlayerListKey(roomId));
        if (!nextChooserId)
            throw new Error(`Tried to get random Player from empty playerList ${roomId}`);
        await markPlayerAsChooser(nextChooserId.value, roomId);
        const player = await getPlayer(nextChooserId.value);
        if (!player)
            throw new Error(`Player ${nextChooserId.value} in playerList ${roomId} does not exist.`);
        return player;
    }
    catch (err) {
        console.error(`DB error when retrieving random member from playerList ${roomId}`);
        throw err;
    }
}
