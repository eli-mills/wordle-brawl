import { useEffect } from 'react';
import styles from '@/styles/Keyboard.module.css';

type KeyProps = {
    letter: string;
}

export default function Key({letter}: KeyProps) {
    useEffect(() => {
        const keyUpEvent = new KeyboardEvent("keyup", {key: letter});
        const key = document.getElementById(`key${letter}`);

        key?.addEventListener("mouseup", (e) => {
            e.preventDefault();
            console.log("clicked");
            window.dispatchEvent(keyUpEvent);
        });
    }, [letter]);
    return (
        <button id={`key${letter}`} className={styles.letterKey}>
            {letter}
        </button>
    )
}