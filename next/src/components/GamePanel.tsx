import { useState, useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import GuessGroup from '@/components/GuessGroup'
import Keyboard from '@/components/Keyboard'
import styles from '@/styles/GamePanel.module.css'
import PlayerName from './PlayerName'

type GamePanelProps = {
    selfIsChooser: boolean
}

export default function GamePanel({ selfIsChooser }: GamePanelProps) {
    const [guesses, setGuesses] = useState([
        Array(5).fill(''),
        Array(5).fill(''),
        Array(5).fill(''),
        Array(5).fill(''),
        Array(5).fill(''),
        Array(5).fill(''),
    ])
    const [currentGuessNum, setCurrentGuessNum] = useState(0)
    const [currentLetterNum, setCurrentLetterNum] = useState(0)
    const { player } = useContext(GlobalContext);
    const keyboardProps = {
        guesses,
        setGuesses,
        currentGuessNum,
        setCurrentGuessNum,
        currentLetterNum,
        setCurrentLetterNum,
    }

    return (
        <div className={styles.main}>
            <PlayerName name={ player?.name ?? ""} score={player?.score ?? 0} />
            {selfIsChooser ? (
                <h2>You picked the word! Wait here while everyone guesses</h2>
            ) : (
                <div className={styles.gamePanel}>
                    <GuessGroup guesses={guesses} />
                    <Keyboard {...keyboardProps} />
                </div>
            )}
        </div>
    )
}
