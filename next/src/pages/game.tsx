import Head from 'next/head'
import GamePanel from '@/components/GamePanel'
import OpponentPanel from '@/components/OpponentPanel'
import { GlobalContext } from './_app'
import { useContext } from 'react'


export default function GamePage() {
    const { player } = useContext(GlobalContext);

    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            <h1> {player?.name} </h1>
            <GamePanel/>
            <OpponentPanel/>
        </main>
        </>
    )
}
