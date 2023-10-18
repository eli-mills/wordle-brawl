import Link from 'next/link';
import Head from 'next/head'
import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GlobalContext } from './_app';
import { io } from 'socket.io-client';
import * as GameEvents from '../../../common/game-events';
import { GameStateData } from '../../../common/game-setup-types';


export default function HomePage() {
    const [room, setRoom] = useState<string>();
    const { socket, setSocket } = useContext(GlobalContext);
    const router = useRouter();

    useEffect( () => {
        const socket = io("http://localhost:3001");
        setSocket(socket);
        socket.on(GameEvents.NEW_ROOM_CREATED, (data: GameStateData) => {
            router.push(`/lobby?room=${data.roomId}`);
        });
    }, []);

    function requestCreateRoom(e: any) {
        e.preventDefault();
        socket?.emit(GameEvents.REQUEST_NEW_ROOM);
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
