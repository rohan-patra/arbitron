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
        <Link href="/agent-ui">Agent UI</Link>
      </nav>
    </aside>
  );
}
