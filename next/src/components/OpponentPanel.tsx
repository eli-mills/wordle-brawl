import { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '@/pages/_app';
import OpponentCard from './OpponentCard';
import { Result, OpponentEvaluationResponseData, GameEvents, PlayerDisconnectedData } from '../../../common';

export default function OpponentPanel() {
    const {opponentList, socket, playerName} = useContext(GlobalContext);
    const [oppGuessHistory, setOppGuessHistory] = useState<Map<string, Result[][]>>(new Map<string, Result[][]>);
    console.log(`Rendering, opponentList = ${opponentList}`);
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
            { opponentList.map((opponentName) => 
                opponentName !== playerName && <OpponentCard key={opponentName} playerName={opponentName} oppGuessHistory={oppGuessHistory}/>
            )}
        </div>
    )
}