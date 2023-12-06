import { Player } from '../../../common'
import styles from '@/styles/GameOverPanel.module.css'

export default function PlayerStatsCard({ player }: { player: Player }) {
    return (
        <div className={styles.playerStatsCard}>
            <h1>{player.name}</h1>
            <p>Score: {player.score}</p>
        </div>
    )
}
