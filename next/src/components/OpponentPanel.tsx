import { useContext } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';
import styles from '@/styles/OpponentPanel.module.css'

export default function OpponentPanel() {
    const { game, player } = useContext(GlobalContext);

    return (
        <div className={styles.main}>
            { game?.playerList && Object.values(game.playerList).map((currPlayer, index) => 
                currPlayer.socketId !== player?.socketId && <OpponentCard key={index} player={currPlayer}/>
            )}
        </div>
    )
}