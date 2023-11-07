import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GlobalContext } from './_app';
import { useEffect, useContext, useState } from 'react';
import { GameEvents } from "../../../common";
import NameModal from '@/components/NameModal';


export default function LobbyPage() {
    const {
        socket, 
        player, 
        game
    } = useContext(GlobalContext);
    const router = useRouter();
    const { room: queryRoom } = router.query as {room: string};
    const [displayModal, setDisplayModal] = useState<boolean>(true);

    useEffect(()=>{
        queryRoom && socket && console.log(`Sending joinRoomRequest for room ${queryRoom}`);
        queryRoom && socket?.emit(GameEvents.REQUEST_JOIN_GAME, queryRoom)
    }, [queryRoom]);

    useEffect(()=> {
        socket?.on(GameEvents.GAME_DNE, () => alert("The requested room does not exist."));
        return () => {
            socket?.off(GameEvents.GAME_DNE);
        }
    }, []);

    return (
        <>
            <Head>
                <title>Wordle WS</title>
            </Head>
            <main>
                {socket && (<div>
                    <h1>Room {game?.roomId}</h1>
                    <ul>
                        {game?.playerList.map((currPlayer, index) => <li key={index}>{currPlayer.name}</li>)}
                    </ul>
                    {displayModal && <NameModal setDisplayModal={setDisplayModal}/>}
                    {player?.isLeader && <Link href={"/game"}>Start Game</Link>}
                </div>)}
                {!socket && <h1>NOT CONNECTED</h1>}
            </main>
        </>
    )
}
