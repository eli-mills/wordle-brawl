import { useContext } from 'react'
import { useRouter } from 'next/router'
import { GlobalContext } from '@/pages/_app'
import { GameEvents, gameCanStart } from '../../../common'
import PlayerName from './PlayerName'
import styles from '@/styles/GameOverPanel.module.css'

export default function GameOverPanel() {
    const router = useRouter()
    const { player, game, socket } = useContext(GlobalContext)

    const onClickPlayAgain = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        socket?.emit(GameEvents.START_OVER)
    }

    const onClickHome = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        router.push('/')
    }

    return (
        <div className={styles.gameOverPanel}>
            <h1>Game Over</h1>
            <button onClick={onClickHome}>Return Home</button>
            {player &&
                game &&
                player.socketId === game.leader.socketId &&
                gameCanStart(game) && (
                    <button onClick={onClickPlayAgain}>Play Again?</button>
                )}
            <ol className={styles.playerStatsContainer}>
                {game &&
                    Object.values(game.playerList)
                        .sort((a, b) => b.score - a.score)
                        .map((player, key) => (
                            <>
                                {player.name && (
                                    <li key={key}>
                                        <PlayerName {...player} />
                                    </li>
                                )}
                            </>
                        ))}
            </ol>
        </div>
    )
}
