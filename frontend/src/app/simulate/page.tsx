import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SimulateView } from "@/components/simulate/SimulateView";

export default function SimulatePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <SimulateView />
      </main>
      <Footer />
    </div>
  );
}
