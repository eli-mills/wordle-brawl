export type Result = "hit" | "has" | "miss"

export type EvaluationRequestData = {
    guess: string
}

export type EvaluationResponseData = Partial<Omit<OpponentEvaluationResponseData, "playerName">> & {
    accepted: boolean
}

export type OpponentEvaluationResponseData = {
    resultByPosition: Result[],
    resultByLetter: Record<string, Result>,
    accepted: boolean,
    playerName: string
}

export type PlayerDisconnectedData = {
    playerName: string
}
