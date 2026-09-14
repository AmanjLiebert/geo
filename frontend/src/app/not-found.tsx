import Link from "@/components/safe-link";
import { ArrowLeft, Compass, Search } from "lucide-react";

export default function NotFound() { return <main className="not-found-page"><div className="shell"><span>404 · Record not found</span><Compass aria-hidden="true" /><h1>This trail ends here.</h1><p>The page may have moved, the catalogue slug may be invalid, or this showcase record has not been published.</p><div><Link data-ui-action="back" href="/explore"><ArrowLeft aria-hidden="true" /> Explore collections</Link><Link data-ui-action="secondary" href="/search"><Search aria-hidden="true" /> Search the archive</Link></div></div></main>; }
