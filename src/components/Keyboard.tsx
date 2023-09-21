import { useEffect } from 'react';

import { EvaluationRequestData, EvaluationResponseData } from '@/pages/api/evaluation';

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
    setCurrentLetterNum: (_: number) => void
}

export default function Keyboard({
    guesses,
    setGuesses,
    currentGuessNum, 
    setCurrentGuessNum,
    currentLetterNum,
    setCurrentLetterNum
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

    const evaluateGuess = async () : Promise<boolean> => {
        const evalRequest : EvaluationRequestData = {
            guess: guesses[currentGuessNum].join("")
        }
        const res = await fetch("/api/evaluation", {
            method: "POST",
            headers: new Headers({
                "Content-Type": "application/json"
            }),
            body: JSON.stringify(evalRequest)
        });
        const evaluation : EvaluationResponseData = await res.json();
        if (evaluation.accepted) {
            evaluation.guessColors && colorLetters(evaluation.guessColors);
            evaluation.keyColors && colorKeys(evaluation.keyColors);
        };
        return evaluation.accepted;
    }

    const colorLetters = (colors : string[]) : void => {
        for (let i = 0; i < 5; ++i) {
            const letterId : string = `guess${currentGuessNum}letter${i}`;
            const letterElement = document.getElementById(letterId);
            if (letterElement !== null) {
                letterElement.style.backgroundColor = colors[i];
            } 
        }
    }

    const colorKeys = (keyColors : Record<string, string>) : void => {
        for (const letter in keyColors) {
            const keyId : string = `key${letter}`;
            const keyElement = document.getElementById(keyId);
            if (keyElement === null) continue;
            
            keyElement.style.backgroundColor = keyElement.style.backgroundColor === "green"
                ? "green"
                : keyColors[letter];
        }
    }

    const trySubmitGuess = async () : Promise<void> => {
        if (currentGuessNum > 5) return;
        if (currentLetterNum < 5) return;
        
        if (await evaluateGuess()) {
            setCurrentGuessNum(currentGuessNum + 1);
            setCurrentLetterNum(0);
        }
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