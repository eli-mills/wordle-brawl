export declare enum Color {
    Green = 0,
    Yellow = 1,
    Grey = 2
}
export type EvaluationRequestData = {
    guess: string;
};
export type ColorData = {
    guessColors: Color[];
    keyColors: Record<string, Color>;
};
export type EvaluationResponseData = ColorData & {
    accepted: boolean;
};
export type OpponentEvaluationResponseData = EvaluationResponseData & {
    playerName: string;
};
//# sourceMappingURL=evaluation-types.d.ts.map