import Link from 'next/link';
import Head from 'next/head'
import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GlobalContext } from './_app';
import { io, Socket } from 'socket.io-client';
import { GameEvents, Game, ServerToClientEvents, ClientToServerEvents } from '../../../common';


export default function HomePage() {
    const [room, setRoom] = useState<string>();
    const { socket, setSocket } = useContext(GlobalContext);
    const router = useRouter();

    useEffect( () => {
        const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://eli.local:3001");
        setSocket(socket);

        socket.on(GameEvents.NEW_GAME_CREATED, (roomId: string) => {
            router.push(`/lobby?room=${roomId}`);
        });
    }, []);

    function requestCreateRoom(e: any) {
        e.preventDefault();
        socket?.emit(GameEvents.REQUEST_NEW_GAME);
    }

    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            <button onClick={requestCreateRoom}>Create a Room</button>
            <input onChange={(e)=>setRoom(e.target.value)} type="text"/>
            <Link href={{pathname: "/lobby", query: {room}}}>Join a Room</Link>
        </main>
        </>
    )
}
