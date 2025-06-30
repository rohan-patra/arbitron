import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="border-r p-4">
      <nav className="flex flex-col">
        <Link href="/strategies" className="mb-2">
          Strategies
        </Link>
        <Link href="/wallet" className="mb-2">
          Wallet
        </Link>
        <Link href="/agent-ui" className="mb-2">
          Agent UI
        </Link>
        <Link href="/arbitrage-config">Arbitrage Config</Link>
      </nav>
    </aside>
  );
}
