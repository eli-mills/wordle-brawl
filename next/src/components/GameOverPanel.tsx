import { useContext } from 'react'
import { useRouter } from 'next/router'
import { GlobalContext } from '@/pages/_app'
import { GameEvents, gameCanStart } from '../../../common'
import PlayerStatsCard from './PlayerStatsCard'

export default function GameOverPanel() {
    const router = useRouter()
    const { player, game, socket, setSocket, setGame, setPlayer } =
        useContext(GlobalContext)

    const onClickPlayAgain = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        socket?.emit(GameEvents.START_OVER)
    }

    const onClickHome = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        router.push('/')
    }

    return (
        <div>
            <h1>Game Over</h1>
            {game &&
                Object.values(game.playerList).map((player) =>
                    PlayerStatsCard({ player })
                )}
            {player &&
                game &&
                player.socketId === game.leader.socketId &&
                gameCanStart(game) && (
                    <button onClick={onClickPlayAgain}>Play Again?</button>
                )}
            <button onClick={onClickHome}>Return Home</button>
        </div>
    )
}
