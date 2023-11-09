import { promises as fsPromises } from 'fs';
import path from 'path';
import { getCurrentAnswer } from './db.js';
const ALLOWED_GUESSES_PATH = 'data/allowed.txt';
export const ALLOWED_ANSWERS_PATH = 'data/answers.txt';
export class FileWordValidator {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async validateWord(wordToValidate) {
        const file = await fsPromises.open(this.filePath);
        try {
            for await (const validWord of file.readLines()) {
                if (validWord.toUpperCase() === wordToValidate.toUpperCase())
                    return true;
            }
            return false;
        }
        finally {
            file.close();
        }
    }
}
function mutateIfHits(guess, solution, byPosition, byLetter) {
    for (let i = 0; i < 5; ++i) {
        byLetter[guess[i]] = 'miss';
        if (guess[i] === solution[i]) {
            byPosition[i] = 'hit';
            byLetter[guess[i]] = 'hit';
            solution[i] = '';
        }
    }
}
function mutateIfHas(guess, solution, byPosition, byLetter) {
    for (let i = 0; i < 5; ++i) {
        if (solution.includes(guess[i])) {
            byPosition[i] = 'has';
            byLetter[guess[i]] = byLetter[guess[i]] !== 'hit' ? 'has' : 'hit';
            solution[solution.indexOf(guess[i])] = '';
        }
    }
}
export async function evaluateGuess(guess, roomId) {
    const filePath = path.join(process.cwd(), ALLOWED_GUESSES_PATH);
    const validator = new FileWordValidator(filePath);
    const accepted = await validator.validateWord(guess);
    if (!accepted)
        return { accepted, correct: false };
    const solution = (await getCurrentAnswer(roomId)).toUpperCase();
    const solutionSplit = solution.split('');
    if (guess === solution)
        return {
            accepted,
            correct: true,
            resultByLetter: Object.fromEntries(solutionSplit.map((letter) => [letter, 'hit'])),
            resultByPosition: new Array(5).fill('hit'),
        };
    const resultByPosition = Array(5).fill('miss');
    const resultByLetter = {};
    mutateIfHits(guess, solutionSplit, resultByPosition, resultByLetter);
    mutateIfHas(guess, solutionSplit, resultByPosition, resultByLetter);
    return { resultByPosition, resultByLetter, accepted, correct: false };
}
