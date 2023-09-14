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

    const trySubmitGuess = () : void => {
        if (currentGuessNum > 4) return;
        if (currentLetterNum < 5) return;

        setCurrentGuessNum(currentGuessNum + 1);
        setCurrentLetterNum(0);
    }

    return (
        <div className={styles.keyboard}>
            {
                firstRow.map(((letter, index) => <Key letter={letter} setState={tryAppendLetterToGuess} key={index}/>))
            }
            <SpacerKey />
            {

                secondRow.map(((letter, index) => <Key letter={letter} setState={tryAppendLetterToGuess} key={index}/>))
            }
            <EnterKey setState={trySubmitGuess}/>
            {
                thirdRow.map(((letter, index) => <Key letter={letter} setState = {tryAppendLetterToGuess} key={index}/>))
            }
            <DeleteKey setState={tryRemoveLetterFromGuess}/>
        </div>
    )
}