import { promises as fsPromises } from 'fs';
import { getGame } from './db.js';
export class FileWordValidator {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    static _ALLOWED_GUESSES_PATH = 'data/allowed.txt';
    static _ALLOWED_ANSWERS_PATH = 'data/answers.txt';
    static get ALLOWED_GUESSES_PATH() {
        return FileWordValidator._ALLOWED_GUESSES_PATH;
    }
    static get ALLOWED_ANSWERS_PATH() {
        return FileWordValidator._ALLOWED_ANSWERS_PATH;
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
    async getRandomValidWord() {
        let file = await fsPromises.open(this.filePath);
        try {
            let numberOfLines = 0;
            let output = '';
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const word of file.readLines()) {
                numberOfLines += 1;
            }
            console.log(`Random word: total number of lines = ${numberOfLines}`);
            let randomLineNumber = Math.floor(Math.random() * numberOfLines);
            console.log(`Picked random line: ${randomLineNumber}`);
            file = await fsPromises.open(this.filePath);
            for await (const word of file.readLines()) {
                randomLineNumber--;
                if (randomLineNumber <= 0) {
                    output = word;
                    break;
                }
            }
            console.log(`Got random word ${output}`);
            return output.toUpperCase();
        }
        finally {
            file.close();
        }
    }
}
function mutateIfHits(guess, solution, byPosition, byLetter) {
    for (let i = 0; i < 5; ++i) {
        if (guess[i] === solution[i]) {
            byPosition[i] = 'hit';
            byLetter[guess[i]] = 'hit';
        }
        else {
            byPosition[i] = 'miss';
            byLetter[guess[i]] = byLetter[guess[i]] === 'hit' ? 'hit' : 'miss';
        }
    }
}
function mutateIfHas(guess, solution, byPosition, byLetter) {
    const tempSolution = Array.from(solution);
    for (let i = 0; i < 5; ++i) {
        if (tempSolution.includes(guess[i])) {
            byPosition[i] = byPosition[i] !== 'hit' ? 'has' : 'hit';
            byLetter[guess[i]] = byLetter[guess[i]] !== 'hit' ? 'has' : 'hit';
            tempSolution[tempSolution.indexOf(guess[i])] = '';
        }
    }
}
export async function evaluateGuess(guess, roomId, validator) {
    const accepted = await validator.validateWord(guess);
    if (!accepted)
        return { accepted, correct: false };
    const game = await getGame(roomId);
    const answerSplit = game.currentAnswer.split('');
    if (guess === game.currentAnswer)
        return {
            accepted,
            correct: true,
            resultByLetter: Object.fromEntries(answerSplit.map((letter) => [letter, 'hit'])),
            resultByPosition: new Array(5).fill('hit'),
        };
    const resultByPosition = Array(5).fill('miss');
    const resultByLetter = {};
    mutateIfHits(guess, answerSplit, resultByPosition, resultByLetter);
    console.log(JSON.stringify(resultByPosition));
    console.log(JSON.stringify(resultByLetter));
    mutateIfHas(guess, answerSplit, resultByPosition, resultByLetter);
    console.log(JSON.stringify(resultByPosition));
    console.log(JSON.stringify(resultByLetter));
    return { resultByPosition, resultByLetter, accepted, correct: false };
}
