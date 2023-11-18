import Head from "next/head";
import { useRouter } from "next/router";
import { GlobalContext } from "./_app";
import { useEffect, useContext, useState } from "react";
import { GameEvents, GameParameters } from "../../../common";
import NameModal from "@/components/NameModal";

export default function LobbyPage() {
  const { socket, player, game } = useContext(GlobalContext);
  const router = useRouter();
  const { room: queryRoom } = router.query as { room: string };
  const [displayModal, setDisplayModal] = useState<boolean>(true);

  useEffect(() => {
    queryRoom &&
        socket?.emit(GameEvents.REQUEST_JOIN_GAME, queryRoom, (response) => {
            switch (response) {
                case "DNE":
                    alert("The requested game does not exist.");
                    router.push("/");
                    break;
                case "MAX":
                    alert("The requested game is full.");
                    router.push("/");
                    break;
          }
      });
  }, [queryRoom, router, socket]);

  useEffect(() => {
    socket?.on(GameEvents.BEGIN_GAME, () => {
      router.push("/game");
    });

    return () => {
      socket?.off(GameEvents.BEGIN_GAME);
    };
  }, [router, socket]);

  return (
    <>
      <Head>
        <title>Wordle WS</title>
      </Head>
      <main>
        {socket && (
          <div>
            <h1>Room {game?.roomId}</h1>
            <ul>
              {game?.playerList &&
                Object.values(game.playerList).map((currPlayer, index) => (
                  <li key={index}>{currPlayer.name}</li>
                ))}
            </ul>
            {displayModal && <NameModal setDisplayModal={setDisplayModal} />}
            {player?.name &&
              player?.socketId === game?.leader.socketId &&
              !(
                Object.keys(game?.playerList).length <
                GameParameters.MIN_PLAYERS
              ) &&
              !(
                Object.keys(game?.playerList).length >
                GameParameters.MAX_PLAYERS
              ) && (
                <button
                  onClick={() => socket?.emit(GameEvents.REQUEST_BEGIN_GAME)}
                >
                  Start Game
                </button>
              )}
          </div>
        )}
        {!socket && <h1>NOT CONNECTED</h1>}
      </main>
    </>
  );
}
