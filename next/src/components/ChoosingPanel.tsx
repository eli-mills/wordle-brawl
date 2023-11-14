import { useContext, useState, FormEvent } from "react"
import { GlobalContext } from "@/pages/_app"
import { GameEvents } from "../../../common";

export default function ChoosingPanel() {
    const { socket } = useContext(GlobalContext);
    const [ chosenWord, setChosenWord ] = useState("");
    const [ wordIsValid, setWordIsValid ] = useState(false);

    async function onWordChange(e: React.ChangeEvent<HTMLInputElement>) : Promise<void> {
        const newWordUpper = e.target.value.toUpperCase();
        e.target.value = newWordUpper;
        setChosenWord(newWordUpper);
        
        if (newWordUpper.length === 5) {
            socket?.emit(GameEvents.CHECK_CHOSEN_WORD_VALID, newWordUpper, (isValid: boolean) => {
                setWordIsValid(isValid);
            });
        }
    }

    const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        socket?.emit(GameEvents.CHOOSE_WORD, chosenWord)
        return false;
    }

    return (
        <>
            <form onSubmit={onFormSubmit}>
                <h2> Pick a word for others to guess: </h2>
                <input id="chosenWord" type="text" onChange={onWordChange} maxLength={5}/>
                { chosenWord.length < 5 && <p color="red"> Word must be 5 letters </p> }
                { chosenWord.length === 5 && !wordIsValid && <p color="red"> Word is not valid </p> }
                { chosenWord.length === 5 && wordIsValid && <button type="submit"> Submit </button> }
            </form>
        </>
    )
}