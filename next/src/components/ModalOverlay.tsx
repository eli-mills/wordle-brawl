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
        <div
            className={styles.modalBackground}
            onClick={(e) => {
                e.stopPropagation()
                setShowModal(false)
            }}
        >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <span
                    className={styles.closeModal}
                    onClick={() => setShowModal(false)}
                >
                    <RxCross1 />
                </span>
                {children}
                <button onClick={() => setShowModal(false)}> Close </button>
            </div>
        </div>
    )
}
