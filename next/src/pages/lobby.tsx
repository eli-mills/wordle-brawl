import Head from 'next/head'
import { useRouter, NextRouter } from 'next/router'
import { GlobalContext } from './_app'
import { useEffect, useContext, useState } from 'react'
import { Socket, io } from 'socket.io-client'
import {
    GameEvents,
    JoinRequestResponse,
    NewGameRequestResponse,
    ClientToServerEvents,
    ServerToClientEvents,
} from '../../../common'
import NameForm from '@/components/NameForm'
import styles from '@/styles/Lobby.module.css'
import LoadingIcon from '@/components/LoadingIcon'
import PlayerListPanel from '@/components/PlayerListPanel'
import GameStartButton from '@/components/GameStartButton'

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

function handleNewGameResponse(
    response: NewGameRequestResponse,
    router: NextRouter
) {
    process.env.NEXT_PUBLIC_DEBUG &&
        console.log(
            `Inside handleNewGameResponse. response=${JSON.stringify(response)}`
        )
    switch (response.roomsAvailable) {
        case false:
            alert('No rooms available. Please try again in a few minutes.')
            router.push('/')
            break
        case true:
            router.push(`/lobby?room=${response.roomId}`)
    }
}

function handleRoomQuery(
    room: string | string[] | undefined,
    socket: Socket<ServerToClientEvents, ClientToServerEvents>,
    router: NextRouter
): void {
    console.log(
        `handleRoomQuery: room = ${room}, socket = ${socket.id}, router = ${router}`
    )
    switch (room) {
        case GameEvents.REQUEST_NEW_GAME:
            console.log('New game request received, emitting to socket...')
            // socket.emit(GameEvents.SAY_HELLO, () =>
            //     console.log('Inside say-hello callback')
            // )
            socket
                .timeout(3000)
                .emit(
                    GameEvents.REQUEST_NEW_GAME,
                    (err: Error, response: NewGameRequestResponse) => {
                        if (err) {
                            console.log('Timeout, emitting again')
                            socket.emit(
                                GameEvents.REQUEST_NEW_GAME,
                                (response) => {
                                    handleNewGameResponse(response, router)
                                }
                            )
                        } else {
                            handleNewGameResponse(response, router)
                        }
                    }
                )

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
            socket.emit(GameEvents.REQUEST_JOIN_GAME, room, (response) =>
                handleJoinGameResponse(response, router)
            )
    }
}

export default function LobbyPage() {
    const { socket, setSocket, player, game } = useContext(GlobalContext)
    const router = useRouter()
    const { room } = router.query
    const [displayNameForm, setDisplayNameForm] = useState(true)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        console.log(
            `socket.connected changed. current value: ${socket?.connected}`
        )
    }, [socket?.connected])

    useEffect(() => {
        console.log('No socket, creating new connection to server')
        const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> =
            io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ?? '')
        newSocket.on('connect', () => {
            console.log('socket is connected')
            setIsConnected(true)
        })

        setSocket(newSocket)
        return () => {
            newSocket.disconnect()
        }
    }, [])

    useEffect(() => {
        if (!socket)
            return console.log(`No socket, exiting query handler effect`)
        if (!socket.connected) {
            return console.log('Socket not connected, exiting effect')
        }
        if (!router.isReady) {
            return console.log('Router is not ready, exiting.')
        }
        console.log(
            `Router is ready and socket exists. Handling query for room ${room}.`
        )
        socket.on(GameEvents.BEGIN_GAME, () => {
            router.push('/game')
        })
        handleRoomQuery(room, socket, router)

        return () => {
            socket.off(GameEvents.BEGIN_GAME)
        }
    }, [room, router, router.isReady, socket, isConnected])

    return (
        <>
            <Head>
                <title>Wordle WS</title>
            </Head>
            {game ? (
                <main className={styles.main}>
                    <h1>Room {game?.roomId}</h1>
                    <PlayerListPanel />
                    <NameForm
                        {...{
                            displayNameForm,
                            setDisplayNameForm,
                        }}
                    />
                    <GameStartButton />
                </main>
            ) : (
                <LoadingIcon />
            )}
        </>
    )
}
