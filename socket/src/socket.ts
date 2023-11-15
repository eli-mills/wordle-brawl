import { Socket, Server } from 'socket.io'
import { createServer } from 'http'
import * as db from './db.js'
import {
    GameEvents,
    ClientToServerEvents,
    ServerToClientEvents,
} from '../../common/dist/index.js'
import {
    evaluateGuess,
    FileWordValidator,
    ALLOWED_ANSWERS_PATH,
} from './evaluation.js'
import {
    EFFICIENCY_POINTS,
    SPEED_BONUS,
    MAX_CHOOSER_POINTS,
} from './point-values.js'

/************************************************
 *                                              *
 *                CONFIGURATION                 *
 *                                              *
 ************************************************/

// Instantiate socket server
export const httpServer = createServer()
export const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
        cors: {
            origin: process.env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
    }
)

// Configure socket event listeners
io.on('connection', async (newSocket) => {
    console.log(`User ${newSocket.id} connected.`)
    await db.createPlayer(newSocket.id)
    newSocket.on(GameEvents.REQUEST_NEW_GAME, () =>
        onCreateGameRequest(newSocket)
    )
    newSocket.on(GameEvents.REQUEST_JOIN_GAME, (roomId: string) =>
        onJoinGameRequest(newSocket, roomId)
    )
    newSocket.on(
        GameEvents.DECLARE_NAME,
        (
            name: string,
            callback: (result: {
                accepted: boolean
                duplicate: boolean
            }) => void
        ) => onDeclareName(newSocket, name, callback)
    )
    newSocket.on(GameEvents.GUESS, (guess: string) => onGuess(newSocket, guess))
    newSocket.on('disconnect', () => onDisconnect(newSocket))
    newSocket.on(GameEvents.REQUEST_BEGIN_GAME, () =>
        onBeginGameRequest(newSocket)
    )
    newSocket.on(GameEvents.CHECK_CHOSEN_WORD_VALID, onCheckChosenWordValid)
    newSocket.on(GameEvents.CHOOSE_WORD, (word: string) =>
        onChooseWord(newSocket, word)
    )
})

/************************************************
 *                                              *
 *                EVENT LISTENERS               *
 *                                              *
 ************************************************/

async function onDisconnect(socket: Socket): Promise<void> {
    // Get player room
    const roomId = await db.getPlayerRoomId(socket.id)

    // Delete player from db
    console.log(`Player ${socket.id} disconnected`)
    await db.deletePlayer(socket.id)

    emitUpdatedGameState(roomId)
}

async function onCreateGameRequest(socket: Socket): Promise<void> {
    console.log('Create game request received')

    const newRoomId = await db.createGame(socket.id)
    if (newRoomId === null) {
        socket.emit(GameEvents.NO_ROOMS_AVAILABLE)
        return
    }

    socket.emit(GameEvents.NEW_GAME_CREATED, newRoomId)
    await emitUpdatedGameState(newRoomId)
}

async function onJoinGameRequest(
    socket: Socket,
    roomId: string
): Promise<void> {
    console.log(`Player ${socket.id} request to join room ${roomId}`)
    if (!(await db.gameExists(roomId))) {
        console.log(`Game ${roomId} does not exist`)
        socket.emit(GameEvents.GAME_DNE)
        return
    }

    socket.join(roomId)
    console.log(`Player ${socket.id} successfully joined room ${roomId}`)
    await db.updatePlayerRoom(socket.id, roomId)
    await emitUpdatedGameState(roomId)
}

async function onDeclareName(
    socket: Socket,
    name: string,
    callback: (result: { accepted: boolean; duplicate: boolean }) => void
) {
    const player = await db.getPlayer(socket.id)
    const roomId = await db.getPlayerRoomId(socket.id)
    const game = await db.getGame(roomId)

    if (!player || !game)
        throw new Error(
            `Invalid state: player or game missing when declaring name ${name} for player ${socket.id}`
        )

    // Check for duplicate name
    const playerNames = Object.values(game.playerList).map(
        (player) => player.name
    )
    if (playerNames.includes(name)) {
        console.log(
            `Duplicate name not allowed: player ${socket.id} requests ${name}`
        )
        callback({accepted: false, duplicate: true})
        return
    }

    // Update name
    console.log(`Name received: ${name}. Writing to db.`)
    player.name = name
    await db.updatePlayer(player)

    // Response
    callback({accepted: true, duplicate: false})
    await emitUpdatedGameState(roomId)
}

async function onGuess(socket: Socket, guess: string): Promise<void> {
    console.log(`Guess received: ${guess}`)

    // Evaluate result
    const roomId = await db.getPlayerRoomId(socket.id)
    const result = await evaluateGuess(guess, roomId)

    result.resultByPosition &&
        (await db.createGuessResult(socket.id, result.resultByPosition))

    if (result.accepted) {
        await rewardPointsToChooser(socket)
    }

    // Handle solve
    if (result.correct) {
        await rewardPointsToPlayer(socket)
        if (await allPlayersHaveSolved(roomId)) {
            await resetForNewRound(roomId)
        }
    }

    console.log('Sending results')
    socket.emit(GameEvents.EVALUATION, result)
    await emitUpdatedGameState(await db.getPlayerRoomId(socket.id))
}

async function onBeginGameRequest(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>
): Promise<void> {
    const roomId = await db.getPlayerRoomId(socket.id)
    if (socket.id !== (await db.getGameLeader(roomId))) return // Requestor is not the game leader

    await db.setGameStatusChoosing(roomId)
    await emitUpdatedGameState(roomId)

    io.to(roomId).emit(GameEvents.BEGIN_GAME)
}

async function onCheckChosenWordValid(
    word: string,
    callback: (isValid: boolean) => void
): Promise<void> {
    const wordIsValid = await validateAnswerWord(word)
    callback(wordIsValid)
}

async function onChooseWord(socket: Socket, word: string): Promise<void> {
    const wordIsValid = await validateAnswerWord(word)
    if (!wordIsValid) {
        console.error(
            `Socket server error: player ${socket} submitted invalid answer word ${word}`
        )
        return
    }
    const roomId = await db.getPlayerRoomId(socket.id)
    await db.setGameStatusPlaying(roomId, word)
    await emitUpdatedGameState(roomId)
}

/************************************************
 *                                              *
 *                    HELPERS                   *
 *                                              *
 ************************************************/

async function emitUpdatedGameState(roomId: string): Promise<void> {
    const gameStateData = await db.getGame(roomId)
    if (gameStateData === null) return
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData)
}

async function validateAnswerWord(word: string): Promise<boolean> {
    const validator = new FileWordValidator(ALLOWED_ANSWERS_PATH)
    return await validator.validateWord(word)
}

/**
 * Rewards points and updates state after Player solves game.
 *
 * @param socket
 */
async function rewardPointsToPlayer(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    if (!player || player.guessResultHistory.length === 0) return

    const roomId = await db.getPlayerRoomId(socket.id)
    const game = await db.getGame(roomId)

    // Add efficiency points
    const efficiencyPoints = EFFICIENCY_POINTS[player.guessResultHistory.length]
    await db.addToPlayerScore(socket.id, efficiencyPoints)

    // Add speed bonus
    if (!game) return
    if (!game.speedBonusWinner) {
        game.speedBonusWinner = player
        await db.addToPlayerScore(socket.id, SPEED_BONUS)
        await db.updateGame(game)
    }

    await db.setPlayerHasSolved(socket.id, 'true')
}

async function allPlayersHaveSolved(roomId: string): Promise<boolean> {
    const game = await db.getGame(roomId)
    if (!game || game.status !== 'playing') return false

    return (
        Object.values(game.playerList).filter(
            (player) =>
                player.socketId !== game.chooser?.socketId && !player.solved
        ).length === 0
    )
}

async function resetForNewRound(roomId: string): Promise<void> {
    await db.setGameStatusChoosing(roomId)
    const game = await db.getGame(roomId)
    if (game) {
        game.speedBonusWinner = null
        await db.updateGame(game)
    }
    await db.resetPlayersSolved(roomId)
}

async function rewardPointsToChooser(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player?.roomId ?? '')

    if (!player || !game || !game.chooser) return

    if (player.guessResultHistory.length <= 1) return

    const maxGuesses = 5 * (Object.keys(game.playerList).length - 1)
    const pointsPerGuess = MAX_CHOOSER_POINTS / maxGuesses

    await db.addToPlayerScore(game.chooser.socketId, pointsPerGuess)
}
