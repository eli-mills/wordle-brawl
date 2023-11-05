import { useContext } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';

export default function OpponentPanel() {
    const {opponentList, playerName} = useContext(GlobalContext);

    return (
        <div>
            { opponentList.map((opponent, index) => 
                opponent.name !== playerName && <OpponentCard key={index} player={opponent}/>
            )}
        </div>
    )
}