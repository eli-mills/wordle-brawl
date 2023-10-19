export type EvaluationRequestData = {
    guess: string
}

export type ColorData = {
    guessColors: Color[],
    keyColors: Record<string, Color>
}

export type EvaluationResponseData = ColorData & {
    accepted: boolean,
}

export type OpponentEvaluationResponseData = EvaluationResponseData & {
    playerName: string
}

export enum Color {
    Green,
    Yellow,
    Grey
}

