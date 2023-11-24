import { Socket, Server } from 'socket.io'
import { createServer } from 'http'
import * as db from './db.js'
import {
    GameEvents,
    ClientToServerEvents,
    ServerToClientEvents,
    GameParameters,
    JoinRequestResponse,
    DeclareNameResponse,
    gameCanStart,
} from '../../common/dist/index.js'
import {
    evaluateGuess,
    FileWordValidator,
    ALLOWED_ANSWERS_PATH,
} from './evaluation.js'
import { rewardPointsToChooser, rewardPointsToPlayer } from './reward-points.js'

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
    newSocket.on(
        GameEvents.REQUEST_JOIN_GAME,
        (roomId: string, callback: (response: JoinRequestResponse) => void) =>
            onJoinGameRequest(newSocket, roomId, callback)
    )
    newSocket.on(
        GameEvents.DECLARE_NAME,
        (name: string, callback: (result: DeclareNameResponse) => void) =>
            onDeclareName(newSocket, name, callback)
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
    newSocket.on(GameEvents.START_OVER, () => onStartOver(newSocket))
    newSocket.on(GameEvents.REQUEST_VALID_WORD, onRequestValidWord)
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
    roomId: string,
    callback: (response: JoinRequestResponse) => void
): Promise<void> {
    console.log(`Player ${socket.id} requests to join room ${roomId}`)

    const player = await db.getPlayer(socket.id)

    if (!(await db.gameExists(roomId))) {
        console.log(`Game ${roomId} does not exist`)
        return callback('DNE')
    }

    const game = await db.getGame(roomId)
    if (Object.keys(game.playerList).length >= GameParameters.MAX_PLAYERS) {
        console.log(`Game ${roomId} is full.`)
        return callback('MAX')
    }

    // Join room
    socket.join(roomId)
    player.roomId = roomId
    await db.updatePlayer(player)

    // Add player to game's playerList
    await db.addPlayerToList(socket.id, roomId)

    console.log(`Player ${socket.id} successfully joined room ${roomId}`)
    await emitUpdatedGameState(roomId)
    return callback('OK')
}

async function onDeclareName(
    socket: Socket,
    name: string,
    callback: (result: DeclareNameResponse) => void
) {
    if (!/\S/.test(name)) {
        console.log(`Player ${socket.id} declared empty name.`)
        return callback('EMPTY')
    }

    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player.roomId)

    // Check for duplicate name
    const playerNames = Object.values(game.playerList)
        .filter((player) => player.socketId !== socket.id)
        .map((player) => player.name)
    if (playerNames.includes(name)) {
        console.log(
            `Duplicate name not allowed: player ${socket.id} requests ${name}`
        )
        callback('DUP')
        return
    }

    // Update name
    console.log(`Name received: ${name}. Writing to db.`)
    player.name = name
    await db.updatePlayer(player)

    // Response
    callback('OK')
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
        await rewardPointsToPlayer(socket)
    } else {
        await checkPlayerLastGuess(socket)
    }

    // Send state
    console.log('Sending results')
    socket.emit(GameEvents.EVALUATION, result)
    await emitUpdatedGameState(player.roomId)

    // Handle new round
    if (await allPlayersHaveSolved(player.roomId)) {
        await resetForNewRound(player.roomId)
        await new Promise<void>((resolve) => setTimeout(resolve, 5000))
        await emitUpdatedGameState(player.roomId)
    }
}

async function onBeginGameRequest(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>
): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player.roomId)

    // Validation
    if (socket.id !== game.leader.socketId) return // Requestor is not the game leader
    if (!gameCanStart(game)) return

    const chooser = await db.getRandomChooserFromList(player.roomId)
    if (!chooser)
        throw new Error(
            `Invalid state: game ${game.roomId} starting without any available choosers.`
        )
    game.status = 'choosing'
    game.chooser = chooser
    await db.updateGame(game)

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

    const game = await db.getGame(player.roomId)
    game.status = 'playing'
    game.currentAnswer = word
    await db.updateGame(game)
    await emitUpdatedGameState(player.roomId)
}

async function onStartOver(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player.roomId)

    for (const player of Object.values(game.playerList)) {
        player.score = 0
        await db.updatePlayer(player)
    }

    await db.resetChoosersForNewGame(game.roomId)
    await resetForNewRound(game.roomId)
    await emitUpdatedGameState(game.roomId)
}

async function onRequestValidWord(
    callback: (validWord: string) => void
): Promise<void> {
    const validator = new FileWordValidator(ALLOWED_ANSWERS_PATH)
    const validWord = await validator.getRandomValidWord()
    callback(validWord)
}

/************************************************
 *                                              *
 *                    HELPERS                   *
 *                                              *
 ************************************************/

async function emitUpdatedGameState(roomId: string): Promise<void> {
    if (!(await db.gameExists(roomId))) return
    const gameStateData = await db.getGame(roomId)
    console.log(`Sending gameStateData to room ${roomId}`)
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData)
}

async function validateAnswerWord(word: string): Promise<boolean> {
    const validator = new FileWordValidator(ALLOWED_ANSWERS_PATH)
    return await validator.validateWord(word)
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
    await db.resetPlayersFinished(roomId)

    const chooser = await db.getRandomChooserFromList(roomId)
    const game = await db.getGame(roomId)

    if (chooser) {
        game.status = 'choosing'
        game.chooser = chooser
    } else {
        game.status = 'end'
    }
    await db.updateGame(game)
}

async function checkPlayerLastGuess(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    if (player.guessResultHistory.length >= GameParameters.MAX_NUM_GUESSES) {
        console.log(`Player ${player.socketId} struck out!`)
        player.finished = true
        await db.updatePlayer(player)
    }
}
