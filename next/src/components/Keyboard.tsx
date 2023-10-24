import { useContext, useEffect } from 'react';
import { GlobalContext } from '@/pages/_app';
import { 
    EvaluationRequestData, 
    EvaluationResponseData,
    GameEvents,
    Result 
} from '../../../common';

import Key from '@/components/Key';
import SpacerKey from '@/components/SpacerKey';
import EnterKey from './EnterKey';
import DeleteKey from './DeleteKey';
import styles from '@/styles/Keyboard.module.css';

const firstRow: string[] = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const secondRow: string[] = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const thirdRow: string[] = ["Z", "X", "C", "V", "B", "N", "M"];

const colorTable = new Map<Result, string> ([
    ["hit", "green"],
    ["has", "goldenrod"],
    ["miss", "lightslategrey"]
]);

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

    /**************************************************** 
     *                                                  *
     *                  REACT STATE                     *
     *                                                  *
    ****************************************************/
    const { socket } = useContext(GlobalContext);
    
    // Socket listeners
    useEffect(() => {
        socket && socket.on(GameEvents.EVALUATION, handleEvaluation);
        return () => {socket && socket.off(GameEvents.EVALUATION)}; // cleanup
    }, [socket, currentGuessNum]);

    // Window listeners
    useEffect( () => {
        window.addEventListener("keyup", handleKeyPressEvent);
        return () => window.removeEventListener("keyup", handleKeyPressEvent);
    }, [socket, currentLetterNum, currentGuessNum]);

    /**************************************************** 
     *                                                  *
     *               BASIC KEYBOARD EVENTS              *
     *                                                  *
    ****************************************************/
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

    /**************************************************** 
     *                                                  *
     *                  GUESS EVALUATION                *
     *                                                  *
    ****************************************************/
    const trySubmitGuess = async () : Promise<void> => {
        if (currentGuessNum > 5) return;
        if (currentLetterNum < 5) return;
        evaluateGuess();
    }
    
    const evaluateGuess = () => {
        const evalRequest : EvaluationRequestData = {
            guess: guesses[currentGuessNum].join("")
        }
        if (socket) {
            console.log("emitting guess");
            socket.emit(GameEvents.GUESS, evalRequest);
        };
    }

    const handleEvaluation = (evaluation : EvaluationResponseData) => {
        if (!evaluation.accepted) return;

        evaluation.resultByPosition && colorLetters(evaluation.resultByPosition);
        evaluation.resultByLetter && colorKeys(evaluation.resultByLetter);
        setCurrentGuessNum(currentGuessNum + 1);
        setCurrentLetterNum(0);
    }

    const colorLetters = (colors : Result[]) : void => {
        for (let i = 0; i < colors.length; ++i) {
            const letterId : string = `guess${currentGuessNum}letter${i}`;
            const letterElement = document.getElementById(letterId);

            if (letterElement !== null) {
                letterElement.style.backgroundColor = colorTable.get(colors[i]) ?? "";
            } 
        }
    }

    const colorKeys = (keyColors : Record<string, Result>) : void => {
        for (const letter in keyColors) {
            const keyId : string = `key${letter}`;
            const keyElement = document.getElementById(keyId);
            if (keyElement === null) continue;
            
            keyElement.style.backgroundColor = keyElement.style.backgroundColor === "green"
                ? "green"
                : colorTable.get(keyColors[letter]) ?? "";
        }
    }

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