import styles from '@/styles/NavBar.module.css'
import { RxCross1 } from 'react-icons/rx'

type ModalOverlayProps = {
    children: React.ReactNode
    setShowModal: (_: boolean) => void
}

export default function ModalOverlay({
    children,
    setShowModal,
}: ModalOverlayProps) {
    return (
        <div className={styles.modalBackground} onClick={()=>setShowModal(false)}>
            <div className={styles.modalOverlay}>
                <RxCross1
                    className={styles.closeModal}
                    onClick={() => setShowModal(false)}
                />
                {children}
                <button onClick={() => setShowModal(false)}> Close </button>
            </div>
        </div>
    )
}
