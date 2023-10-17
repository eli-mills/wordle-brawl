import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { createContext, useState } from 'react'
import { Socket } from 'socket.io-client';

interface GlobalContext {
    socket: Socket | undefined,
    setSocket: (_: Socket) => void,
    opponentList: string[],
    setOpponentList: (_: string[]) => void
    room: string,
    setRoom: (_: string) => void
}

const initialGlobalContext: GlobalContext = {
    socket: undefined, 
    setSocket: ()=>{},
    opponentList: [],
    setOpponentList: ()=>{},
    room: "",
    setRoom: ()=>{}
};

export const GlobalContext = createContext<GlobalContext>(initialGlobalContext);

export default function App({ Component, pageProps }: AppProps) {
    const [socket, setSocket] = useState<Socket>();
    const [opponentList, setOpponentList] = useState<string[]>([]);
    const [room, setRoom] = useState<string>("");

    const globalState : GlobalContext = {
        socket, 
        setSocket, 
        opponentList, 
        setOpponentList,
        room,
        setRoom
    }

    return <GlobalContext.Provider value={{...globalState}}><Component {...pageProps} /></GlobalContext.Provider>
}
