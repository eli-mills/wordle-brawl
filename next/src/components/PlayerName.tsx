import styles from '@/styles/PlayerName.module.css'

type PlayerNameProps = {
    name: string,
    score: number, 
}

export default function PlayerName({name, score}: PlayerNameProps) {
    return (
        <div className={styles.playerScoreContainer}>
            <p className={styles.playerName}>{name}</p>
            <p className={styles.playerScore}>|Score: {score}</p>
        </div>
    )
}
