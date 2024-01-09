import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import OpponentCard from './OpponentCard'
import styles from '@/styles/OpponentPanel.module.css'
import { RxCross1 } from 'react-icons/rx'
import { GoSidebarExpand } from "react-icons/go";

export default function OpponentPanel() {
    const { game, player } = useContext(GlobalContext)

    const hideOpponentPanel = () => {
        const opponentPanel = document.querySelector(
            `.${styles.main}`
        ) as HTMLElement | null
        if (!opponentPanel) return
        opponentPanel.classList.add(styles.minimized)
    }

    const showOpponentPanel = () => {
        const opponentPanel = document.querySelector(`.${styles.main}`) as HTMLElement | null;
        if (!opponentPanel) return;
        opponentPanel.classList.remove(styles.minimized)

    }

    return (
        <div className={`${styles.main} ${styles.minimized}`}>
            <GoSidebarExpand className={styles.showOpponentPanelButton} onClick={showOpponentPanel}/>
            <RxCross1
                className={styles.hideOpponentPanelButton}
                onClick={hideOpponentPanel}
            />
            <div className={styles.opponentCardList}>
                {game?.playerList &&
                    Object.values(game.playerList).map(
                        (currPlayer, index) =>
                            currPlayer.socketId !== player?.socketId && currPlayer.name && (
                                <OpponentCard key={index} player={currPlayer} />
                            )
                    )}
            </div>
        </div>
    )
}
