import styles from '@/styles/Letter.module.css'
type LetterProps = {
    letterNum: number,
    guessNum: number,
    guesses: string[][]
}

export default function Letter ({letterNum, guessNum, guesses}: LetterProps) {
    return (
        <span className={styles.letter}>
            {guesses[guessNum][letterNum]}
        </span>
    )
}