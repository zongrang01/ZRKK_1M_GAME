# ZRKK 1M GAME

Real-time KPI and revenue dashboard for the ZRKK team, installable on phones as a PWA (Progressive Web App).

- Source code: [`zrkk-webapp/`](zrkk-webapp/)
- Handoff notes: [`docs/ZRKK_CLAUDE_HANDOFF.md`](docs/ZRKK_CLAUDE_HANDOFF.md)
- Mobile app notes (Thai): [`docs/ZRKK_MOBILE_APP_PWA.md`](docs/ZRKK_MOBILE_APP_PWA.md)

## Build

```bash
cd zrkk-webapp
pnpm install
pnpm exec tsc --noEmit && node scripts/check-game.cjs && pnpm build
```

Then publish to the existing ChatGPT Site.

## Install on a phone (ติดตั้งบนมือถือ)

- **iPhone (Safari):** เปิดเว็บ → ปุ่มแชร์ → "เพิ่มไปยังหน้าจอโฮม"
- **Android (Chrome):** เปิดเว็บ → เมนู ⋮ → "ติดตั้งแอป"
