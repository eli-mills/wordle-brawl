import { useContext, useState } from "react"
import { GlobalContext } from "@/pages/_app"
import { GameEvents } from "../../../common";

export default function ChoosingPanel() {
    const { player, game, socket } = useContext(GlobalContext);
    const [ chosenWord, setChosenWord ] = useState("");
    const [ wordIsValid, setWordIsValid ] = useState(false);

    async function onWordChange(e: React.ChangeEvent<HTMLInputElement>) : Promise<void> {
        setChosenWord(e.target.value);
        // use  socketio acknowledgment to evaluate wordIsValid
        if (e.target.value.length === 5) {
            socket?.emit(GameEvents.CHECK_CHOSEN_WORD_VALID, e.target.value, (isValid: boolean) => {
                setWordIsValid(isValid);
            });
        }
    }

    return (
        <>
            <div>
                <h2> Pick a word for others to guess: </h2>
                <input id="chosenWord" type="text" onChange={onWordChange} maxLength={5}/>
                { chosenWord.length < 5 && <p color="red"> Word must be 5 letters </p> }
                { chosenWord.length === 5 && !wordIsValid && <p color="red"> Word is not valid </p> }
                { chosenWord.length === 5 && wordIsValid && <button> Submit </button> }
            </div>
        </>
    )
}