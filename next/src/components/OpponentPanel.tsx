import { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';
import { Result, OpponentEvaluationResponseData, GameEvents } from '../../../common';

export default function OpponentPanel() {
    const {opponentList, socket} = useContext(GlobalContext);
    const [oppGuessHistory, setOppGuessHistory] = useState<Map<string, Result[][]>>(new Map<string, Result[][]>);

    useEffect(() => {
        socket?.on(GameEvents.OPP_EVALUATION, (data: OpponentEvaluationResponseData) => {
            const playerHistory = oppGuessHistory.get(data.playerName);
            playerHistory?.push(data.resultByPosition);
            oppGuessHistory.set(data.playerName, playerHistory ?? [data.resultByPosition]);
            setOppGuessHistory(new Map(oppGuessHistory));
        });
        return () => {socket?.off(GameEvents.OPP_EVALUATION)};
    }, [oppGuessHistory, socket]);

    return (
        <div>
            {opponentList.map(((opponentName, index) => <OpponentCard key={index} playerName={opponentName} oppGuessHistory={oppGuessHistory}/>))}
        </div>
    )
}