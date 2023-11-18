import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { createContext, useState, useEffect } from 'react'
import { Socket } from 'socket.io-client';
import { GameEvents, Game, Player, ServerToClientEvents, ClientToServerEvents } from '../../../common';

interface GlobalContext {
    socket: Socket<ServerToClientEvents, ClientToServerEvents> | null,
    setSocket: (_: Socket) => void,
    game: Game | null,
    player: Player | null,
}

const initialGlobalContext: GlobalContext = {
    socket: null, 
    setSocket: ()=>{},
    game: null,
    player: null,
};

export const GlobalContext = createContext<GlobalContext>(initialGlobalContext);

export default function App({ Component, pageProps }: AppProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [game, setGame] = useState<Game | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);

    useEffect(()=> {
        socket?.on(GameEvents.UPDATE_GAME_STATE, (gameState: Game) => {
            setGame(gameState);
            setPlayer(gameState.playerList[socket.id])
        });

        // socket?.on(GameEvents.UPDATE_PLAYER, (player: Player) => {
        //     setPlayer(player);
        // });

        return () => {
            socket?.off(GameEvents.UPDATE_GAME_STATE);
            socket?.off(GameEvents.UPDATE_PLAYER);
        }
    }, [socket, game, player]);

    const globalState : GlobalContext = {
        socket, 
        setSocket, 
        game,
        player
    }

    return <GlobalContext.Provider value={{...globalState}}><Component {...pageProps} /></GlobalContext.Provider>
}
