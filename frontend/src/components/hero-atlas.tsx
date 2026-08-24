"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { heroChapters } from "@/content/hero-chapters";
import styles from "./hero-atlas.module.css";

const TRANSITION_DELAY = 220;
const CHAPTER_DURATION = 8000;

export function HeroAtlas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [cycle, setCycle] = useState(0);
  const transitionTimer = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const previousFrame = useRef<number | null>(null);
  const elapsed = useRef(0);
  const progressBar = useRef<HTMLElement | null>(null);
  const active = heroChapters[activeIndex];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
  }, []);

  const changeChapter = useCallback((nextIndex: number) => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    elapsed.current = 0;
    previousFrame.current = null;
    if (progressBar.current) progressBar.current.style.transform = "scaleX(0)";

    if (nextIndex === activeIndex) {
      setCycle((current) => current + 1);
      return;
    }

    setIsChanging(true);
    transitionTimer.current = window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setCycle((current) => current + 1);
      setIsChanging(false);
      transitionTimer.current = null;
    }, reduceMotion ? 0 : TRANSITION_DELAY);
  }, [activeIndex, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      if (progressBar.current) progressBar.current.style.transform = "scaleX(0)";
      return;
    }

    if (isPaused || isChanging) {
      previousFrame.current = null;
      return;
    }

    const updateProgress = (time: number) => {
      if (previousFrame.current === null) previousFrame.current = time;
      elapsed.current += time - previousFrame.current;
      previousFrame.current = time;

      const progress = Math.min(elapsed.current / CHAPTER_DURATION, 1);
      if (progressBar.current) progressBar.current.style.transform = `scaleX(${progress})`;

      if (progress >= 1) {
        changeChapter((activeIndex + 1) % heroChapters.length);
        return;
      }

      animationFrame.current = window.requestAnimationFrame(updateProgress);
    };

    animationFrame.current = window.requestAnimationFrame(updateProgress);
    return () => {
      if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      previousFrame.current = null;
    };
  }, [activeIndex, changeChapter, cycle, isChanging, isPaused, reduceMotion]);

  return (
    <section
      className={`${styles.hero} ${styles[active.id]}${isPaused ? ` ${styles.paused}` : ""}${isChanging ? ` ${styles.changing}` : ""}`}
      aria-label="Five ways to explore geological evidence"
    >
      <div className={styles.grid} aria-hidden="true" />

      <div className={`shell ${styles.layout}`}>
        <div className={styles.chapterFrame}>
          <div className={styles.copy} key={`copy-${active.id}`}>
          <div className={styles.kicker}>
            <div className={styles.count}><span>{active.number}</span><i />05</div>
            <p className={styles.eyebrow}>{active.label} · A way of reading evidence</p>
          </div>
          <h1>{active.headline}</h1>
          <div className={styles.summary}>
            <p className={styles.intro}>{active.introduction}</p>
            <Link className={styles.action} href={active.href}>
              <span>{active.action}</span><b aria-hidden="true">↗</b>
            </Link>
          </div>
          </div>

          <div className={styles.board} key={`stage-${active.id}`}>
          <figure className={styles.visual}>
            <Image
              src={active.image.src}
              alt={active.image.alt}
              fill
              loading="eager"
              preload={activeIndex === 0}
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 62vw, 54vw"
              style={{ objectPosition: active.image.position }}
            />
            <div className={styles.shade} />
            <figcaption>
              <div className={styles.figureMeta}><span>Primary evidence</span><b>{active.number}</b></div>
              <strong>{active.image.title}</strong>
              <small>{active.image.caption}</small>
            </figcaption>
          </figure>

          <aside className={styles.sidebar}>
            <section className={styles.lens}>
              <div className={styles.cardHeading}><span>How to read it</span><b>Method</b></div>
              <h2>{active.readingLens.title}</h2>
              <p>{active.readingLens.description}</p>
              <ol className={styles.steps}>
                {active.readingLens.prompts.map((prompt, index) => <li key={prompt}><b>0{index + 1}</b><span>{prompt}</span></li>)}
              </ol>
            </section>

            <section className={styles.record}>
              <div className={styles.cardHeading}><span>{active.record.type}</span><b>{active.record.identifier}</b></div>
              <h2>{active.record.title}</h2>
              <dl className={styles.data}>
                {active.record.metadata.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
              </dl>
              <div className={styles.status}><i /><span>{active.record.status}</span></div>
            </section>
          </aside>
          </div>

          <div className={styles.controls} role="group" aria-label="Choose a geological chapter">
          <div className={styles.track}>
            {heroChapters.map((chapter, index) => (
              <button
                type="button"
                className={`${styles.tab}${index === activeIndex ? ` ${styles.active}` : ""}`}
                aria-pressed={index === activeIndex}
                onClick={() => changeChapter(index)}
                key={chapter.id}
              >
                <span className={styles.tabNumber}>{chapter.number}</span>
                <span className={styles.tabLabel}>{chapter.label}</span>
                {index === activeIndex && <i
                  className={styles.progress}
                  aria-hidden="true"
                  key={`${chapter.id}-${cycle}`}
                  ref={progressBar}
                />}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={isPaused}
            aria-label={isPaused ? "Resume automatic chapter rotation" : "Pause automatic chapter rotation"}
            onClick={() => setIsPaused((current) => !current)}
            disabled={reduceMotion}
          >
            <b aria-hidden="true">{reduceMotion ? "—" : isPaused ? "▶" : "Ⅱ"}</b>
            <span>{reduceMotion ? "Manual" : isPaused ? "Play" : "Pause"}</span>
          </button>
          </div>
        </div>
      </div>
    </section>
  );
}
