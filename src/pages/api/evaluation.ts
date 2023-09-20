// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import * as fsPromises from 'fs/promises';
import path from 'path';

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

const guessIsValid = async (guess: string) : Promise<boolean> => {
    const file = await fsPromises.open(path.join(process.cwd(),"src/data/wordle-answers-alphabetical.txt"));
    try {
        for await (const word of file.readLines()) {
            if (word.toUpperCase() === guess) return true;
        }
        return false;

    } finally {
        file.close();
    }
}

const getColors = (guess : string) : string[] => {
    const colors : string[] = Array(5).fill("lightslategrey");
    const answer : string[] = "BAGEL".split("");         // TEMPORARY ANSWER, SHOULD RETRIEVE FROM DB //

    // Green pass
    for (let i = 0; i < 5; ++i) {
        if (guess[i] === answer[i]) {
            colors[i] = "green";
            answer[i] = "";
        }
    }

    // Yellow pass   
    for (let i = 0; i < 5; ++i) {
        if (answer.includes(guess[i])) {
            colors[i] = "goldenrod";
            answer[answer.indexOf(guess[i])] = "";
        }
    }

    return colors;
}

const evaluateGuess = async (guess: string) : Promise<EvaluationResponseData> => {
    const accepted : boolean = await guessIsValid(guess);
    const colors : string[] = accepted ? getColors(guess) : Array(5).fill("");
    return {
        accepted,
        colors
    }
}

export default async function handler(
  req: EvaluationRequest,
  res: NextApiResponse<EvaluationResponseData>
) {
    const evalResponse : EvaluationResponseData = await evaluateGuess(req.body.guess);
    res.status(200).json(evalResponse);
}
