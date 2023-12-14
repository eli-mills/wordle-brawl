import styles from '@/styles/LoadingIcon.module.css'

export default function LoadingIcon() {
    return (
        <div className={styles.loadingContainer}>
            <img src="wordle-wf-loading.gif" alt="" />
            <p className={styles.loadingMessage}>
                This app is hosted on a free-tier render.com platform and may
                take up to 60 seconds to load for the first time.
            </p>
        </div>
    )
}
