import Head from 'next/head'
import { useRouter } from 'next/router'
import { GlobalContext } from './_app'
import { useEffect, useContext, useState } from 'react'
import { GameEvents, GameParameters, gameCanStart } from '../../../common'
import NameModal from '@/components/NameModal'
import styles from '@/styles/Lobby.module.css'

export default function LobbyPage() {
    const { socket, player, game } = useContext(GlobalContext)
    const router = useRouter()
    const { room: queryRoom } = router.query as { room: string }
    const [displayModal, setDisplayModal] = useState<boolean>(true)

    console.log(queryRoom)

    useEffect(() => {
        queryRoom &&
            socket?.emit(
                GameEvents.REQUEST_JOIN_GAME,
                queryRoom,
                (response) => {
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
        )
        if (!socket) {
            alert('Connection lost.')
            router.push('/')
        }
        if (!queryRoom) {
            alert('No room number provided.')
            router.push('/')
        }
    }, [queryRoom, router, socket])

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
                        <h2>Players ({game && Object.keys(game.playerList).length} / {GameParameters.MAX_PLAYERS})</h2>
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
                        {!displayModal && <button onClick={() => setDisplayModal(true)}>Change Name</button>}
                        {player?.socketId === game?.leader.socketId &&
                            game &&
                            gameCanStart(game) && (
                                <button
                                    onClick={() =>
                                        socket?.emit(
                                            GameEvents.REQUEST_BEGIN_GAME
                                        )
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
