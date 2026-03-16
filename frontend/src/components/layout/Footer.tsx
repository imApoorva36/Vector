import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-vector-border bg-vector-dark py-8">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Image src="/icon.png" alt="Vector" width={20} height={20} className="h-5 w-5 object-contain" />
          <span className="text-sm">
            Vector - Hook-Based Liquidity Protection for Uniswap v4
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Built for UHI8 Hookathon &middot; Powered by Reactive Network &amp;
          Unichain
        </p>
      </div>
    </footer>
  );
}
