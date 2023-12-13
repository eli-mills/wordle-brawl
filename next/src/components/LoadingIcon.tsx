import styles from "@/styles/LoadingIcon.module.css"

export default function LoadingIcon() {
    return (
        <div className={styles.loadingIcon}>
            <img src="wordle-wf-loading.gif" alt="" />
        </div>
    )
}