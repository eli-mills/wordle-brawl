import { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '@/pages/_app';
import GuessGroup from '@/components/GuessGroup';
import Keyboard from '@/components/Keyboard';
import style from '@/styles/GamePanel.module.css';

export default function GamePanel() {
    const { player } = useContext(GlobalContext);
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

    // TODO: get rid of this
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
        <div className={style.gamePanel}>
            <GuessGroup guesses={guesses}/>
            <Keyboard {...keyboardProps} />
        </div>
    );
}