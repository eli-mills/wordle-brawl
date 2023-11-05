import styles from '@/styles/OpponentCard.module.css';
import { Result, Player } from '../../../common';

type OpponentCardArgs = {
    player: Player,
}

const colorEmojiMap = new Map<Result, string> ([
    ["hit", "🟩"],
    ["miss", "⬜️"],
    ["has", "🟨"]
]);

function convertGuessRowToEmojis(guessRow: Result[]) : string {
    return guessRow.map((emoji) => colorEmojiMap.get(emoji)).join("");
}

export default function OpponentCard ( {player }: OpponentCardArgs ) {
    return (
        <div className={styles.opponentCard}>
            <p>{player.name}</p>
            {player.guessResultHistory.map((row: Result[])=><p>{convertGuessRowToEmojis(row)}</p>)}
        </div>
    )
}