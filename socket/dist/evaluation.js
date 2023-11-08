import { promises as fsPromises } from 'fs';
import path from 'path';
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
    ;
}
async function getSolution() {
    return "BAGEL";
}
function mutateIfHits(guess, solution, byPosition, byLetter) {
    for (let i = 0; i < 5; ++i) {
        byLetter[guess[i]] = "miss";
        if (guess[i] === solution[i]) {
            byPosition[i] = "hit";
            byLetter[guess[i]] = "hit";
            solution[i] = "";
        }
    }
}
function mutateIfHas(guess, solution, byPosition, byLetter) {
    for (let i = 0; i < 5; ++i) {
        if (solution.includes(guess[i])) {
            byPosition[i] = "has";
            byLetter[guess[i]] = byLetter[guess[i]] !== "hit" ? "has" : "hit";
            solution[solution.indexOf(guess[i])] = "";
        }
    }
}
export async function evaluateGuess(guess) {
    const filePath = path.join(process.cwd(), "data/allowed.txt");
    const validator = new FileWordValidator(filePath);
    const accepted = await validator.validateWord(guess);
    if (!accepted)
        return { accepted };
    const solution = (await getSolution()).split("");
    const resultByPosition = Array(5).fill("miss");
    const resultByLetter = {};
    mutateIfHits(guess, solution, resultByPosition, resultByLetter);
    mutateIfHas(guess, solution, resultByPosition, resultByLetter);
    return { resultByPosition, resultByLetter, accepted };
}
