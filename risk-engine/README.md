# Vector Risk Engine

The risk pipeline that powers Vector's attestation-gated swaps.

---

## Architecture: embedded vs standalone

The risk pipeline lives in two places:

| Location | What it is | When to use |
|----------|-----------|-------------|
| `frontend/src/lib/risk-engine/` | **Primary / embedded** — runs as Next.js API routes (`/api/risk-score`, `/api/health`). No separate process. | Default. Works out of the box when you set `TEE_SIGNER_KEY` in `frontend/.env`. |
| `risk-engine/` (this directory) | **Standalone server** — the same pipeline wrapped in an Express app. | When you want to run the risk engine as a separate microservice (separate deploy, different machine, horizontal scaling). |

Both implementations share the same 5-layer scoring logic and produce identical attestation outputs. The only difference is the transport layer (Next.js API routes vs Express).

---

## Standalone server (this directory)

Use this when you want to decouple the risk engine from the frontend — e.g. to deploy it on a dedicated server or TEE enclave.

### Setup

```bash
cd risk-engine
npm install
cp .env.example .env
# Edit .env: set TEE_SIGNER_KEY and RPC_URL
```

### Run

```bash
npm start          # production
npm run dev        # watch mode
npm test           # 17 unit tests
```

Server starts at `http://localhost:3001` (configure via `PORT` in `.env`).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/risk-score` | Run the 5-layer pipeline and return a signed attestation |
| `GET` | `/api/health` | Health check: signer status, cache size, config |

---

## Risk pipeline: 5 layers

| # | Layer | What it checks |
|---|-------|----------------|
| 1 | **Allowlist** | Trusted tokens/pools → score 0 (fast path) |
| 2 | **Swap intent** | Anomalous size, micro-swap patterns |
| 3 | **Threat intel** | Known malicious tokens + GoPlus Security API |
| 4 | **On-chain signals** | EOA vs contract, tx history, balance |
| 5 | **Bytecode** | `SELFDESTRUCT`, `DELEGATECALL`, proxy patterns |

Scores aggregate (0–100). The TEE signer signs once per assessment. The hook verifies on every swap.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TEE_SIGNER_KEY` | Yes | Private key for attestation signing (EIP-191) |
| `RPC_URL` | Recommended | Default RPC for on-chain layers 4–5 |
| `PORT` | No | Server port (default: 3001) |
| `GOPLUS_API_KEY` | No | GoPlus API key for higher rate limits |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 60000) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 100) |

---

## Tests

```bash
npm test
```

17 unit tests: allowlist, swap intent, threat intel, on-chain signals, bytecode analysis, attestation signing, cache.
