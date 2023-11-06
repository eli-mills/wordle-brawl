export type Result = "hit" | "has" | "miss";
export type EvaluationResponseData = {
    resultByPosition?: Result[];
    resultByLetter?: Record<string, Result>;
    accepted: boolean;
};
//# sourceMappingURL=evaluation-types.d.ts.map