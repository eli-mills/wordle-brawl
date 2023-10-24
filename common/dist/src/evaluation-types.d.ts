export type Result = "hit" | "has" | "miss";
export type EvaluationRequestData = {
    guess: string;
};
export type EvaluationResponseData = {
    resultByPosition?: Result[];
    resultByLetter?: Record<string, Result>;
    accepted: boolean;
};
export type OpponentEvaluationResponseData = EvaluationResponseData & {
    playerName: string;
};
//# sourceMappingURL=evaluation-types.d.ts.map