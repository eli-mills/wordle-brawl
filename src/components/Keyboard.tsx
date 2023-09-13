import Key from '@/components/Key';
import SpacerKey from '@/components/SpacerKey';
import EnterKey from './EnterKey';
import DeleteKey from './DeleteKey';
import styles from '@/styles/Keyboard.module.css';

const firstRow: string[] = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const secondRow: string[] = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const thirdRow: string[] = ["Z", "X", "C", "V", "B", "N", "M"];

const foo = (letter: string) : void => console.log(letter);

export default function Keyboard({currentGuess, setCurrentGuess}: {currentGuess: string, setCurrentGuess: (_: string) => void}) {
    const tryAppendLetterToGuess = (letter: string) : void => {
        console.log(`appending letter ${letter}`);
        setCurrentGuess(currentGuess.length >= 5 ? currentGuess : currentGuess.concat(letter));
    }
    
    const tryRemoveLetterFromGuess = () : void => {
        setCurrentGuess(currentGuess.length <= 0 ? currentGuess : currentGuess.slice(0, currentGuess.length - 1));
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
            <EnterKey />
            {
                thirdRow.map(((letter, index) => <Key letter={letter} setState = {tryAppendLetterToGuess} key={index}/>))
            }
            <DeleteKey setState={tryRemoveLetterFromGuess}/>
        </div>
    )
}