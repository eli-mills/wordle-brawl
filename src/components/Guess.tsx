import Letter from '@/components/Letter'

type GuessProps = {
    guesses: string[][],
    guessNum: number
}

export default function Guess({guessNum, guesses}: GuessProps) {
    return (
        <div>
            {[0, 1, 2, 3, 4].map(num => <Letter key={num} letterNum={num} guessNum={guessNum} guesses={guesses}/>)}
        </div>
    )
}