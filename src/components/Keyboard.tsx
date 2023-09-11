import Key from '@/components/Key';

const firstRow: string[] = ["QWERTYUIOP"];
const secondRow: string[] = ["ASDFGHJKL"];
const thirdRow: string[] = ["ZXCVBNM"];

const foo = (letter: string) : void => console.log(letter);

export default function Keyboard() {
    return (
        <>
            <Key letter='Q' setState={foo}/>
        </>
    )
}