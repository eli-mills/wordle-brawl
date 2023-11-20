import { useState, useContext, FormEvent } from 'react'
import { GlobalContext } from '@/pages/_app'
import { GameEvents } from '../../../common'
import styles from '@/styles/Lobby.module.css'

type NameModalArgs = {
    setDisplayModal: (_: boolean) => void
}

export default function NameModal({ setDisplayModal }: NameModalArgs) {
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
                    setName("")
                    setDisplayModal(true)
                    break
                case 'DUP':
                    setMessage('Name already in use.')
                    setShowMessage(true)
                    setDisplayModal(true)
                    break
                case 'OK':
                    setMessage('')
                    setShowMessage(false)
                    setDisplayModal(false)
                    break
            }
        })
        return false
    }

    return (
        <form className={styles.nameForm} onSubmit={onButtonClick}>
            <label>Choose a Name:</label>
            <input
                type="text"
                maxLength={25}
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
    )
}
