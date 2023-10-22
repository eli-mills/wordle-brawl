import { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';
import { Color, OpponentEvaluationResponseData, GameEvents } from '../../../common';

export default function OpponentPanel() {
    const {opponentList, socket} = useContext(GlobalContext);
    const [oppGuessHistory, setOppGuessHistory] = useState<Map<string, Color[][]>>(new Map<string, Color[][]>);

    useEffect(() => {
        socket?.on(GameEvents.OPP_EVALUATION, (data: OpponentEvaluationResponseData) => {
            const playerHistory = oppGuessHistory.get(data.playerName);
            playerHistory?.push(data.guessColors);
            oppGuessHistory.set(data.playerName, playerHistory ?? [data.guessColors]);
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