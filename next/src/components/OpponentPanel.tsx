import { useContext } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';

export default function OpponentPanel() {
    const { game, player } = useContext(GlobalContext);

    return (
        <div>
            { game?.playerList.map((currPlayer, index) => 
                currPlayer.name !== player?.name && <OpponentCard key={index} player={currPlayer}/>
            )}
        </div>
    )
}