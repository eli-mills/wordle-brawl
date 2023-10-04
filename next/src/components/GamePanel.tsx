import { useState, useEffect } from 'react';
import GuessGroup from '@/components/GuessGroup';
import Keyboard from '@/components/Keyboard';


export default function GamePanel() {
    const [guesses, setGuesses] = useState(
        [
            Array(5).fill(""),
            Array(5).fill(""),
            Array(5).fill(""),
            Array(5).fill(""),
            Array(5).fill(""),
            Array(5).fill(""),
        ]
    );
    const [currentGuessNum, setCurrentGuessNum] = useState(0);
    const [currentLetterNum, setCurrentLetterNum] = useState(0);
    const [solution, setSolution] = useState(['H', 'O', 'U', 'S', 'E']);

    useEffect(()=>console.log(`new currentGuess: ${currentGuessNum}`), [currentGuessNum]);
    
    const keyboardProps = {
        guesses,
        setGuesses,
        currentGuessNum,
        setCurrentGuessNum,
        currentLetterNum,
        setCurrentLetterNum,
        solution
    }

    return (
        <>
            <GuessGroup guesses={guesses}/>
            <Keyboard {...keyboardProps}/>
        </>
    );
}