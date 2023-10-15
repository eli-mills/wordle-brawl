import Head from 'next/head'
import GamePanel from '@/components/GamePanel'
import OpponentPanel from '@/components/OpponentPanel'


export default function GamePage() {

    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            <GamePanel/>
            <OpponentPanel/>
        </main>
        </>
    )
}
