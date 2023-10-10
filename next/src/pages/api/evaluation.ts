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

type ColorData = {
    guessColors: string[] | null,
    keyColors: Record<string, string> | null
}

export type EvaluationResponseData = {
  accepted: boolean,
  guessColors: string[] | null,
  keyColors: Record<string, string> | null
}

interface WordValidator {
    validateWord : (guess : string) => Promise<boolean>
}

class FileWordValidator implements WordValidator {
    constructor (private readonly filePath : string) { }
    validateWord = async (guess : string) => {
        const file = await fsPromises.open(this.filePath);
        try {
            for await (const word of file.readLines()) {
                if (word.toUpperCase() === guess) return true;
            }
            return false;

        } finally {
            file.close();
        }
    };
}

const getSolution = async () : Promise<string> => {
    return "BAGEL";
}

const getColors = async (guess : string) : Promise<ColorData> => {
    const guessColors : string[] = Array(5).fill("lightslategrey");
    const keyColors : Record<string, string> = {};
    const solution : string[] = (await getSolution()).split("");

    // Green pass
    for (let i = 0; i < 5; ++i) {
        keyColors[guess[i]] = "lightslategrey";
        if (guess[i] === solution[i]) {
            guessColors[i] = "green";
            keyColors[guess[i]] = "green";
            solution[i] = "";
        }
    }

    // Yellow pass   
    for (let i = 0; i < 5; ++i) {
        if (solution.includes(guess[i])) {
            guessColors[i] = "goldenrod";
            keyColors[guess[i]] = keyColors[guess[i]] !== "green" ? "goldenrod" : "green";
            solution[solution.indexOf(guess[i])] = "";
        }
    }

    return { guessColors, keyColors };
}

const evaluateGuess = async (guess: string) : Promise<EvaluationResponseData> => {
    const filePath : string = path.join(process.cwd(),"src/data/wordle-answers-alphabetical.txt");
    const validator = new FileWordValidator(filePath);
    const accepted : boolean = await validator.validateWord(guess);
    const { guessColors, keyColors } = accepted ? await getColors(guess) : { guessColors: null, keyColors: null};
    return {
        accepted,
        guessColors,
        keyColors
    }
}

export default async function handler(
  req: EvaluationRequest,
  res: NextApiResponse<EvaluationResponseData>
) {
    const evalResponse : EvaluationResponseData = await evaluateGuess(req.body.guess);
    res.status(200).json(evalResponse);
}