import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import styles from '@/styles/PlayerName.module.css'

export default function PlayerName() {
    const { player } = useContext(GlobalContext)
    return (
        <div className={styles.playerScoreContainer}>
            <p className={styles.playerName}>{player?.name}</p>
            <p className={styles.playerScore}>|Score: {player?.score}</p>
        </div>
    )
}
