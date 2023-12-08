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
            <h3>{player.name}: {player.score}</h3>
            {player.guessResultHistory.map((row: Result[], key: number)=><p key={key}>{convertGuessRowToEmojis(row)}</p>)}
        </div>
    )
}