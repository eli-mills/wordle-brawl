import * as GameEvents from "./game-events.js";
import * as types from "./types.js";
export interface ServerToClientEvents {
    [GameEvents.EVALUATION]: (data: types.EvaluationResponseData) => void;
    [GameEvents.UPDATE_GAME_STATE]: (data: types.Game) => void;
    [GameEvents.UPDATE_PLAYER]: (data: types.Player) => void;
    [GameEvents.NEW_GAME_CREATED]: (newRoomId: string) => void;
    [GameEvents.GAME_DNE]: () => void;
    [GameEvents.NO_ROOMS_AVAILABLE]: () => void;
    [GameEvents.BEGIN_GAME]: () => void;
}
export interface ClientToServerEvents {
    [GameEvents.DECLARE_NAME]: (playerName: string) => void;
    [GameEvents.GUESS]: (guess: string) => void;
    [GameEvents.REQUEST_NEW_GAME]: () => void;
    [GameEvents.REQUEST_JOIN_GAME]: (room: string) => void;
    [GameEvents.REQUEST_BEGIN_GAME]: () => void;
}
//# sourceMappingURL=socket-event-type-defs.d.ts.map