import Head from 'next/head'
import NameModal from '@/components/NameModal'
import GamePanel from '@/components/GamePanel'
import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client';


export default function Game() {
    const [socket, setSocket] = useState<Socket>();
    const [displayModal, setDisplayModal] = useState<boolean>(true);

    useEffect(()=>{
        const socket = io("http://localhost:3001");
        setSocket(socket);
    }, []);

    return (
        <>
        <Head>
            <title>Wordle WS</title>
        </Head>
        <main>
            {displayModal && <NameModal socket={socket} setDisplayModal={setDisplayModal}/>}
            <GamePanel socket={socket}/>
            {/*<InfoPanel />*/}
        </main>
        </>
    )
}
