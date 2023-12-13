import { useContext, useState, useEffect } from 'react'
import { GlobalContext } from '@/pages/_app'
import { GameEvents } from '../../../common'
import styles from '@/styles/ChoosingPanel.module.css'

export default function ChoosingPanel() {
    const { socket } = useContext(GlobalContext)
    const [chosenWord, setChosenWord] = useState('')
    const [wordIsValid, setWordIsValid] = useState(false)

    useEffect(() => {
        if (chosenWord.length === 5) {
            socket?.emit(
                GameEvents.CHECK_CHOSEN_WORD_VALID,
                chosenWord,
                (isValid: boolean) => {
                    setWordIsValid(isValid)
                }
            )
        } else {
            setWordIsValid(false)
        }
    }, [chosenWord, socket])

    function onWordChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const newWordUpper = e.target.value.toUpperCase()
        e.target.value = newWordUpper
        setChosenWord(newWordUpper)
    }

    const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        socket?.emit(GameEvents.CHOOSE_WORD, chosenWord)
        return false
    }

    const onRequestValidWord = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        socket?.emit(GameEvents.REQUEST_VALID_WORD, (validWord: string) => {
            setChosenWord(validWord.toUpperCase())
        })
    }

    return (
        <form
            onSubmit={onFormSubmit}
            autoComplete="off"
            className={styles.choosingForm}
        >
            <h1> You&apos;re the chooser! </h1>
            <h2>Pick a word for others to guess:</h2>
            <div>
                <input
                    id="chosenWord"
                    type="text"
                    value={chosenWord}
                    onChange={onWordChange}
                    maxLength={5}
                />

                <button type="submit" disabled={!wordIsValid}>
                    {' '}
                    Submit{' '}
                </button>
            </div>
            {chosenWord.length < 5 && (
                <p className={styles.messageBad}> Word must be 5 letters </p>
            )}
            {chosenWord.length === 5 && !wordIsValid && (
                <p className={styles.messageBad}> Word is not valid </p>
            )}
            {wordIsValid && (
                <p className={styles.messageGood}> Word is valid!</p>
            )}
            <button onClick={onRequestValidWord}> Get Random Word </button>
        </form>
    )
}
