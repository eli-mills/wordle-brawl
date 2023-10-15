import Link from 'next/link';
import Head from 'next/head'
import GamePanel from '@/components/GamePanel'

export default function Home() {
    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            <Link href={"/game"}>Start</Link>
        </main>
        </>
    )
}
