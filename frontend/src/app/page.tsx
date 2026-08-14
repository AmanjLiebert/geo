import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Visitor showcase · planning phase</p>
      <h1>Geo-Kurdistan</h1>
      <p className={styles.summary}>
        A geological knowledge platform for exploring the Kurdistan Region.
      </p>
      <p className={styles.status}>
        The frontend foundation is ready. The visitor experience will be built
        after the proposed information architecture is reviewed.
      </p>
    </main>
  );
}
