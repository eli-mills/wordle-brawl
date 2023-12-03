import { useState, useContext, FormEvent } from 'react'
import { GlobalContext } from '@/pages/_app'
import { GameEvents } from '../../../common/dist'
import styles from '@/styles/NameForm.module.css'

type NameFormArgs = {
    displayNameForm: boolean
    setDisplayNameForm: (_: boolean) => void
}

export default function NameForm({
    displayNameForm,
    setDisplayNameForm,
}: NameFormArgs) {
    const [playerName, setName] = useState('')
    const [showMessage, setShowMessage] = useState(false)
    const [message, setMessage] = useState('')
    const { socket } = useContext(GlobalContext)

    const onButtonClick = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        socket?.emit(GameEvents.DECLARE_NAME, playerName, (result) => {
            switch (result) {
                case 'EMPTY':
                    setMessage('Name cannot be empty.')
                    setShowMessage(true)
                    setName('')
                    setDisplayNameForm(true)
                    break
                case 'DUP':
                    setMessage('Name already in use.')
                    setShowMessage(true)
                    setDisplayNameForm(true)
                    break
                case 'OK':
                    setMessage('')
                    setShowMessage(false)
                    setDisplayNameForm(false)
                    break
            }
        })
        return false
    }

    return (
        <div className={styles.nameFormContainer}>
            {displayNameForm ? (
                <form className={styles.nameForm} onSubmit={onButtonClick}>
                    <label>Choose a Name:</label>
                    <input
                        type="text"
                        maxLength={14}
                        value={playerName}
                        onChange={(e) => {
                            setName(e.target.value)
                            setShowMessage(false)
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                    />
                    <button type="submit">Submit</button>
                    {showMessage && <p> {message} </p>}
                </form>
            ) : (
                <button onClick={() => setDisplayNameForm(true)}>
                    Change Name
                </button>
            )}
        </div>
    )
}
