import { useEffect } from 'react';

import Key from '@/components/Key';
import SpacerKey from '@/components/SpacerKey';
import EnterKey from './EnterKey';
import DeleteKey from './DeleteKey';
import styles from '@/styles/Keyboard.module.css';

const firstRow: string[] = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const secondRow: string[] = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const thirdRow: string[] = ["Z", "X", "C", "V", "B", "N", "M"];

type KeyboardProps = {
    guesses: string[][],
    setGuesses: (_: string[][]) => void,
    currentGuessNum: number, 
    setCurrentGuessNum: (_: number) => void,
    currentLetterNum: number,
    setCurrentLetterNum: (_: number) => void,
    solution: string[]
}

export default function Keyboard({
    guesses,
    setGuesses,
    currentGuessNum, 
    setCurrentGuessNum,
    currentLetterNum,
    setCurrentLetterNum,
    solution
}:KeyboardProps){

    const tryAppendLetterToGuess = (letter: string) : void => {
        if (currentLetterNum > 4 || currentGuessNum > 5) return;

        const newGuessesArray: string[][] = guesses.map(guess => guess.slice());    // Create deep copy
        newGuessesArray[currentGuessNum][currentLetterNum] = letter;

        setGuesses(newGuessesArray);
        setCurrentLetterNum(currentLetterNum + 1);
    }
    
    const tryRemoveLetterFromGuess = () : void => {
        if (currentLetterNum <= 0) return;
        
        const newGuessesArray: string[][] = guesses.map(guess => guess.slice());    // Create deep copy
        newGuessesArray[currentGuessNum][currentLetterNum - 1] = "";
        
        setCurrentLetterNum(currentLetterNum - 1);
        setGuesses(newGuessesArray);
    }

    const evaluateGuess = () : void => {
        const solutionCopy = solution.map((letter)=>letter);
        const greyMask = Array(5).fill(true);

        // Check for greens
        for (let i = 0; i < 5; ++i) {
            if (guesses[currentGuessNum][i] === solutionCopy[i]) {
                solutionCopy[i] = "";
                greyMask[i] = false;
                const guessLetter = document.getElementById(`guess${currentGuessNum}letter${i}`);
                if (guessLetter !== null) {
                    guessLetter.style.backgroundColor = "green";
                }
            }
        }

        // Check for yellow
        for (let i = 0; i < 5; ++i) {
            if (solutionCopy.includes(guesses[currentGuessNum][i])) {
                greyMask[i] = false;
                const guessLetter = document.getElementById(`guess${currentGuessNum}letter${i}`);
                if (guessLetter !== null) {
                    guessLetter.style.backgroundColor = "yellow";
                }
            }
        }

        // Color greys
        for (let i = 0; i < 5; ++i) {
            if (greyMask[i]) {
                const guessLetter = document.getElementById(`guess${currentGuessNum}letter${i}`);
                if (guessLetter !== null) {
                    guessLetter.style.backgroundColor = "grey";
                }
            }
        }

    }

    const trySubmitGuess = () : void => {
        if (currentGuessNum > 5) return;
        if (currentLetterNum < 5) return;
        
        evaluateGuess();
        setCurrentGuessNum(currentGuessNum + 1);
        setCurrentLetterNum(0);
    }



    useEffect( () => {
        const handleKeyPressEvent = (e: KeyboardEvent) => {
            const letters = "QWERTYUIOPASDFGHJKLZXCVBNM";
            if (e.key === "Enter") {
                trySubmitGuess();
            } else if (e.key === "Backspace") {
                tryRemoveLetterFromGuess();
            } else if (letters.includes(e.key.toUpperCase())) {
                tryAppendLetterToGuess(e.key.toUpperCase());
            }
        }
        window.addEventListener("keyup", handleKeyPressEvent);
        return () => window.removeEventListener("keyup", handleKeyPressEvent);
    }, [currentLetterNum, currentGuessNum]);

    return (
        <div className={styles.keyboard}>
            {
                firstRow.map(((letter) => <Key letter={letter} key={letter}/>))
            }
            <SpacerKey />
            {

                secondRow.map(((letter) => <Key letter={letter} key={letter}/>))
            }
            <EnterKey setState={trySubmitGuess}/>
            {
                thirdRow.map(((letter) => <Key letter={letter} key={letter}/>))
            }
            <DeleteKey setState={tryRemoveLetterFromGuess}/>
        </div>
    )
}