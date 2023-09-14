import styles from '@/styles/Keyboard.module.css';

export default function EnterKey( {setState} : {setState : () => void}) {
    
    return <button className={styles.bigKey} onClick={setState}>ENTER</button>
}