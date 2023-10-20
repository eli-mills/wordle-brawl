import { promises as fsPromises } from 'fs';
import path from 'path';
import { EvaluationRequestData, EvaluationResponseData, ColorData } from '../../common/dist/evaluation-types';
import { Color } from '../../common/dist/evaluation-types.js';


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
    const guessColors : Color[] = Array(5).fill(Color.Grey);
    const keyColors : Record<string, Color> = {};
    const solution : string[] = (await getSolution()).split("");

    // Green pass
    for (let i = 0; i < 5; ++i) {
        keyColors[guess[i]] = Color.Grey;
        if (guess[i] === solution[i]) {
            guessColors[i] = Color.Green;
            keyColors[guess[i]] = Color.Green;
            solution[i] = "";
        }
    }

    // Yellow pass   
    for (let i = 0; i < 5; ++i) {
        if (solution.includes(guess[i])) {
            guessColors[i] = Color.Yellow;
            keyColors[guess[i]] = keyColors[guess[i]] !== Color.Green ? Color.Yellow : Color.Green;
            solution[solution.indexOf(guess[i])] = "";
        }
    }

    return { guessColors, keyColors };
}

export const evaluateGuess = async (guess: string) : Promise<EvaluationResponseData> => {
    const filePath : string = path.join(process.cwd(),"data/allowed.txt");
    const validator = new FileWordValidator(filePath);
    const accepted : boolean = await validator.validateWord(guess);
    const { guessColors, keyColors } = accepted ? await getColors(guess) : { guessColors: [], keyColors: {}};
    return {
        accepted,
        guessColors,
        keyColors
    }
}
