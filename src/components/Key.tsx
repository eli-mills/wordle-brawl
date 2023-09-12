import styles from '@/styles/Keyboard.module.css';

type KeyProps = {
    letter: string;
    setState: (letter: string) => void;
}

export default function Key({letter, setState}: KeyProps) {
    return (
        <button className={styles.letterKey} onClick={(e)=>setState(letter)}>
            {letter}
        </button>
    )
}