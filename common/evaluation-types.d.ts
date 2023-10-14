export type EvaluationRequestData = {
    guess: string
}

export type EvaluationResponseData = {
    accepted: boolean,
    guessColors: string[] | null,
    keyColors: Record<string, string> | null
}

export type OpponentEvaluationResponseData = EvaluationResponseData & {
    playerName: string | undefined
}

