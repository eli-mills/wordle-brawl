import * as GameEvents from "./game-events.js";
import * as types from "./types.js";

export interface ServerToClientEvents {
  [GameEvents.EVALUATION]: (data: types.EvaluationResponseData) => void;
  [GameEvents.UPDATE_GAME_STATE]: (data: types.Game) => void;
  [GameEvents.UPDATE_PLAYER]: (data: types.Player) => void;
  [GameEvents.NEW_GAME_CREATED]: (newRoomId: string) => void;
  [GameEvents.NO_ROOMS_AVAILABLE]: () => void;
  [GameEvents.BEGIN_GAME]: () => void;
}

export interface ClientToServerEvents {
  [GameEvents.DECLARE_NAME]: (playerName: string, callback: (result : {accepted: boolean, duplicate: boolean}) => void) => void;
  [GameEvents.GUESS]: (guess: string) => void;
  [GameEvents.REQUEST_NEW_GAME]: () => void;
  [GameEvents.REQUEST_JOIN_GAME]: (room: string, callback: (response: JoinRequestResponse) => void) => void;
  [GameEvents.REQUEST_BEGIN_GAME]: () => void;
  [GameEvents.CHECK_CHOSEN_WORD_VALID]: (
    word: string,
    callback: (isValid: boolean) => void
  ) => void;
  [GameEvents.CHOOSE_WORD]: (word: string) => void;
}

export type JoinRequestResponse = "OK" | "DNE" | "MAX"
