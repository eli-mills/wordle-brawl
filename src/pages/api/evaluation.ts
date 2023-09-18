// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

interface EvaluationRequest extends NextApiRequest {
    body: EvaluationRequestData
}

export type EvaluationRequestData = {
    guess: string
}

export type EvaluationResponseData = {
  accepted: boolean,
  colors: string[]
}

const guessIsValid = (guess: string) : boolean => {

    return false;
}

const evaluateGuess = (guess: string) : string[] => {
    const colors : string[] = Array(5).fill("grey");
    const answer : string[] = "BAGEL".split("");         // TEMPORARY ANSWER, SHOULD RETRIEVE FROM DB //

    for (let i = 0; i < 5; ++i) {
        if (guess[i] === answer[i]) {
            colors[i] = "green";
            answer[i] = "";
        } else if (answer.includes(guess[i])) {
            colors[i] = "yellow";
            answer[answer.indexOf(guess[i])] = "";
        }
    }

    return colors;
}

export default function handler(
  req: EvaluationRequest,
  res: NextApiResponse<EvaluationResponseData>
) {
    const colors : string[] = evaluateGuess(req.body.guess);
    const evalResponse : EvaluationResponseData = {
        accepted: true,
        colors
    };
    res.status(200).json(evalResponse);
}
