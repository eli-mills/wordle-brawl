import { Socket } from 'socket.io'
import { GameParameters, Player } from '../../common/dist/index.js'
import * as db from './db.js'

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
 * Adds points to the current choosing Player at end of round. Throws error if no chooser.
 *
 * @param roomId: the roomId of the game
 */
export async function rewardPointsToChooser(roomId: string): Promise<void> {
    const game = await db.getGame(roomId)

    if (!game.chooser) {
        console.log(`Game ${game.roomId} has no chooser. No points rewarded.`)
        return
    }
    const eligiblePlayers = Object.values(game.playerList).filter(
        (player) =>
            player.socketId !== game.chooser?.socketId &&
            player.status === 'finished'
    )
    const totalWrongGuesses = eligiblePlayers.reduce<number>(
        (runningTotal, player) => {
            return runningTotal + getNumberOfWrongGuesses(player)
        },
        0
    )
    const totalChooserPoints =
        calculateRoundChooserPoints(eligiblePlayers.length) * totalWrongGuesses
    console.log(`Chooser earned ${totalChooserPoints} points`)
    console.log(
        `Chooser new score: ${game.chooser.score} -> ${
            game.chooser.score + totalChooserPoints
        }`
    )
    game.chooser.score += totalChooserPoints

    await db.updatePlayer(game.chooser)
}

function getNumberOfWrongGuesses(player: Player): number {
    if (player.status != 'finished') return 0
    let numberOfGuesses = player.guessResultHistory.length
    const lastGuess = player.guessResultHistory[numberOfGuesses - 1]

    if (lastGuess.filter((result) => result != 'hit').length === 0) {
        // Last guess is correct
        numberOfGuesses--
    }
    return numberOfGuesses
}

function calculateRoundChooserPoints(numberEligiblePlayers: number): number {
    const maxGuesses = GameParameters.MAX_NUM_GUESSES * numberEligiblePlayers
    return GameParameters.MAX_CHOOSER_POINTS / maxGuesses
}
