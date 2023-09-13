import { useState, useEffect } from 'react';
import GuessGroup from '@/components/GuessGroup';
import Keyboard from '@/components/Keyboard';


export default function GamePanel() {
    const [currentGuess, setCurrentGuess] = useState('');
    useEffect(()=>console.log(`new currentGuess: ${currentGuess}`), [currentGuess]);
    return (
        <>
            <GuessGroup currentGuess={currentGuess}/>
            <Keyboard currentGuess={currentGuess} setCurrentGuess={setCurrentGuess}/>
        </>
    );
}