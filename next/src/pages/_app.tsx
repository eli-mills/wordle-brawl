import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { createContext, useState, useEffect } from 'react'
import { Socket } from 'socket.io-client'
import {
    GameEvents,
    Game,
    Player,
    ServerToClientEvents,
    ClientToServerEvents,
} from '../../../common'
import NavBar from '@/components/NavBar'

interface GlobalContext {
    socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
    setSocket: (_: Socket | null) => void
    game: Game | null
    setGame: (_: Game | null) => void
    player: Player | null
    setPlayer: (_: Player | null) => void
}

const initialGlobalContext: GlobalContext = {
    socket: null,
    setSocket: () => {},
    game: null,
    setGame: () => {},
    player: null,
    setPlayer: () => {},
}

export const GlobalContext = createContext<GlobalContext>(initialGlobalContext)

export default function App({ Component, pageProps }: AppProps) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [game, setGame] = useState<Game | null>(null)
    const [player, setPlayer] = useState<Player | null>(null)

    useEffect(() => {
        socket?.on(GameEvents.UPDATE_GAME_STATE, (gameState: Game) => {
            console.log('UPDATE_GAME_STATE received')
            setGame(gameState)
            setPlayer(gameState.playerList[socket.id])
        })

        return () => {
            socket?.off(GameEvents.UPDATE_GAME_STATE)
            socket?.off(GameEvents.UPDATE_PLAYER)
        }
    }, [socket, game, player])

    const globalState: GlobalContext = {
        socket,
        setSocket,
        game,
        setGame,
        player,
        setPlayer,
    }

    return (
        <GlobalContext.Provider value={{ ...globalState }}>
            <Head>
                <title>Wordle Brawl</title>
            </Head>
            <NavBar />
            <Component {...pageProps} />
        </GlobalContext.Provider>
    )
}
