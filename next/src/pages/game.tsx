import Head from 'next/head'
import GamePanel from '@/components/GamePanel'
import OpponentPanel from '@/components/OpponentPanel'
import ChoosingPanel from '@/components/ChoosingPanel'
import GameOverPanel from '@/components/GameOverPanel'
import { GlobalContext } from './_app'
import { useContext } from 'react'
import PlayerName from '@/components/PlayerName'
import styles from '@/styles/Game.module.css'

export default function GamePage() {
    const { game, player } = useContext(GlobalContext)

    return (
        <>
            <main className={styles.main}>
                {game?.status === 'playing' && (
                    <>
                        <PlayerName />

                        {game?.chooser?.socketId === player?.socketId ? (
                            <h2>
                                {' '}
                                You picked the word! Wait here while everyone
                                guesses{' '}
                            </h2>
                        ) : (
                            <GamePanel />
                        )}
                        <OpponentPanel />
                    </>
                )}
                {game?.status === 'choosing' &&
                    (game?.chooser?.socketId !== player?.socketId ? (
                        <h1> {game.chooser?.name} is choosing a word </h1>
                    ) : (
                        <ChoosingPanel />
                    ))}
                {game?.status === 'end' && <GameOverPanel />}
            </main>
        </>
    )
}
