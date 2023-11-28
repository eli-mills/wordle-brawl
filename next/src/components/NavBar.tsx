import styles from '@/styles/NavBar.module.css'
import Link from 'next/link'

export default function NavBar() {
    return (
        <nav className={styles.navBar}>
            <ul>
                <li><Link href={"/"}>Home</Link></li>
                <li>Rules</li>
                <li>About</li>
            </ul>
        </nav>
    )    
}