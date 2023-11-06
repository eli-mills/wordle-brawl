import { useState, useContext } from 'react';
import { GlobalContext } from '@/pages/_app';
import { GameEvents } from '../../../common';

type NameModalArgs = {
    setDisplayModal : (_ : boolean) => void
}

export default function NameModal({setDisplayModal} : NameModalArgs) {
    const [ playerName, setName ] = useState("");
    const { socket } = useContext(GlobalContext);

    const onButtonClick = () => {
        socket?.emit(GameEvents.DECLARE_NAME, playerName);
        setDisplayModal(false);
    }

    return (
        <div className="nameModalBackground">
            <div className="nameModal">
                <input type="text" 
                onChange={e => setName(e.target.value)}
                onKeyUp={e => e.stopPropagation()}/>
                <button className="submitName" onClick={onButtonClick}>Submit</button>
            </div>
        </div>
    )
}