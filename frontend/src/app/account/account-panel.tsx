"use client";

import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as signOutFirebase,
} from "firebase/auth";
import { ArrowRight, LogOut, Phone, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth-provider";
import { exchangeFirebaseToken } from "@/lib/auth-api";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-auth";
import styles from "./account.module.css";

type Activity = "idle" | "google" | "phone-send" | "phone-confirm" | "signout";

export function AccountPanel() {
  const { user, loading, refresh, signOut } = useAuth();
  const [activity, setActivity] = useState<Activity>("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [invitationConsumed, setInvitationConsumed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const configured = isFirebaseConfigured();

  const hashInvitationToken = useSyncExternalStore(subscribeToHash, readInvitationToken, () => undefined);
  const invitationToken = invitationConsumed ? undefined : hashInvitationToken;

  useEffect(() => () => recaptchaRef.current?.clear(), []);

  const completeServerSignIn = async (idToken: string) => {
    await exchangeFirebaseToken(idToken, invitationToken);
    const auth = await getFirebaseAuth();
    await signOutFirebase(auth);
    if (invitationToken) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setInvitationConsumed(true);
    }
    await refresh();
  };

  const signInWithGoogle = async () => {
    setActivity("google");
    setMessage(null);
    try {
      const auth = await getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      await completeServerSignIn(await credential.user.getIdToken(true));
    } catch (error) {
      setMessage(toFriendlyMessage(error));
    } finally {
      setActivity("idle");
    }
  };

  const sendPhoneCode = async (event: FormEvent) => {
    event.preventDefault();
    setActivity("phone-send");
    setMessage(null);
    try {
      const auth = await getFirebaseAuth();
      recaptchaRef.current?.clear();
      const verifier = new RecaptchaVerifier(auth, "account-recaptcha", { size: "normal" });
      recaptchaRef.current = verifier;
      setConfirmation(await signInWithPhoneNumber(auth, phone.trim(), verifier));
      setMessage("Verification code sent. It may take a moment to arrive.");
    } catch (error) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setMessage(toFriendlyMessage(error));
    } finally {
      setActivity("idle");
    }
  };

  const confirmPhoneCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmation) return;
    setActivity("phone-confirm");
    setMessage(null);
    try {
      const credential = await confirmation.confirm(code.trim());
      await completeServerSignIn(await credential.user.getIdToken(true));
    } catch (error) {
      setMessage(toFriendlyMessage(error));
    } finally {
      setActivity("idle");
    }
  };

  const endSession = async () => {
    setActivity("signout");
    setMessage(null);
    try {
      await signOut();
    } catch (error) {
      setMessage(toFriendlyMessage(error));
    } finally {
      setActivity("idle");
    }
  };

  if (loading) {
    return <div className={styles.panel} aria-live="polite"><p className={styles.state}>Checking your session…</p></div>;
  }

  if (user) {
    return (
      <section className={styles.panel} aria-labelledby="account-heading">
        <div className={styles.panelHeader}>
          <ShieldCheck aria-hidden="true" />
          <div><span>Signed in</span><h2 id="account-heading">{user.displayName ?? user.email ?? user.phone ?? "Geo-Kurdistan account"}</h2></div>
        </div>
        <dl className={styles.accountFacts}>
          <div><dt>Role</dt><dd>{user.role}</dd></div>
          <div><dt>Access</dt><dd>{user.role === "visitor" ? "Public archive and saved records" : "Scientific workspace"}</dd></div>
          <div><dt>Status</dt><dd>{user.status}</dd></div>
        </dl>
        <p className={styles.note}>
          {user.role === "visitor"
            ? "Your private saved-record list becomes available when the production record API is connected."
            : "Your scientific workspace will appear when the configurable record foundation is enabled in Phase 3."}
        </p>
        {message && <p className={styles.message} role="alert">{message}</p>}
        <button className={styles.secondaryAction} type="button" onClick={endSession} disabled={activity !== "idle"}>
          <LogOut aria-hidden="true" />{activity === "signout" ? "Signing out…" : "Sign out"}
        </button>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="account-heading">
      <div className={styles.panelHeader}>
        <ShieldCheck aria-hidden="true" />
        <div><span>Identity check</span><h2 id="account-heading">Sign in securely</h2></div>
      </div>
      {invitationToken && <p className={styles.invitation}><strong>Invitation detected.</strong> Sign in with the exact email or phone that received it.</p>}
      {!configured ? (
        <p className={styles.message} role="status">Sign-in is prepared but not enabled in this environment. Firebase public configuration is still required.</p>
      ) : (
        <>
          <button className={styles.primaryAction} type="button" onClick={signInWithGoogle} disabled={activity !== "idle"}>
            <span>G</span>{activity === "google" ? "Verifying…" : "Continue with Google"}<ArrowRight aria-hidden="true" />
          </button>
          <div className={styles.divider}><span>or verify a phone</span></div>
          {!confirmation ? (
            <form className={styles.form} onSubmit={sendPhoneCode}>
              <label htmlFor="account-phone">Phone number</label>
              <div className={styles.inputRow}><Phone aria-hidden="true" /><input id="account-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+964 750 000 0000" value={phone} onChange={(event) => setPhone(event.target.value)} required /></div>
              <div id="account-recaptcha" className={styles.recaptcha} />
              <button className={styles.secondaryAction} type="submit" disabled={activity !== "idle"}>{activity === "phone-send" ? "Sending…" : "Send verification code"}</button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={confirmPhoneCode}>
              <label htmlFor="account-code">Verification code</label>
              <input id="account-code" className={styles.codeInput} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} minLength={6} maxLength={6} required />
              <button className={styles.secondaryAction} type="submit" disabled={activity !== "idle"}>{activity === "phone-confirm" ? "Verifying…" : "Verify and sign in"}</button>
              <button className={styles.textAction} type="button" onClick={() => { setConfirmation(null); setCode(""); setMessage(null); }}>Use another number</button>
            </form>
          )}
        </>
      )}
      {message && <p className={styles.message} role="alert">{message}</p>}
      <p className={styles.privacy}>Google and phone verify who you are. Geo-Kurdistan—not the provider—decides your application role.</p>
    </section>
  );
}

function toFriendlyMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("popup-closed")) return "The sign-in window was closed before verification finished.";
  if (code.includes("invalid-phone-number")) return "Enter the phone in international format, such as +964…";
  if (code.includes("invalid-verification-code")) return "That verification code is not correct. Try again.";
  if (code.includes("too-many-requests")) return "Too many attempts were made. Please wait before trying again.";
  return "Sign-in could not be completed safely. Please try again.";
}

function subscribeToHash(onStoreChange: () => void): () => void {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function readInvitationToken(): string | undefined {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("invite") ?? undefined;
}
