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

export type PlayerRoundResults = {
  efficiencyPoints: number;
  speedBonus: boolean;
  numberOfGuesses: number;
};

export type RoundResults = Record<string, PlayerRoundResults>;

/************************************************
 *                                              *
 *                    MODELS                    *
 *                                              *
 ************************************************/
export type GameStatus = "lobby" | "choosing" | "playing" | "end";
type PlayerStatus = "playing" | "finished";

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
  readonly guessResultHistory: Result[][];
  score: number;
  status: PlayerStatus;
  createdTimestamp: number;
};
