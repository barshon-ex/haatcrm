import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>404</h1>
      <Link href="/" className="btn">←</Link>
    </div>
  );
}
