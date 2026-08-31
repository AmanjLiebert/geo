import Image from "next/image";
import { Layers3, MapPinned } from "lucide-react";
import styles from "./brutal-home-hero.module.css";

export function BrutalHomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Image className={styles.terrain} src="/images/atlas/geo-kurdistan-hero-v3.png" alt="Folded sedimentary mountains with an ammonite, calcite crystals and a banded rock specimen in the foreground" fill priority sizes="100vw" />

      <div className={styles.copy}>
        <span><Layers3 aria-hidden="true" /> Geological archive</span>
        <h1 id="hero-title">Read the ground.</h1>
        <p>Landscapes, rocks, minerals, fossils and research from Kurdistan.</p>
      </div>
      <div className={styles.place}><MapPinned aria-hidden="true" /><span>Zagros fold belt</span><small>Kurdistan region</small></div>
      <div className={styles.scale} aria-hidden="true"><i /><span>Landscape</span><i /><span>Specimen</span><i /><span>Evidence</span></div>
    </section>
  );
}
