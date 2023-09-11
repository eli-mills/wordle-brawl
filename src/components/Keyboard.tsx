import Key from '@/components/Key';

const firstRow: string[] = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const secondRow: string[] = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const thirdRow: string[] = ["Z", "X", "C", "V", "B", "N", "M"];

const foo = (letter: string) : void => console.log(letter);

export default function Keyboard() {
    return (
        <>
            {
                firstRow.map(((letter, index) => <Key letter={letter} setState={foo} key={index}/>))
            }
            {

                secondRow.map(((letter, index) => <Key letter={letter} setState={foo} key={index}/>))
            }
            {
                thirdRow.map(((letter, index) => <Key letter={letter} setState = {foo} key={index}/>))
            }
        </>
    )
}