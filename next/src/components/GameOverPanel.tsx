import { useContext } from "react";
import { GlobalContext } from "@/pages/_app";
import PlayerStatsCard from "./PlayerStatsCard";

export default function GameOverPanel() {
    const { game } = useContext(GlobalContext)

    return (
        <div>
            <h1>Game Over</h1>
            { game && Object.values(game.playerList).map(player => PlayerStatsCard({player})) }
        </div>
    )
}