import Link from "next/link";
import styles from "./LegalPage.module.css";

export default function LegalPage({ eyebrow, title, intro, effective, children }) {
  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Legal page navigation">
        <Link href="/" aria-label="Libertrade home"><img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" /></Link>
        <Link href="/">Back to home</Link>
      </nav>
      <main className={styles.article}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        <p className={styles.meta}>EFFECTIVE {effective} · BETA</p>
        {children}
      </main>
      <footer className={styles.footer}>
        <span>© 2026 LIBERTRADE</span>
        <Link href="/terms">Beta Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/cookies">Cookies</Link>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }) {
  return <section className={styles.section}><h2>{title}</h2>{children}</section>;
}

export function LegalNotice({ children }) {
  return <div className={styles.notice}>{children}</div>;
}
