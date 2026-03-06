import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PoolsView } from "@/components/pools/PoolsView";

export default function PoolsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PoolsView />
      </main>
      <Footer />
    </div>
  );
}
