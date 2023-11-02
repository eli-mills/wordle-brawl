import { Result } from "./evaluation-types"

export type JoinRoomRequestData = {
    room: string
}

export type Game = {
    roomId: string,
    leader: Player,
    playerList: Player[]
};

export type Player = {
    socketId: string,
    roomId: string,
    name: string,
    guessResultHistory: Result[][]
}
