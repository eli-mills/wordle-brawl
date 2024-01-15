import GamePanel from '@/components/GamePanel'
import OpponentPanel from '@/components/OpponentPanel'
import ChoosingPanel from '@/components/ChoosingPanel'
import GameOverPanel from '@/components/GameOverPanel'
import { GlobalContext } from './_app'
import { useContext, useEffect } from 'react'
import styles from '@/styles/Game.module.css'
import { GameEvents } from '../../../common'

export default function GamePage() {
    const { game, player, socket } = useContext(GlobalContext)

    useEffect(() => {
        socket?.emit(GameEvents.REQUEST_GAME_STATE);
    }, [socket])

    return (
        <main className={styles.main}>
            {game?.status === 'playing' && (
                <div className={styles.playingGroup}>
                    <GamePanel
                        selfIsChooser={
                            game?.chooser?.socketId === player?.socketId
                        }
                    />
                    <OpponentPanel />
                </div>
            )}
            {game?.status === 'choosing' &&
                (game?.chooser?.socketId !== player?.socketId ? (
                    <h1 className={styles.waitingMessage}> {game.chooser?.name} is choosing a word </h1>
                ) : (
                    <ChoosingPanel />
                ))}
            {game?.status === 'end' && <GameOverPanel />}
        </main>
    )
}
