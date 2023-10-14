import { Socket } from 'socket.io-client';
import { useState, useEffect } from 'react';
import * as GameEvents from "../../../common/game-events";

type OpponentPanelArgs = {
    socket: Socket | undefined
}

export default function OpponentPanel({socket}: OpponentPanelArgs) {
    const [opponentList, setOpponentList] = useState<string[]>([]);
    useEffect( () => {
        socket && socket.on(GameEvents.ADD_NAME, handleAddName);
        return () => {socket && socket.off(GameEvents.ADD_NAME, handleAddName)};
    }, [socket, opponentList]);

    const handleAddName = (name : string) => {
        setOpponentList([...opponentList, name]);
    }

    return (
        <div>
            {opponentList.map((opponentName => <p>{opponentName}</p>))}
        </div>
    )
}