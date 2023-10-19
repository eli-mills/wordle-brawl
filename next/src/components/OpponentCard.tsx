import styles from '@/styles/OpponentCard.module.css';
import { Color } from '../../../common/evaluation-types';

type OpponentCardArgs = {
    playerName: string,
    oppGuessHistory: Map<string, Color[][]>
}

const colorEmojiMap = new Map<Color, string> ([
    [Color.Green, "🟩"],
    [Color.Grey, "⬜️"],
    [Color.Yellow, "🟨"]
]);

function convertGuessRowToEmojis(guessRow: Color[]) : string {
    return guessRow.map((emoji) => colorEmojiMap.get(emoji)).join("");
}

export default function OpponentCard ( {playerName, oppGuessHistory}: OpponentCardArgs ) {
    return (
        <div className={styles.opponentCard}>
            <p>{playerName}</p>
            {oppGuessHistory.get(playerName)?.map((row: Color[])=><p>{convertGuessRowToEmojis(row)}</p>)}
        </div>
    )
}