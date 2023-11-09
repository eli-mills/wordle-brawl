import Head from 'next/head'
import GamePanel from '@/components/GamePanel'
import OpponentPanel from '@/components/OpponentPanel'
import ChoosingPanel from '@/components/ChoosingPanel'
import { GlobalContext } from './_app'
import { useContext } from 'react'


export default function GamePage() {
    const { game, player } = useContext(GlobalContext);

    return (
        <>
            <Head>
                <title>Wordle WS</title>
            </Head>
            <main>
                { game?.status === "playing" && 
                    <>
                        { game?.chooser?.socketId === player?.socketId ? 
                            <h1> You picked the word! Wait here while everyone guesses </h1> 
                            : <GamePanel/> } 
                            <OpponentPanel />
                    </>
                }
                { game?.status === "choosing" && (
                    game?.chooser?.socketId !== player?.socketId ? 
                    <h1> { game.chooser?.name } is choosing a word </h1> :
                    <ChoosingPanel />
                )}
            </main>
        </>
    )
}
