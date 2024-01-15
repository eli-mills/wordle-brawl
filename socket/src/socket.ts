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
    NewGameRequestResponse,
    gameCanStart,
    Game,
} from '../../common/dist/index.js'
import { evaluateGuess, FileWordValidator } from './evaluation.js'
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
    newSocket.on(
        GameEvents.REQUEST_NEW_GAME,
        (callback: (response: NewGameRequestResponse) => void) =>
            onCreateGameRequest(newSocket, callback)
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
    newSocket.on(GameEvents.SAY_HELLO, onSayHello)
    newSocket.on(GameEvents.REQUEST_GAME_STATE, () =>
        onRequestGameState(newSocket)
    )
})

/************************************************
 *                                              *
 *                EVENT LISTENERS               *
 *                                              *
 ************************************************/
function onSayHello(callback: () => void) {
    console.log('say-hello event received')
    callback()
}

async function onDisconnect(socket: Socket): Promise<void> {
    // Get player room
    const player = await db.getPlayer(socket.id)

    // Delete player from db
    console.log(`Player ${socket.id} disconnected`)
    await db.deletePlayer(socket.id)
    console.log(
        `Deleted player ${socket.id}, sending updated game state to room ${player.roomId}`
    )
    await startNextRoundIfReady(player.roomId)
    await emitGameStateToRoom(player.roomId)
}

async function onCreateGameRequest(
    socket: Socket,
    callback: (response: NewGameRequestResponse) => void
): Promise<void> {
    console.log(`Player ${socket.id} requests new game`)

    const newRoomId = await db.createGame(socket.id)
    if (!newRoomId) {
        callback({ roomsAvailable: false, roomId: '' })
        return
    }

    callback({ roomsAvailable: true, roomId: newRoomId })
    await emitGameStateToRoom(newRoomId)
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
    await emitGameStateToRoom(roomId)
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
    await emitGameStateToRoom(player.roomId)
}

async function onRequestGameState(socket: Socket): Promise<void> {
    await emitGameStateToPlayer(socket)
}

async function onGuess(socket: Socket, guess: string): Promise<void> {
    console.log(`Guess received: ${guess}`)
    const player = await db.getPlayer(socket.id)
    if (!player)
        throw new Error(
            `Invalid state: socket ${socket.id} submitted guess ${guess} without existing Player in DB.`
        )

    // Evaluate result
    const validator = new FileWordValidator(
        FileWordValidator.ALLOWED_GUESSES_PATH
    )
    const result = await evaluateGuess(guess, player.roomId, validator)

    result.resultByPosition &&
        (await db.createGuessResult(player.socketId, result.resultByPosition))

    // Handle solve
    if (result.correct) {
        await db.addPlayerToSolvedList(player.socketId, player.roomId)
        player.status = 'finished'
        await db.updatePlayer(player)
        await rewardPointsToPlayer(socket)
    } else {
        await checkPlayerLastGuess(socket)
    }

    // Send state
    console.log('Sending results')
    socket.emit(GameEvents.EVALUATION, result)
    await emitGameStateToRoom(player.roomId)

    // Handle new round
    await startNextRoundIfReady(player.roomId)
    await emitGameStateToRoom(player.roomId)
}

async function onBeginGameRequest(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>
): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await db.getGame(player.roomId)

    // Validation
    if (socket.id !== game.leader.socketId) return // Requestor is not the game leader
    if (!gameCanStart(game)) return

    io.to(player.roomId).emit(GameEvents.BEGIN_GAME)

    await resetForNewRound(game.roomId)
    //await emitUpdatedGameState(game.roomId)
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
    await emitGameStateToRoom(player.roomId)
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
    await emitGameStateToRoom(game.roomId)
}

async function onRequestValidWord(
    callback: (validWord: string) => void
): Promise<void> {
    const validator = new FileWordValidator(
        FileWordValidator.ALLOWED_ANSWERS_PATH
    )
    const validWord = await validator.getRandomValidWord()
    callback(validWord)
}

/************************************************
 *                                              *
 *                    HELPERS                   *
 *                                              *
 ************************************************/

async function emitGameStateToRoom(roomId: string): Promise<void> {
    const gameStateData = await getGameIfExists(roomId)
    if (!gameStateData) return
    console.log(`Sending gameStateData to room ${roomId}`)
    console.log(
        `playerlist ${roomId} is ${JSON.stringify(
            Object.values(gameStateData.playerList).map((player) => player.name)
        )}`
    )
    io.to(roomId).emit(GameEvents.UPDATE_GAME_STATE, gameStateData)
}

async function emitGameStateToPlayer(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    const game = await getGameIfExists(player.roomId)
    if (!game) return
    socket.emit(GameEvents.UPDATE_GAME_STATE, game)
}

async function getGameIfExists(roomId: string): Promise<Game | null> {
    if (!(await db.gameExists(roomId))) return null
    return await db.getGame(roomId)
}

async function validateAnswerWord(word: string): Promise<boolean> {
    const validator = new FileWordValidator(
        FileWordValidator.ALLOWED_ANSWERS_PATH
    )
    return await validator.validateWord(word)
}

/**
 *
 * @param roomId ID of the room the Game is being hosted in
 * @returns true if all Players have solved the current round, false if not OR if game status not playing
 */
async function allPlayersHaveFinished(roomId: string): Promise<boolean> {
    if (!(await db.gameExists(roomId))) return false

    const game = await db.getGame(roomId)
    if (game.status !== 'playing') return false

    return (
        Object.values(game.playerList).filter(
            (player) =>
                player.socketId !== game.chooser?.socketId &&
                player.status === 'playing'
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
        player.status = 'finished'
        await db.updatePlayer(player)
    }
}

async function startNextRoundIfReady(roomId: string): Promise<void> {
    if (await allPlayersHaveFinished(roomId)) {
        await rewardPointsToChooser(roomId)
        await emitGameStateToRoom(roomId)
        await resetForNewRound(roomId)

        // Timeout for players to see their results
        await new Promise<void>((resolve) => setTimeout(resolve, 3000))
    }
}
