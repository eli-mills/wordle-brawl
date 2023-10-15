import { Socket } from 'socket.io-client';
import { useState, useEffect } from 'react';
import * as GameEvents from "../../../common/game-events";

type OpponentPanelArgs = {
    socket: Socket | undefined
}

export default function OpponentPanel({socket}: OpponentPanelArgs) {
    const [opponentList, setOpponentList] = useState<string[]>([]);
    useEffect( () => {
        socket && socket.on(GameEvents.UPDATE_NAME_LIST, (updatedList: string[]) => {console.log("received updated list"); setOpponentList(updatedList)});
        return () => {socket && socket.off(GameEvents.UPDATE_NAME_LIST)};
    }, [socket, opponentList]);

    return (
        <div>
            {opponentList.map((opponentName => <p>{opponentName}</p>))}
        </div>
    )
}