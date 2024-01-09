import { promises as fsPromises } from 'fs'
import { EvaluationResponseData, Result } from '../../common/dist/index.js'
import { getGame } from './db.js'

interface WordValidator {
    validateWord: (guess: string) => Promise<boolean>
    getRandomValidWord: () => Promise<string>
}

export class FileWordValidator implements WordValidator {
    constructor(private readonly filePath: string) {}
    private static readonly _ALLOWED_GUESSES_PATH = 'data/allowed.txt'
    private static readonly _ALLOWED_ANSWERS_PATH = 'data/answers.txt'

    public static get ALLOWED_GUESSES_PATH() {
        return FileWordValidator._ALLOWED_GUESSES_PATH
    }
    public static get ALLOWED_ANSWERS_PATH() {
        return FileWordValidator._ALLOWED_ANSWERS_PATH
    }

    async validateWord(wordToValidate: string): Promise<boolean> {
        const file = await fsPromises.open(this.filePath)
        try {
            for await (const validWord of file.readLines()) {
                if (validWord.toUpperCase() === wordToValidate.toUpperCase())
                    return true
            }
            return false
        } finally {
            file.close()
        }
    }

    async getRandomValidWord(): Promise<string> {
        let file = await fsPromises.open(this.filePath)
        try {
            let numberOfLines = 0
            let output = ''
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const word of file.readLines()) {
                numberOfLines += 1
            }
            console.log(`Random word: total number of lines = ${numberOfLines}`)
            let randomLineNumber = Math.floor(Math.random() * numberOfLines)
            console.log(`Picked random line: ${randomLineNumber}`)

            file = await fsPromises.open(this.filePath)
            for await (const word of file.readLines()) {
                randomLineNumber--
                if (randomLineNumber <= 0) {
                    output = word
                    break
                }
            }
            console.log(`Got random word ${output}`)
            return output.toUpperCase()
        } finally {
            file.close()
        }
    }
}

function mutateIfHits(
    guess: string,
    solution: string[],
    byPosition: Result[],
    byLetter: Record<string, Result>
): void {
    for (let i = 0; i < 5; ++i) {
        if (guess[i] === solution[i]) {
            byPosition[i] = 'hit'
            byLetter[guess[i]] = 'hit'
        } else {
            byPosition[i] = 'miss'
            byLetter[guess[i]] = byLetter[guess[i]] === 'hit' ? 'hit' : 'miss'
        }
    }
}

function mutateIfHas(
    guess: string,
    solution: string[],
    byPosition: Result[],
    byLetter: Record<string, Result>
): void {
    const tempSolution = Array.from(solution);
    for (let i = 0; i < 5; ++i) {
        if (tempSolution.includes(guess[i])) {
            byPosition[i] = byPosition[i] !== 'hit' ? 'has' : 'hit'
            byLetter[guess[i]] = byLetter[guess[i]] !== 'hit' ? 'has' : 'hit'
            tempSolution[tempSolution.indexOf(guess[i])] = ''
        }
    }
}

export async function evaluateGuess(
    guess: string,
    roomId: string,
    validator: WordValidator
): Promise<EvaluationResponseData> {
    const accepted = await validator.validateWord(guess)

    if (!accepted) return { accepted, correct: false }

    const game = await getGame(roomId)
    const answerSplit = game.currentAnswer.split('')

    if (guess === game.currentAnswer)
        return {
            accepted,
            correct: true,
            resultByLetter: Object.fromEntries(
                answerSplit.map((letter) => [letter, 'hit'])
            ),
            resultByPosition: new Array(5).fill('hit'),
        }

    const resultByPosition = Array<Result>(5).fill('miss')
    const resultByLetter: Record<string, Result> = {}

    mutateIfHits(guess, answerSplit, resultByPosition, resultByLetter)
    mutateIfHas(guess, answerSplit, resultByPosition, resultByLetter)
    return { resultByPosition, resultByLetter, accepted, correct: false }
}
