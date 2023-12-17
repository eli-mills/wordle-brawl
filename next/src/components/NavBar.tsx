import styles from '@/styles/NavBar.module.css'
import Link from 'next/link'
import ModalOverlay from './ModalOverlay'
import Rules from './Rules'
import About from './About'

import { useState } from 'react'

export default function NavBar() {
    const [showRules, setShowRules] = useState(false)
    const [showAbout, setShowAbout] = useState(false)

    return (
        <>
            <nav className={styles.navBar}>
                <ul>
                    <h1>
                        <Link href={'/'}>Wordle Brawl</Link>
                    </h1>
                    <li>
                        <Link href={'/'}>Home</Link>
                    </li>
                    <li>
                        <a
                            className={styles.navBarLink}
                            onClick={() => setShowRules(true)}
                        >
                            Rules
                        </a>
                    </li>
                    <li>
                        <a
                            className={styles.navBarLink}
                            onClick={() => setShowAbout(true)}
                        >
                            About
                        </a>
                    </li>
                </ul>
            </nav>
            {showRules && (
                <ModalOverlay setShowModal={setShowRules}>
                    <Rules />
                </ModalOverlay>
            )}
            {showAbout && (
                <ModalOverlay setShowModal={setShowAbout}>
                    <About />
                </ModalOverlay>
            )}
        </>
    )
}
