import { useContext } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';

export default function OpponentPanel() {
    const { game, player } = useContext(GlobalContext);

    return (
        <div>
            { game?.playerList && Object.values(game.playerList).map((currPlayer, index) => 
                currPlayer.socketId !== player?.socketId && <OpponentCard key={index} player={currPlayer}/>
            )}
        </div>
    )
}