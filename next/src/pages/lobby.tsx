import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GlobalContext } from './_app';
import { useEffect, useContext, useState } from 'react';
import { io } from 'socket.io-client';
import * as GameEvents from "../../../common/game-events";
import { JoinRoomRequestData } from "../../../common/game-setup-types";
import NameModal from '@/components/NameModal';


export default function LobbyPage() {
    const {
        socket, 
        setSocket, 
        opponentList,
        setOpponentList
    } = useContext(GlobalContext);
    const { room } = useRouter().query as {room: string};
    const [displayModal, setDisplayModal] = useState<boolean>(true);


    useEffect(()=>{
        const socket = io("http://localhost:3001");
        setSocket(socket);
    }, []);

    useEffect(()=> {
        if (room === undefined) {
            socket?.emit(GameEvents.REQUEST_NEW_ROOM);
        } else {
            const joinRoomRequest : JoinRoomRequestData = { room };
            socket?.emit(GameEvents.REQUEST_JOIN_ROOM, joinRoomRequest)
        }

        socket?.on(GameEvents.ROOM_DNE, () => alert("The requested room does not exist."));
        socket?.on(GameEvents.UPDATE_NAME_LIST, (updatedList: string[]) => setOpponentList(updatedList));

        return () => {
            socket?.off(GameEvents.ROOM_DNE);
            socket?.off(GameEvents.UPDATE_NAME_LIST);
        }
    }, [socket, opponentList])

    return (
        <>
            <Head>
                <title>Wordle WS</title>
            </Head>
            <main>
                <ul>
                    {opponentList.map(name => <li>{name}</li>)}
                </ul>
                {displayModal && <NameModal socket={socket} setDisplayModal={setDisplayModal}/>}
                <Link href={"/game"}>Start Game</Link>
            </main>
        </>
    )
}
