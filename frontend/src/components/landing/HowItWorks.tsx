import { Scan, ShieldCheck, Zap, Globe } from "lucide-react";

const steps = [
  {
    icon: <Scan className="h-6 w-6" />,
    title: "1. Risk Assessment",
    description:
      "Off-chain TEE-grade risk engine runs 5 analysis layers: allowlist, swap intent, threat intel, on-chain signals, and bytecode analysis, producing a 0-100 risk score.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "2. Attestation Signing",
    description:
      "Risk score is signed as a cryptographic attestation with a 5-minute TTL. The signature is included in the swap's hookData payload.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "3. Hook Enforcement",
    description:
      "VectorHook's beforeSwap verifies the attestation on-chain via ECDSA. PolicyEngine evaluates: ALLOW, WARN, or BLOCK. Protected pools use fail-closed enforcement.",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "4. Cross-Chain Monitoring",
    description:
      "Reactive Network RSC monitors SwapBlocked events. Repeat offenders trigger cross-chain alerts via callbacks, enabling multi-chain threat propagation.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
      <div className="grid gap-8 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-vector-border bg-vector-card p-6 transition hover:border-vector-primary/40"
          >
            <div className="mb-4 inline-flex rounded-lg bg-vector-primary/10 p-3 text-vector-primary">
              {step.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
