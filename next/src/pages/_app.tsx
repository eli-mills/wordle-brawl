import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { createContext, useState } from 'react'
import { Socket } from 'socket.io-client';

interface GlobalContext {
    socket: Socket | undefined,
    setSocket: (_: Socket) => void,
    opponentList: string[],
    setOpponentList: (_: string[]) => void
}

const initialGlobalContext: GlobalContext = {
    socket: undefined, 
    setSocket: ()=>{},
    opponentList: [],
    setOpponentList: ()=>{}
};

export const GlobalContext = createContext<GlobalContext>(initialGlobalContext);

export default function App({ Component, pageProps }: AppProps) {
    const [socket, setSocket] = useState<Socket>();
    const [opponentList, setOpponentList] = useState<string[]>([]);

    const globalState = {
        socket, 
        setSocket, 
        opponentList, 
        setOpponentList
    }

    return <GlobalContext.Provider value={{...globalState}}><Component {...pageProps} /></GlobalContext.Provider>
}
