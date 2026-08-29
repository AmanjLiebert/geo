import Image from "next/image";
import styles from "./brutal-home-hero.module.css";

export function BrutalHomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Image
        className={styles.landscape}
        src="/images/atlas/rawandiz-canyon.jpg"
        alt="Layered cliffs and canyon landscape at Rawandiz"
        fill
        priority
        sizes="100vw"
      />

      <div className={styles.archiveLabel}>
        <span>Public geological archive</span>
        <b>Kurdistan Region</b>
      </div>

      <div className={styles.message}>
        <h1 id="hero-title">The ground beneath Kurdistan,<br /><em>made visible.</em></h1>
      </div>

      <aside className={styles.annotation} aria-label="Featured location">
        <span aria-hidden="true" />
        <div>
          <small>Featured field view</small>
          <strong>Rawandiz Canyon</strong>
          <p>Erbil Governorate · 36.617° N / 44.535° E</p>
        </div>
      </aside>

      <div className={styles.summary}>
        <p>A public collection connecting rocks, minerals, fossils, formations, mapped places and geological research.</p>
        <a href="#discoveries"><span>Scroll to recent discoveries</span><b aria-hidden="true">↓</b></a>
      </div>
    </section>
  );
}
