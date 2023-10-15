import Link from 'next/link';
import Head from 'next/head'
import { useState } from 'react';
export default function HomePage() {
    const [room, setRoom] = useState<string>();

    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            <Link href={"/lobby"}>Create a Room</Link>
            <input onChange={(e)=>setRoom(e.target.value)} type="text"/>
            <Link href={{pathname: "/lobby", query: {room}}}>Join a Room</Link>
        </main>
        </>
    )
}
