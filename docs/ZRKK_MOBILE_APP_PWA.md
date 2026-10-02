# ZRKK 1M GAME — แอปมือถือ (PWA)

แอปนี้ติดตั้งลงหน้าจอโฮมของมือถือได้ เปิดแบบเต็มจอเหมือนแอปทั่วไป และยังใช้ข้อมูลเรียลไทม์ชุดเดียวกับเว็บ (D1) รวมถึงการล็อกอินผ่าน ChatGPT เหมือนเดิม

## ไฟล์ที่เพิ่ม/แก้
- `public/manifest.webmanifest` — ชื่อแอป ไอคอน สีธีม โหมด standalone
- `public/sw.js` — service worker (ดึงจากเน็ตก่อน มีหน้าออฟไลน์สำรอง ไม่แคช `/api` และหน้าล็อกอิน)
- `public/offline.html` — หน้าที่แสดงเมื่อไม่มีอินเทอร์เน็ต
- `public/app-icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — ไอคอนแอป
- `app/pwa-register.tsx` — ลงทะเบียน service worker
- `app/layout.tsx` — metadata สำหรับ manifest, Apple web app, viewport, theme color
- `app/globals.css` — เว้นระยะรอยบาก/แถบโฮมเมื่อเปิดเป็นแอป

ไฟล์สำรองก่อนแก้: `outputs/zrkk-webapp-backup-before-pwa/`

## Publish
1. `pnpm install && pnpm exec tsc --noEmit && node scripts/check-game.cjs && pnpm build`
2. Publish ขึ้น ChatGPT Site เดิม

## ติดตั้งบนมือถือ
- **iPhone (Safari):** เปิดเว็บ → ปุ่มแชร์ → "เพิ่มไปยังหน้าจอโฮม"
- **Android (Chrome):** เปิดเว็บ → เมนู ⋮ → "ติดตั้งแอป" / "เพิ่มลงในหน้าจอหลัก"
