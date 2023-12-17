import { useState, useContext, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GlobalContext } from './_app'
import { GameEvents } from '../../../common'
import style from '@/styles/Home.module.css'

export default function HomePage() {
    const [room, setRoom] = useState('')
    const router = useRouter()
    const { socket, setSocket, setGame, setPlayer } = useContext(GlobalContext)

    const requestCreateRoom = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        router.push(`/lobby?room=${GameEvents.REQUEST_NEW_GAME}`)
    }

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        router.push(`/lobby?room=${room}`)
    }

    useEffect(() => {
        socket?.disconnect();
        setSocket(null);
        setGame(null);
        setPlayer(null);
    }, [setGame, setPlayer, setSocket, socket])

    return (
        <>
            <main className={style.main}>
                <h1> Wordle Brawl </h1>
                <form className={style.roomForm} onSubmit={onSubmit}>
                    <div>
                        <input
                            onChange={(e) => setRoom(e.target.value)}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                        />
                        <button type="submit">Join a Room</button>
                    </div>
                    <button onClick={requestCreateRoom}>Create a Room</button>
                </form>
            </main>
        </>
    )
}
