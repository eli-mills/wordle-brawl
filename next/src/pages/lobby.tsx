import Head from 'next/head'
import { useRouter, NextRouter } from 'next/router'
import { GlobalContext } from './_app'
import { useEffect, useContext, useState } from 'react'
import { Socket, io } from 'socket.io-client'
import {
    GameEvents,
    GameParameters,
    gameCanStart,
    JoinRequestResponse,
    ClientToServerEvents,
    ServerToClientEvents,
} from '../../../common'
import NameModal from '@/components/NameModal'
import styles from '@/styles/Lobby.module.css'

function handleJoinGameResponse(
    response: JoinRequestResponse,
    router: NextRouter
) {
    switch (response) {
        case 'DNE':
            alert('The requested game does not exist.')
            router.push('/')
            break
        case 'MAX':
            alert('The requested game is full.')
            router.push('/')
            break
    }
}

function handleRoomQuery(
    room: string | string[] | undefined,
    socket: Socket<ServerToClientEvents, ClientToServerEvents>,
    router: NextRouter
): void {
    console.log(`handleRoomQuery: room = ${room}`);
    switch (room) {
        case GameEvents.REQUEST_NEW_GAME:
            socket?.emit(GameEvents.REQUEST_NEW_GAME)
            break
        case '':
        case undefined:
            alert('No room number provided.')
            router.push('/')
            break
        default:
            if (typeof room === 'object') {
                alert('Bad room number format')
                router.push('/')
                break
            }
            socket?.emit(
                GameEvents.REQUEST_JOIN_GAME,
                room,
                (response) =>
                    handleJoinGameResponse(response, router)
            )
    }
}

export default function LobbyPage() {
    const { socket, setSocket, player, game } = useContext(GlobalContext)
    const router = useRouter()
    const { room } = router.query
    const [displayModal, setDisplayModal] = useState(true)

    useEffect(() => {
        if (!socket) {
            console.log("No socket, creating new connection to server");
            const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
                process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ?? ""
            )
            newSocket.on(GameEvents.NEW_GAME_CREATED, (roomId: string) => {
                router.push(`/lobby?room=${roomId}`)
            })
            setSocket(newSocket)
            return;
        }
        console.log(`Socket exists, handling room query for room ${room}`)
        router.isReady && handleRoomQuery(room, socket, router)
    }, [room, router, setSocket, socket])

    useEffect(() => {
        socket?.on(GameEvents.BEGIN_GAME, () => {
            router.push('/game')
        })

        return () => {
            socket?.off(GameEvents.BEGIN_GAME)
        }
    }, [router, socket])

    return (
        <>
            <Head>
                <title>Wordle WS</title>
            </Head>
            {socket && (
                <main className={styles.main}>
                    <h1>Room {game?.roomId}</h1>
                    <h2>
                        Players ({game && Object.keys(game.playerList).length} /{' '}
                        {GameParameters.MAX_PLAYERS})
                    </h2>
                    <ul className={styles.nameList}>
                        {game?.playerList &&
                            Object.values(game.playerList).map(
                                (currPlayer, index) => (
                                    <li key={index}>{currPlayer.name}</li>
                                )
                            )}
                    </ul>
                    {displayModal && (
                        <NameModal setDisplayModal={setDisplayModal} />
                    )}
                    {!displayModal && (
                        <button onClick={() => setDisplayModal(true)}>
                            Change Name
                        </button>
                    )}
                    {player?.socketId === game?.leader.socketId &&
                        game &&
                        gameCanStart(game) && (
                            <button
                                onClick={() =>
                                    socket?.emit(GameEvents.REQUEST_BEGIN_GAME)
                                }
                            >
                                Start Game
                            </button>
                        )}
                </main>
            )}
            {!socket && <h1>NOT CONNECTED</h1>}
        </>
    )
}
