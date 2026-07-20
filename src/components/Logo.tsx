import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="LIM PDF — Página inicial">
      <Image
        className="brand-logo-image"
        src="/brand/lim-pdf-logo.png"
        alt=""
        width={900}
        height={276}
        priority
      />
    </Link>
  );
}
