import { useRouter } from 'next/router'
import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'

export default function GameJoinButton() {
    const router = useRouter()
    const { game, player } = useContext(GlobalContext)

    return (
        <>
            {game && game.status !== "lobby" && player?.name && <button onClick={(e) => {
                e.preventDefault();
                router.push('/game')
            }}>Join Game in Progress</button>}
        </>
    )
}
