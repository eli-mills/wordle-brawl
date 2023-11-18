import { createClient } from 'redis'
import { Result, Player, Game } from '../../common'

type EmptyObject = Record<string, never>
type RedisBool = 'true' | 'false'

/************************************************
 *                                              *
 *                 CONFIGURATION                *
 *                                              *
 ************************************************/

const redisClient = createClient({
    url: process.env.DB_URL,
})

redisClient.on('error', (err) => console.error('Redis client error', err))

export async function initializeDbConn(): Promise<void> {
    await redisClient.connect()
    await populateAvailableRoomIds()
}

/************************************************
 *                                              *
 *                CRUD - PLAYERS                *
 *                                              *
 ************************************************/

type DbPlayer = Omit<
    Player,
    'guessResultHistory' | 'isLeader' | 'finished' | 'score'
> & {
    isLeader: RedisBool
    finished: RedisBool
    score: string
}

/**
 * Creates a new Player entry in the DB.
 *
 * @param socketId : ID of the socket connection used by the player
 */
export async function createPlayer(socketId: string): Promise<void> {
    const newPlayer: DbPlayer = {
        socketId,
        roomId: '',
        name: '',
        isLeader: 'false',
        score: '0',
        finished: 'false',
    }

    try {
        await redisClient.hSet(getRedisPlayerKey(socketId), newPlayer)
    } catch (err) {
        console.error(
            `DB error when creating Player ${JSON.stringify(newPlayer)}`
        )
        throw err
    }
}

/**
 * Retrieves given player from DB.
 *
 * @param socketId : ID of the socket connection used by the player
 * @returns : Converted Player object, or null if key not found
 */
export async function getPlayer(socketId: string): Promise<Player> {
    let player: DbPlayer | EmptyObject
    try {
        player = (await redisClient.hGetAll(getRedisPlayerKey(socketId))) as
            | DbPlayer
            | EmptyObject
    } catch (err) {
        console.error(`DB error when retrieving Player ${socketId}.`)
        throw err
    }
    if (Object.keys(player).length === 0)
        throw new Error(`Bad request: could not retrieve player ${socketId}`)

    const guessResultHistory = await getGuessResultHistory(socketId)

    return {
        ...(player as DbPlayer),
        score: Number.parseInt(player.score),
        guessResultHistory,
        isLeader: player.isLeader === 'true',
        finished: player.finished === 'true',
    }
}

function convertPlayerToDbPlayer(player: Player): DbPlayer {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { guessResultHistory, ...rest } = player

    return {
        ...rest,
        isLeader: player.isLeader ? 'true' : 'false',
        finished: player.finished ? 'true' : 'false',
        score: `${player.score}`,
    }
}

export async function updatePlayer(player: Player): Promise<void> {
    const dbPlayer = convertPlayerToDbPlayer(player)
    try {
        redisClient.hSet(getRedisPlayerKey(player.socketId), dbPlayer)
    } catch (err) {
        console.error(
            `DB error when setting player ${
                player.socketId
            } to be ${JSON.stringify(dbPlayer)}`
        )
        throw err
    }
}

/**
 * Removes given player from DB.
 *
 * @param socketId : ID of the socket connection used by the player
 */
export async function deletePlayer(socketId: string): Promise<void> {
    const player = await getPlayer(socketId)

    await deleteGuessResultHistory(socketId)
    await removePlayerFromList(socketId, player.roomId)
    try {
        await redisClient.del(getRedisPlayerKey(socketId))
    } catch (err) {
        console.error(`DB error when deleting player ${socketId}.`)
        throw err
    }
}

function getRedisPlayerKey(socketId: string): string {
    return `player:${socketId}`
}

/************************************************
 *                                              *
 *                  CRUD - GAMES                *
 *                                              *
 ************************************************/

type DbGame = Omit<Game, 'playerList' | 'leader' | 'chooser'> & {
    leader: string
    chooser: string
}

function getRedisGameKey(roomId: string): string {
    return `game:${roomId}`
}

/**
 * Creates a new Player entry in the DB.
 *
 * @param socketId : ID of the socket connection used by the player
 * @returns : new Game's roomId, or null if no rooms available
 */
export async function createGame(socketId: string): Promise<string> {
    const roomId = await getRandomRoomId()
    if (!roomId) return ''

    const newGame: DbGame = {
        roomId,
        leader: socketId,
        status: 'lobby',
        chooser: '',
        currentAnswer: '',
    }

    try {
        await redisClient.hSet(getRedisGameKey(roomId), newGame)
    } catch (err) {
        console.error(
            `DB error when creating game ${roomId} for player ${socketId}`
        )
        throw err
    }
    console.log(`Created game ${roomId}`)
    return roomId
}

/**
 * Retrieves given game from DB.
 *
 * @param roomId : ID of the room the game is being hosted in
 * @returns : Converted Game object
 */
export async function getGame(roomId: string): Promise<Game> {
    let game: DbGame | EmptyObject

    try {
        game = (await redisClient.hGetAll(getRedisGameKey(roomId))) as
            | DbGame
            | EmptyObject
    } catch (err) {
        console.log(`DB error when retrieving game ${roomId}`)
        throw err
    }

    if (Object.keys(game).length === 0)
        throw new Error(
            `Bad request: could not retrieve game ${roomId} from DB.`
        )

    const playerList = await getPlayerList(roomId)
    const leader = await getPlayer(game.leader)
    const chooser = game.chooser ? await getPlayer(game.chooser) : null

    return {
        ...(game as DbGame),
        roomId,
        leader,
        playerList,
        chooser,
    }
}

/**
 * Sets one of a game's fields to the given value
 *
 * Source for typing: https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript
 * @param roomId : ID of the room the game is being hosted in
 * @param field : field to update
 * @param value : value to save to field
 */
export async function updateGameField<
    K extends keyof Omit<DbGame, 'speedBonusWinner'>,
>(roomId: string, field: K, value: DbGame[K]): Promise<void> {
    try {
        await redisClient.hSet(getRedisGameKey(roomId), field, value)
    } catch (err) {
        console.error(
            `DB error when setting game ${roomId} field ${field} to value ${value}`
        )
        throw err
    }
    console.log(`Set game ${roomId} ${field} to ${value}`)
}

/**
 * Removes given Game from DB.
 *
 * @param roomId : ID of the room the Game is being hosted in
 */
async function deleteGame(roomId: string): Promise<void> {
    await deletePlayerList(roomId)
    await addRoomId(roomId)

    try {
        await redisClient.del(getRedisGameKey(roomId))
    } catch (err) {
        console.error(`DB error when deleting game ${roomId}.`)
        throw err
    }
}

export async function gameExists(roomId: string): Promise<boolean> {
    try {
        return (await redisClient.exists(getRedisGameKey(roomId))) > 0
    } catch (err) {
        console.error(`DB error when checking whether game ${roomId} exists.`)
        throw err
    }
}

/************************************************
 *                                              *
 *                CRUD - ROOM IDS               *
 *                                              *
 ************************************************/

const AVAILABLE_ROOM_IDS = 'availableRoomIds'

async function addRoomId(roomId: string): Promise<void> {
    try {
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId)
    } catch (err) {
        console.error(`DB error when adding roomID ${roomId}`)
        throw err
    }
}

async function getRandomRoomId(): Promise<string | null> {
    try {
        return (
            ((await redisClient.sPop(
                AVAILABLE_ROOM_IDS
            )) as unknown as string) ?? null
        )
    } catch (err) {
        console.error(`DB error when retrieving random roomId.`)
        throw err
    }
}

/**
 * Fills database with 10000 room IDs if not already filled.
 */
async function populateAvailableRoomIds(): Promise<void> {
    if ((await redisClient.sCard(AVAILABLE_ROOM_IDS)) >= 10000) {
        console.log('Not populating rooms')
        return
    }
    console.log('Populating rooms')
    for (let i: number = 0; i < 10000; i++) {
        const roomId: string = i.toString().padStart(4, '0')
        await redisClient.sAdd(AVAILABLE_ROOM_IDS, roomId)
    }
}

/************************************************
 *                                              *
 *                  CRUD - GUESS                *
 *                                              *
 ************************************************/

function getRedisHistoryKey(socketId: string): string {
    return `guessResultHistory:${socketId}`
}

function serializeGuessResult(guessResult: Result[]): string {
    return guessResult.join(' ')
}

function deserializeGuessResult(guessResultSerialized: string): string[] {
    return guessResultSerialized.split(' ')
}

/**
 * Record a guess result for the given player.
 *
 * @param socketId : ID of the socket connection used by the player
 * @param guessResult : List of eval results corresponding to each letter of guess
 */
export async function createGuessResult(
    socketId: string,
    guessResult: Result[]
): Promise<void> {
    const serialized = serializeGuessResult(guessResult)

    try {
        await redisClient.rPush(getRedisHistoryKey(socketId), serialized)
    } catch (err) {
        console.error(
            `DB error when adding guess result ${guessResult} for player ${socketId}`
        )
        throw err
    }
}

/**
 * Returns given Player's guess result history.
 * @param socketId : ID of the socket connection used by the player
 * @returns : Player's guess result history, or [] if not found.
 */
async function getGuessResultHistory(socketId: string): Promise<Result[][]> {
    try {
        const history = await redisClient.lRange(
            getRedisHistoryKey(socketId),
            0,
            -1
        )
        return history.map((guessResult) =>
            deserializeGuessResult(guessResult)
        ) as Result[][]
    } catch (err) {
        console.error(
            `DB error when retrieving guessResultHistory for player ${socketId}`
        )
        throw err
    }
}

async function deleteGuessResultHistory(socketId: string): Promise<void> {
    try {
        await redisClient.del(getRedisHistoryKey(socketId))
    } catch (err) {
        console.error(`DB error when deleting guessResultHistory ${socketId}`)
        throw err
    }
}

/************************************************
 *                                              *
 *              CRUD - PLAYERLISTS              *
 *                                              *
 ************************************************/

function getRedisPlayerListKey(roomId: string): string {
    return `playerList:${roomId}`
}

function getRedisChooserListKey(roomId: string): string {
    return `chooserList:${roomId}`
}

function getRedisSolvedListKey(roomId: string): string {
    return `solvedList:${roomId}`
}

/**
 * Retrieve the list of players in the given room.
 *
 * @param roomId : ID of the room the game is being hosted in
 * @returns : record of Player objects within given room keyed on socketId
 */
async function getPlayerList(roomId: string): Promise<Record<string, Player>> {
    let playerIdList: string[]
    try {
        playerIdList = await redisClient.sUnion([
            getRedisPlayerListKey(roomId),
            getRedisChooserListKey(roomId),
        ])
    } catch (err) {
        console.error(`DB error when retrieving playerList for game ${roomId}`)
        throw err
    }

    const output: Record<string, Player> = {}
    for (const socketId of playerIdList) {
        const player = await getPlayer(socketId)
        output[socketId] = player
    }
    return output
}

/**
 * Get a random Player from the given playerList to choose the next word. Adds them to chooserList.
 * @param roomId : ID of the room containing the Players
 * @returns : Random member Player
 */
export async function getRandomChooserFromList(
    roomId: string
): Promise<Player> {
    let chooserId: string | null
    try {
        chooserId = (await redisClient.sPop(
            getRedisPlayerListKey(roomId)
        )) as unknown as string | null
    } catch (err) {
        console.error(
            `DB error when finding random chooser from playerList ${roomId}`
        )
        throw err
    }
    if (!chooserId)
        throw new Error(
            `Invalid state: random chooser requested for game ${roomId}, no players remain in list.`
        )
    await addPlayerToChooserList(chooserId, roomId)

    return await getPlayer(chooserId)
}

export async function getFirstSolver(roomId: string): Promise<Player> {
    let firstSolverId: string | null
    try {
        firstSolverId = await redisClient.lIndex(
            getRedisSolvedListKey(roomId),
            0
        )
    } catch (err) {
        console.error(
            `DB error when retrieving first solver from list ${roomId}`
        )
        throw err
    }
    if (!firstSolverId)
        throw new Error(
            `Invalid state: getFirstSolver called for game ${roomId} with empty solvedList.`
        )

    return await getPlayer(firstSolverId)
}

/**
 * Adds Player to the Game's playerList.
 *
 * @param socketId :  ID of the socket connection of the Player
 * @param roomId : ID of the room containing the Players
 */
export async function addPlayerToList(
    socketId: string,
    roomId: string
): Promise<void> {
    try {
        await redisClient.sAdd(getRedisPlayerListKey(roomId), socketId)
    } catch (err) {
        console.error(
            `DB error when adding player ${socketId} to playerList ${roomId}`
        )
        throw err
    }
}

/**
 * Adds Player to the chooserList.
 *
 * @param socketId :  ID of the socket connection of the Player
 * @param roomId : ID of the room containing the Players
 */
async function addPlayerToChooserList(
    socketId: string,
    roomId: string
): Promise<void> {
    try {
        await redisClient.sAdd(getRedisChooserListKey(roomId), socketId)
    } catch (err) {
        console.error(
            `DB error when marking ${socketId} as chooser in playerL:ist ${roomId}`
        )
        throw err
    }
}

/**
 * Appends a Player to the solvedList. Index 0 = first Player to solve this round
 * @param socketId :  ID of the socket connection of the Player
 * @param roomId : ID of the room containing the Players
 */
export async function addPlayerToSolvedList(
    socketId: string,
    roomId: string
): Promise<void> {
    try {
        await redisClient.rPush(getRedisSolvedListKey(roomId), socketId)
    } catch (err) {
        console.error(
            `DB error when adding player ${socketId} to solved list ${roomId}`
        )
        throw err
    }
}

/**
 * Resets 'solved' status for every player in list and deletes each guessResultHistory
 *
 * @param roomId : ID of the room containing the Players
 */
export async function resetPlayersFinished(roomId: string): Promise<void> {
    const playerList = await getPlayerList(roomId)
    for (const player of Object.values(playerList)) {
        player.finished = false
        await updatePlayer(player)
        await deleteGuessResultHistory(player.socketId)
    }
    try {
        await redisClient.del(getRedisSolvedListKey(roomId))
    } catch (err) {
        console.error(`DB error when deleting solvedList ${roomId}`)
        throw err
    }
}

/**
 * Removes given player from all lists, and handles cleanup in DB.
 *
 * @param socketId :  ID of the socket connection of the Player
 * @param roomId : ID of the room containing the Players
 * @returns
 */
async function removePlayerFromList(
    socketId: string,
    roomId: string
): Promise<void> {
    try {
        await redisClient.sRem(getRedisPlayerListKey(roomId), socketId)
        await redisClient.sRem(getRedisChooserListKey(roomId), socketId)
        await redisClient.lRem(getRedisSolvedListKey(roomId), 0, socketId)
    } catch (err) {
        console.error(
            `DB error when removing player ${socketId} from playerList ${roomId}`
        )
        throw err
    }

    const gameIsEmpty = await deleteGameIfListEmpty(roomId)
    if (!gameIsEmpty) {
        await replaceLeaderIfRemoved(socketId, roomId)
    }
}

async function deletePlayerList(roomId: string): Promise<void> {
    try {
        await redisClient.del(getRedisPlayerListKey(roomId))
        await redisClient.del(getRedisChooserListKey(roomId))
        await redisClient.del(getRedisSolvedListKey(roomId))
    } catch (err) {
        console.error(`DB error when deleting playerList ${roomId}`)
        throw err
    }
}

/**
 * Check if playerList is empty. Delete game and return true if empty, else return false.
 * @param roomId : ID of the room containing the Players
 * @returns : true if game deleted, else false
 */
async function deleteGameIfListEmpty(roomId: string): Promise<boolean> {
    try {
        if (await redisClient.exists(getRedisPlayerListKey(roomId))) {
            return false
        }
    } catch (err) {
        console.error(`DB error when checking if playerList ${roomId} exists`)
        throw err
    }
    console.log(`List empty, deleting game ${roomId}`)
    await deleteGame(roomId)
    return true
}

async function replaceLeaderIfRemoved(
    removedSocketId: string,
    roomId: string
): Promise<void> {
    let newLeaderId: string | null
    const game = await getGame(roomId)

    if (removedSocketId !== game.leader.socketId) return

    // Leader deleted, replace leader
    console.log(
        `Player ${game.leader.socketId} was the leader, need replacement.`
    )
    try {
        newLeaderId = await redisClient.sRandMember(
            getRedisPlayerListKey(roomId)
        )
    } catch (err) {
        console.error(
            `DB error when retrieving new leaderId for game ${roomId}`
        )
        throw err
    }

    if (!newLeaderId)
        throw new Error(
            `Invalid state: replaceLeader called on game ${roomId} with empty playerList`
        )

    await updateGameField(roomId, 'leader', newLeaderId)
}
