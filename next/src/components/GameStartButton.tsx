import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import { gameCanStart, GameEvents } from '../../../common'

export default function GameStartButton() {
    const { player, game, socket } = useContext(GlobalContext)

    return (
        <>
            {player?.socketId === game?.leader.socketId &&
                game &&
                gameCanStart(game) && (
                    <button
                        onClick={() =>
                            socket?.emit(GameEvents.REQUEST_BEGIN_GAME)
                        }
                    >
                        Start Game
                    </button>
                )}
        </>
    )
}
