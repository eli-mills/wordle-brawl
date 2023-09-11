type KeyProps = {
    letter: string;
    setState: (letter: string) => void;
}

export default function Key({letter, setState}: KeyProps) {
    return (
        <button onClick={(e)=>setState(letter)}>
            {letter}
        </button>
    )
}