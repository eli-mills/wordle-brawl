import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import { GameParameters } from '../../../common'
import styles from '@/styles/PlayerListPanel.module.css'

export default function PlayerListPanel() {
    const { game } = useContext(GlobalContext)

    return (
        <div>
            <h2>
                Players ({game && Object.keys(game.playerList).length} /{' '}
                {GameParameters.MAX_PLAYERS})
            </h2>
            <ul className={styles.playerList}>
                {game?.playerList &&
                    Object.values(game.playerList).map((currPlayer, index) => (
                        <li key={index}>{currPlayer.name}</li>
                    ))}
            </ul>
        </div>
    )
}
