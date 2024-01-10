import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import { GameParameters } from '../../../common'
import styles from '@/styles/PlayerListPanel.module.css'

export default function PlayerListPanel() {
    const { game, player } = useContext(GlobalContext)
    const playerListLength = game ? Object.keys(game.playerList).length : 0
    const namedPlayers = game
        ? Object.values(game.playerList).filter((player) => player.name).length
        : 0
    return (
        <div className={styles.playerListContainer}>
            <h2>
                Players ({playerListLength} / {GameParameters.MAX_PLAYERS})
            </h2>
            <ul className={styles.playerList}>
                {game &&
                    Object.values(game.playerList)
                        .filter((currPlayer) => currPlayer.name)
                        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                        .map((currPlayer, index) => (
                            <li
                                key={index}
                                className={
                                    (currPlayer.socketId ===
                                    game.leader.socketId
                                        ? 'leader'
                                        : '') +
                                    (currPlayer.socketId === player?.socketId
                                        ? ' self'
                                        : '')
                                }
                            >
                                {currPlayer.name}
                            </li>
                        ))}
                {game &&
                    Array(GameParameters.MAX_PLAYERS - namedPlayers)
                        .fill('')
                        .map((_, index) => <li key={index}>&nbsp;</li>)}
            </ul>
        </div>
    )
}
