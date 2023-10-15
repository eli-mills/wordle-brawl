import { Socket } from 'socket.io-client';
import { useState } from 'react';

type NameModalArgs = {
    socket: Socket | undefined,
    setDisplayModal : (_ : boolean) => void
}

export default function NameModal({socket, setDisplayModal} : NameModalArgs) {
    const [playerName, setPlayerName] = useState<string>();

    const onButtonClick = () => {
        socket && socket.emit("declare-name", playerName);
        setDisplayModal(false);
    }

    return (
        <div className="nameModalBackground">
            <div className="nameModal">
                <input type="text" 
                onChange={e => setPlayerName(e.target.value)}
                onKeyUp={e => e.stopPropagation()}/>
                <button className="submitName" onClick={onButtonClick}>Submit</button>
            </div>
        </div>
    )
}