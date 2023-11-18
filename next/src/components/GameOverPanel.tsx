import { useContext } from "react";
import { GlobalContext } from "@/pages/_app";
import { GameEvents } from "../../../common";
import PlayerStatsCard from "./PlayerStatsCard";

export default function GameOverPanel() {
  const { player, game, socket } = useContext(GlobalContext);

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      socket?.emit(GameEvents.START_OVER)
  };

  return (
    <div>
      <h1>Game Over</h1>
      {game &&
        Object.values(game.playerList).map((player) =>
          PlayerStatsCard({ player })
        )}
          {player && game && player.socketId === game.leader.socketId && <button onClick={onClick}>Play Again?</button>}
    </div>
  );
}
