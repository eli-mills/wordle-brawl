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
    MAX_NUM_GUESSES,
} from './constants.js'

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
    const player = await db.getPlayer(socket.id)

    // Delete player from db
    console.log(`Player ${socket.id} disconnected`)
    await db.deletePlayer(socket.id)

    await emitUpdatedGameState(player.roomId)
}

async function onCreateGameRequest(socket: Socket): Promise<void> {
    console.log(`Player ${socket.id} requests new game`)

    const newRoomId = await db.createGame(socket.id)
    if (!newRoomId) {
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
    console.log(`Player ${socket.id} requests to join room ${roomId}`)

    const player = await db.getPlayer(socket.id)
    if (!player)
        throw new Error(
            `Invalid state: player ${socket.id} could not be retrieved but requests to join room ${roomId}`
        )

    if (!(await db.gameExists(roomId))) {
        console.log(`Game ${roomId} does not exist`)
        socket.emit(GameEvents.GAME_DNE)
        return
    }

    // Join room
    socket.join(roomId)
    player.roomId = roomId
    await db.updatePlayer(player)

    // Add player to game's playerList
    await db.addPlayerToList(socket.id, roomId)

    console.log(`Player ${socket.id} successfully joined room ${roomId}`)
    await emitUpdatedGameState(roomId)
}

async function onDeclareName(
    socket: Socket,
    name: string,
    callback: (result: { accepted: boolean; duplicate: boolean }) => void
) {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player.roomId)

    // Check for duplicate name
    const playerNames = Object.values(game.playerList).map(
        (player) => player.name
    )
    if (playerNames.includes(name)) {
        console.log(
            `Duplicate name not allowed: player ${socket.id} requests ${name}`
        )
        callback({ accepted: false, duplicate: true })
        return
    }

    // Update name
    console.log(`Name received: ${name}. Writing to db.`)
    player.name = name
    await db.updatePlayer(player)

    // Response
    callback({ accepted: true, duplicate: false })
    await emitUpdatedGameState(player.roomId)
}

async function onGuess(socket: Socket, guess: string): Promise<void> {
    console.log(`Guess received: ${guess}`)
    const player = await db.getPlayer(socket.id)
    if (!player)
        throw new Error(
            `Invalid state: socket ${socket.id} submitted guess ${guess} without existing Player in DB.`
        )

    // Evaluate result
    const result = await evaluateGuess(guess, player.roomId)

    result.resultByPosition &&
        (await db.createGuessResult(player.socketId, result.resultByPosition))

    if (result.accepted) {
        await rewardPointsToChooser(socket)
    }

    // Handle solve
    if (result.correct) {
        await db.addPlayerToSolvedList(player.socketId, player.roomId)
        player.finished = true
        await db.updatePlayer(player)
        rewardPointsToPlayer(socket)
    } else {
        await checkPlayerLastGuess(socket)
    }

    // Handle new round
    if (await allPlayersHaveSolved(player.roomId)) {
        await resetForNewRound(player.roomId)
    }

    // Send state
    console.log('Sending results')
    socket.emit(GameEvents.EVALUATION, result)
    await emitUpdatedGameState(player.roomId)
}

async function onBeginGameRequest(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>
): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player.roomId)
    if (socket.id !== game.leader.socketId) return // Requestor is not the game leader

    await db.updateGameField(player.roomId, 'status', 'choosing')
    const chooser = await db.getRandomChooserFromList(player.roomId)
    await db.updateGameField(player.roomId, 'chooser', chooser.socketId)

    io.to(player.roomId).emit(GameEvents.BEGIN_GAME)
    await emitUpdatedGameState(player.roomId)
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
    const player = await db.getPlayer(socket.id)
    await db.updateGameField(player.roomId, 'status', 'playing')
    await db.updateGameField(player.roomId, 'currentAnswer', word)
    await emitUpdatedGameState(player.roomId)
}

/************************************************
 *                                              *
 *                    HELPERS                   *
 *                                              *
 ************************************************/

async function emitUpdatedGameState(roomId: string): Promise<void> {
    if (!(await db.gameExists(roomId))) return
    const gameStateData = await db.getGame(roomId)
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData)
}

async function validateAnswerWord(word: string): Promise<boolean> {
    const validator = new FileWordValidator(ALLOWED_ANSWERS_PATH)
    return await validator.validateWord(word)
}

/**
 * Adds points to given Player and saves to DB.
 *
 * @param player: Player object to mutate
 */
async function rewardPointsToPlayer(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    if (player.guessResultHistory.length === 0)
        throw new Error(
            `Invalid state: player ${player.socketId} is being rewarded points with no guesses for game ${player.roomId}`
        )

    // Add efficiency points
    const efficiencyPoints = EFFICIENCY_POINTS[player.guessResultHistory.length]
    player.score += efficiencyPoints

    // Add speed bonus
    const firstSolver = await db.getFirstSolver(player.roomId)
    if (firstSolver.socketId === player.socketId) {
        player.score += SPEED_BONUS
    }
    await db.updatePlayer(player)
}

async function allPlayersHaveSolved(roomId: string): Promise<boolean> {
    const game = await db.getGame(roomId)
    if (game.status !== 'playing')
        throw new Error(
            `Invalid state: checking if game ${roomId} with status ${game.status}`
        )

    return (
        Object.values(game.playerList).filter(
            (player) =>
                player.socketId !== game.chooser?.socketId && !player.finished
        ).length === 0
    )
}

async function resetForNewRound(roomId: string): Promise<void> {
    if (!(await db.gameExists(roomId)))
        throw new Error(
            `Invalid state: tried to reset game ${roomId} which doesn't exist.`
        )

    await db.updateGameField(roomId, 'status', 'choosing')
    await db.resetPlayersFinished(roomId)

    // TODO: check if last round
    const chooser = await db.getRandomChooserFromList(roomId)
    await db.updateGameField(roomId, 'chooser', chooser.socketId)
}

async function rewardPointsToChooser(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player?.roomId ?? '')

    if (!game.chooser)
        throw new Error(
            `Invalid state: rewarding points to chooser for game ${game.roomId} which has no chooser`
        )
    if (player.socketId === game.chooser.socketId)
        throw new Error(
            `Invalid state: player ${socket.id} is a guesser and chooser in game ${game.roomId}`
        )

    if (player.guessResultHistory.length <= 1) return // No points for chooser if player guessed on first try

    const maxGuesses = 5 * (Object.keys(game.playerList).length - 1)
    const pointsPerGuess = MAX_CHOOSER_POINTS / maxGuesses
    game.chooser.score += pointsPerGuess

    await db.updatePlayer(game.chooser)
}

async function checkPlayerLastGuess(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    if (player.guessResultHistory.length >= MAX_NUM_GUESSES) {
        console.log(`Player ${player.socketId} struck out!`)
        player.finished = true
        await db.updatePlayer(player)
    }
}
