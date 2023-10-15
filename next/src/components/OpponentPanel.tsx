import { useContext } from 'react';
import { GlobalContext } from '@/pages/_app';

export default function OpponentPanel() {
    const {opponentList} = useContext(GlobalContext);

    return (
        <div>
            {opponentList.map((opponentName => <p>{opponentName}</p>))}
        </div>
    )
}