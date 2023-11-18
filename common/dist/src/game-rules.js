import { MIN_PLAYERS, MAX_PLAYERS } from "./game-parameters.js";
export function gameCanStart(game) {
    const playersWithinLimits = Object.keys(game.playerList).length >= MIN_PLAYERS &&
        Object.keys(game.playerList).length <= MAX_PLAYERS;
    const players = Object.keys(game.playerList).map((socketId) => game.playerList[socketId]);
    const allPlayersNamed = players.filter((player) => !player.name).length === 0;
    return playersWithinLimits && allPlayersNamed;
}
