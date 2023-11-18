import { Player } from "../../../common";

export default function PlayerStatsCard({player}: {player: Player}) {
    return (
        <div>
            <h1>{player.name}</h1>
            <h2>Score: {player.score}</h2>
        </div>
    )
}