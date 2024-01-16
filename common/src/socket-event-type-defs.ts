import * as GameEvents from "./game-events.js";
import * as types from "./game-types.js";

export interface ServerToClientEvents {
  [GameEvents.EVALUATION]: (data: types.EvaluationResponseData) => void;
  [GameEvents.UPDATE_GAME_STATE]: (data: types.Game) => void;
  [GameEvents.UPDATE_PLAYER]: (data: types.Player) => void;
  [GameEvents.NEW_GAME_CREATED]: (newRoomId: string) => void;
  [GameEvents.NO_ROOMS_AVAILABLE]: () => void;
  [GameEvents.BEGIN_GAME]: () => void;
}

export interface ClientToServerEvents {
  [GameEvents.DECLARE_NAME]: (
    playerName: string,
    callback: (result: DeclareNameResponse) => void
  ) => void;
  [GameEvents.GUESS]: (guess: string) => void;
  [GameEvents.REQUEST_NEW_GAME]: (callback: (response: NewGameRequestResponse) => void) => void;
  [GameEvents.REQUEST_JOIN_GAME]: (
    room: string,
    callback: (response: JoinRequestResponse) => void
  ) => void;
  [GameEvents.REQUEST_BEGIN_GAME]: () => void;
  [GameEvents.CHECK_CHOSEN_WORD_VALID]: (
    word: string,
    callback: (isValid: boolean) => void
  ) => void;
  [GameEvents.CHOOSE_WORD]: (word: string) => void;
  [GameEvents.START_OVER]: () => void;
  [GameEvents.REQUEST_VALID_WORD]: (
    callback: (validWord: string) => void
  ) => void;
    [GameEvents.SAY_HELLO]: (callback: () => void) => void;
    [GameEvents.REQUEST_GAME_STATE]: () => void;
}

export type JoinRequestResponse = "OK" | "DNE" | "MAX";
export type DeclareNameResponse = "OK" | "DUP" | "EMPTY";
export type NewGameRequestResponse = {roomsAvailable: boolean, roomId: string}
