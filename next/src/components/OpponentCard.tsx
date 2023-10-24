import styles from '@/styles/OpponentCard.module.css';
import { Result } from '../../../common';

type OpponentCardArgs = {
    playerName: string,
    oppGuessHistory: Map<string, Result[][]>
}

const colorEmojiMap = new Map<Result, string> ([
    ["hit", "🟩"],
    ["miss", "⬜️"],
    ["has", "🟨"]
]);

function convertGuessRowToEmojis(guessRow: Result[]) : string {
    return guessRow.map((emoji) => colorEmojiMap.get(emoji)).join("");
}

export default function OpponentCard ( {playerName, oppGuessHistory}: OpponentCardArgs ) {
    return (
        <div className={styles.opponentCard}>
            <p>{playerName}</p>
            {oppGuessHistory.get(playerName)?.map((row: Result[])=><p>{convertGuessRowToEmojis(row)}</p>)}
        </div>
    )
}