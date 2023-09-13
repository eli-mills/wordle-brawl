import Guess from '@/components/Guess';

export default function GuessGroup({currentGuess}: {currentGuess: string}) {
    return (
        <>
            <Guess />
            <Guess />
            <Guess />
            <Guess />
            <Guess />
            <Guess />
        </>
    );
}