import Guess from '@/components/Guess';

export default function GuessGroup({guesses}: {guesses: string[][]}) {
    return (
        <>
            {[0, 1, 2, 3, 4, 5].map(num => <Guess key={num} guessNum={num} guesses={guesses}/>)}
        </>
    );
}