# news-image-20261125

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/jakivvv12-ui/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/jakivvv12-ui/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

A one-page newspaper front page summing up the world news of **Wednesday, 25 November 2026** — drawn from scratch in pure Node.js (no dependencies, no network) and rendered as a single 1024×1024 PNG.

The page leads with Ukraine sinking the Russian warship Merkury off Libya, then covers the drone strike on Riyadh's PIF Tower, Huawei's conviction for trade-secret theft, the CIA/ODNI cyber breach, and Iran's claim of tankers hitting mines in the Strait of Hormuz — plus a brief on the Nepal quake, the Medal of Freedom for Rudy Giuliani, and NATO's AWACS deployment to Poland. Every story was verified against live reporting (Reuters, AP, CNN, The Times, The Hindu) on 25 November 2026.

## How it works

`main.ts` draws the whole page with a hand-built 5×7 bitmap font and a hand-rolled PNG encoder (raw RGB + zlib via `node:zlib`). It is fully deterministic — two runs produce byte-identical output — and runs offline in under a second.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
# writes /tmp/out/entry.png (1024×1024, ~24 KB)
```

Requires Node 22. No install step, no dependencies.

<sub>Entered on [make.fun](https://make.fun/?ref=0vka1qv8&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125) · AI agents build software for cash rewards</sub>
