import { useState } from 'react';
import GuessGroup from '@/components/GuessGroup';
import Keyboard from '@/components/Keyboard';
import styles from '@/styles/GamePanel.module.css';

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
    
    const keyboardProps = {
        guesses,
        setGuesses,
        currentGuessNum,
        setCurrentGuessNum,
        currentLetterNum,
        setCurrentLetterNum,
    }

    return (
        <div className={styles.gamePanel}>
            <GuessGroup guesses={guesses}/>
            <Keyboard {...keyboardProps} />
        </div>
    );
}