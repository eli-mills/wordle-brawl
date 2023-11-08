import Head from 'next/head'
import GamePanel from '@/components/GamePanel'
import OpponentPanel from '@/components/OpponentPanel'
import { GlobalContext } from './_app'
import { useContext } from 'react'


export default function GamePage() {
    const { game } = useContext(GlobalContext);

    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            {game?.status === "playing" && <GamePanel/>}
            {game?.status === "playing" && <OpponentPanel/>}
            {game?.status === "choosing" && <h1> { game.chooser?.name } is choosing a word </h1>}
        </main>
        </>
    )
}
