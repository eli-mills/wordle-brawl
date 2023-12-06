import { useContext } from 'react'
import { GlobalContext } from '@/pages/_app'
import { gameCanStart, GameEvents } from '../../../common'

export default function GameStartButton() {
    const { player, game, socket } = useContext(GlobalContext)
    const enableButton = game && gameCanStart(game)
    return (
        <>
            {player?.socketId === game?.leader.socketId && (
                <button
                    onClick={() => socket?.emit(GameEvents.REQUEST_BEGIN_GAME)}
                    disabled={!enableButton}
                >
                    Start Game
                </button>
            )}
        </>
    )
}
