import { Socket } from "socket.io"
import { GameParameters } from '../../common/dist/index.js'
import * as db from "./db.js"

/**
 * Adds points to given Player and saves to DB.
 *
 * @param socket: the socket used by the Player to be rewarded
 */
export async function rewardPointsToPlayer(socket: Socket): Promise<void> {
    const player = await db.getPlayer(socket.id)
    if (player.guessResultHistory.length === 0)
        throw new Error(
            `Invalid state: player ${player.socketId} is being rewarded points with no guesses for game ${player.roomId}`
        )

    // Add efficiency points
    const efficiencyPoints =
        GameParameters.EFFICIENCY_POINTS[player.guessResultHistory.length]
    player.score += efficiencyPoints

    // Add speed bonus
    const game = await db.getGame(player.roomId)
    if (Object.keys(game.playerList).length > 2) {
        const firstSolver = await db.getFirstSolver(player.roomId)
        if (firstSolver.socketId === player.socketId) {
            player.score += GameParameters.SPEED_BONUS
        }
    }

    await db.updatePlayer(player)
}

/**
 * Adds points to the current choosing Player after guess
 *
 * @param socket: the socket used by the Player currently guessing
 */
export async function rewardPointsToChooser(socket: Socket): Promise<void> {
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

    const maxGuesses = 6 * (Object.keys(game.playerList).length - 1)
    const pointsPerGuess = GameParameters.MAX_CHOOSER_POINTS / maxGuesses
    game.chooser.score += pointsPerGuess

    await db.updatePlayer(game.chooser)
}