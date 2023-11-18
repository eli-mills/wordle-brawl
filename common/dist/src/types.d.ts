/************************************************
 *                                              *
 *                 GAMEPLAY TYPES               *
 *                                              *
 ************************************************/
export type Result = "hit" | "has" | "miss";
export type EvaluationResponseData = {
    resultByPosition?: Result[];
    resultByLetter?: Record<string, Result>;
    accepted: boolean;
    correct: boolean;
};
/************************************************
 *                                              *
 *                    MODELS                    *
 *                                              *
 ************************************************/
export type GameStatus = "lobby" | "choosing" | "playing";
export type Game = {
    roomId: string;
    leader: Player;
    readonly playerList: Record<string, Player>;
    status: GameStatus;
    chooser: Player | null;
    currentAnswer: string;
};
export type Player = {
    socketId: string;
    roomId: string;
    name: string;
    isLeader: boolean;
    readonly guessResultHistory: Result[][];
    score: number;
    finished: boolean;
};
//# sourceMappingURL=types.d.ts.map