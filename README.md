# 🛡️ Popup & Ad Blocker Pro — China-Enhanced

UserScript untuk Tampermonkey/Violentmonkey yang memblokir popup, request iklan/tracker, banner, gambar iklan animasi, overlay anti-adblock, klik yang dibajak, popup pencuri gesture, dan back-trap history — disetel untuk situs manga/novel/komik China.

Versi: `9.2.0`

## Prinsip penting

- Tidak lagi memakai image allowlist / whitelist CDN manual.
- Gambar normal dari CDN tidak diblokir berdasarkan host.
- Yang diblokir adalah URL iklan/tracker yang dikenal, path iklan first-party, serta gambar/banner dengan pola iklan — dan sejak v9.2, juga slot/banner yang **ukurannya persis sama** dengan slot iklan yang sudah terbukti dihapus meskipun source-nya beda.
- Popup yang benar-benar diklik/dibuka oleh pengguna untuk situs yang sama tetap diizinkan; popup lintas origin yang mencuri gesture diblokir.

## Fitur

- **Popup blocker:** memblokir `window.open()` tanpa user activation.
- **Gesture & navigation guard (v9.2):** memblokir popup/popunder lintas origin yang dipicu handler tombol/link yang dibajak (mis. klik link atau tombol next ternyata membuka iklan antah berantah), mengizinkan host share umum (Twitter/X, Facebook, Telegram, dll.), dan **memulihkan navigasi asli** yang di-`preventDefault()` lalu digantikan popup iklan.
- **Synthetic `_blank` guard (v9.2):** memblokir klik sintetis (`anchor.click()` / `dispatchEvent`) ke anchor `_blank` lintas origin selama gesture aktif, termasuk di dalam iframe.
- **History flood guard (v9.2):** flood-control `history.pushState/replaceState` agar trik back-trap (tombol back HP "muter" ke laman iklan) tetap dalam batas wajar router SPA yang sehat.
- **AdFoundry — deteksi iklan lewat ukuran slot (v9.2):** slot/banner/iframe iklan yang berhasil dihapus mencatat ukurannya; elemen lain berukuran persis sama dianggap iklan walau source/CDN-nya berbeda, selama resource-nya lintas origin (gambar konten first-party aman).
- **Request blocker:** memblokir `fetch`, `XHR`, `sendBeacon`, `EventSource`, dan `WebSocket` ke domain iklan/tracker atau path iklan.
- **Script loader guard:** memblokir `<script>` iklan sebelum sempat dimuat.
- **DOM cleaner:** menghapus elemen iklan berdasarkan selector, resource iklan, iframe iklan, dan link gambar-iklan.
- **Animated ad detector:** menargetkan GIF iklan berdasarkan pola URL, ukuran iklan umum, dan konteks iklan — bukan berdasarkan host CDN.
- **Fixed/sticky banner cleaner:** menghapus banner fixed/sticky hanya bila ada bukti iklan, agar header/navbar normal tidak ikut hilang.
- **Anti-adblock remover:** menghapus overlay “disable adblock” dan mengembalikan scroll.
- **Hijack protection:** membersihkan overlay transparan penjebak klik dan redirect inline mencurigakan.
- **Meta refresh filter:** menghapus redirect `<meta refresh>` ke URL iklan.
- **Blank-link guard:** memblokir link `_blank` ke domain iklan dan klik `_blank` lintas origin yang dipicu gesture.
- **Iframe guard:** mem-patch realm iframe dan me-sandbox iframe lintas-origin yang mencurigakan.

## Kompatibilitas dengan userscript lain (API Inspector / `finder.user.js`)

- Panel userscript yang ditandai `data-userscript-ui`, `data-api-inspector`, atau `#api-inspector-userscript-host` **tidak akan pernah disentuh** oleh cleaner mana pun (DOM cleaner, hijack overlay remover, banner remover).
- Satu-satunya hal yang tetap dipatch adalah `window.open` / `fetch` / `XHR` — semua dipakai API Inspector hanya untuk data yang relevan dan tidak mengganggu jalannya panel.
- Histori: sebelum pengecualian UI ini ada, panel API Inspector sempat terhapus oleh heuristik hijack-overlay; itu sudah diperbaiki dan dijaga lewat `UI_EXEMPT_SELECTOR`.

## Instalasi

1. Pasang ekstensi [Tampermonkey](https://tampermonkey.net/) atau [Violentmonkey](https://violentmonkey.github.io/).
2. Buat userscript baru.
3. Salin seluruh isi `index.user.js` ke userscript tersebut.
4. Save lalu pastikan script dalam keadaan enabled.

URL mentah:

```text
https://raw.githubusercontent.com/Mochizhouuu/Adblock-userscript/main/index.user.js
```

## Konfigurasi

Ubah objek `CONFIG` di bagian atas `index.user.js`:

```js
BLOCK_POPUPS: true,
BLOCK_AD_REQUESTS: true,
BLOCK_TRACKERS: true,

REMOVE_AD_ELEMENTS: true,
REMOVE_ANTI_ADBLOCK_OVERLAYS: true,
REMOVE_META_REDIRECTS_TO_ADS: true,

HIJACK_GUARD: true,
BLOCK_SYNTHETIC_BLANK_CLICKS: true,
BLOCK_BLANK_ANCHORS_TO_ADS: true,
BLOCK_AD_GIFS: true,
BLOCK_AD_IFRAMES: true,
BLOCK_AD_LOCATION_REDIRECTS: true,
REMOVE_HIJACK_OVERLAYS: true,
BLOCK_FIRST_PARTY_AD_PATHS: true,
BLOCK_AD_SOCKETS: true,
BLOCK_DOCUMENT_WRITE_ADS: true,
WATCH_ATTRIBUTE_CHANGES: true,
REMOVE_FIXED_AD_BANNERS: true,

PATCH_IFRAME_REALM: true,
SANDBOX_NEW_IFRAMES: true,

// ── v9.2: deteksi lewat ukuran slot ──
BLOCK_ADS_BY_DIMENSION: true,

// ── v9.2: Gesture & navigation guard ──
STRICT_GESTURE_POPUPS: true,
ALLOW_CROSS_ORIGIN_FIRST: false,
MAX_OPENS_PER_GESTURE: 5,
RESTORE_HIJACKED_NAV: true,
RESTORE_DELAY_MS: 150,
BLOCK_SYNTHETIC_CROSS_ORIGIN_BLANK: true,
HISTORY_GUARD: true,
HISTORY_FLOOD_MAX: 3,
HISTORY_WINDOW_MS: 1000,
```

Panduan kunci baru:

- `STRICT_GESTURE_POPUPS`: bila `true`, popup lintas origin hanya lewat jika URL-nya cocok dengan link yang diklik user (atau host share umum).
- `ALLOW_CROSS_ORIGIN_FIRST`: set `true` jika ingin situs tertentu kembali boleh membuka 1 popup lintas origin pertama per klik (mis. tombol share yang bukan standar).
- `MAX_OPENS_PER_GESTURE`: batas `window.open` per gesture — anti tab-spam.
- `RESTORE_HIJACKED_NAV`: kembalikan navigasi asli kalau link/tombol next dibajak (`preventDefault()` + popup iklan lintas origin).
- `HISTORY_FLOOD_MAX` / `HISTORY_WINDOW_MS`: ambang flood `pushState/replaceState`; naikkan jika ada router SPA yang menulis history lebih dari 3 kali per detik.
- `BLOCK_ADS_BY_DIMENSION`: matikan (`false`) jika ada gambar konten yang terhapus karena kebetulan berukuran sama dengan slot iklan.
- `USER_ACTIVATION_WINDOW_MS`: dikaitkan dengan jendela gesture (default `1500` ms).

Tidak ada pengaturan allowlist gambar.

## Statistik

Jalankan di console:

```js
window.__AAB.getStats();
window.__AAB.getGesture(); // keadaan GestureGuard (anchor terakhir, dsb.)
```

Contoh hasil:

```js
{
  popups: 3,        // popup/popunder yang diblokir
  opens: 5,         // window.open yang diizinkan
  requests: 12,
  elements: 40,
  overlays: 0,
  gifs: 2,
  iframes: 1,
  banners: 0,
  sockets: 0,
  docwrite: 0,
  dimension: 4,     // ikal yang tertangkap karena ukurannya = slot iklan terkonfirmasi
  historyBlocks: 0, // pushState/replaceState yang dibuang karena flood
  navRestores: 1,   // navigasi link/next yang dibajak lalu dipulihkan
  syntheticClicks: 0,
  blankAnchors: 2,
  metaRedirects: 0,
  hijacks: 0,
  locationBlocked: 0,
  hijackOverlays: 0,
  realmPatches: 2,
  sandboxedIframes: 1
}
```

## Troubleshooting

### Masih ada banner iklan yang berukuran sama dengan banner lain

Itu persis kasus yang dibereskan di v9.2 lewat **AdFoundry**: ukuran slot iklan yang berhasil dihapus dihafalkan; banner/iframe lain berukuran sama dipakai sebagai iklan selama resource-nya lintas origin. Jika ada yang masih lolos, pastikan `BLOCK_ADS_BY_DIMENSION = true`, lalu laporkan URL gambar/script iklannya supaya pola/selector ditambahkan.

### Klik link / tombol next malah buka iklan

- Pastikan `STRICT_GESTURE_POPUPS = true` dan `RESTORE_HIJACKED_NAV = true`.
- Redirect `location.replace/href` lintas origin yang dijadwalkan tanpa `window.open` (URL langsung berubah tanpa popup) tidak bisa disela oleh userscript manapun — sebagai gantinya redirect `preventDefault()` + popup-nya yang diblok dan navigasi asli dipulihkan.

### Tombol back HP masih kadang masuk laman acak

- `HISTORY_GUARD` menahan flood `pushState/replaceState` berasal dari spam iklan.
- Chain redirect lintas origin (halaman iklan yang terus memanggil URL domain lain) tidak bisa diblok dari userscript karena tiap halamannya adalah halaman tersendiri di history — itu kini lebih jarang karena popup/popunder pencuri gesture sudah diblok sedini mungkin.

### Jika situs rusak / share popup gagal

- Matikan bertahap `REMOVE_FIXED_AD_BANNERS`, `BLOCK_FIRST_PARTY_AD_PATHS`, lalu `REMOVE_AD_ELEMENTS`.
- Jika tombol share/popup login lintas origin diblok: set `ALLOW_CROSS_ORIGIN_FIRST = true`, atau (hanya untuk situs tertentu) `STRICT_GESTURE_POPUPS = false`.
- Jika router SPA menulis history cepat: naikkan `HISTORY_FLOOD_MAX` (misal `5`).
- Jika iklan lolos: sertakan URL halaman dan URL gambar/script iklan dari tab Network, lalu tambahkan polanya ke domain/path detector.
- Script ini bukan pengganti penuh uBlock Origin untuk pemblokiran tingkat jaringan.

## Riwayat versi

### 9.2.0

- **Gesture & navigation guard:** popup lintas origin tidak lagi sekadar andalan user activation — harus cocok dengan link yang diklik; popunder pencuri gesture diblok dan navigasi asli dipulihkan (kasus: pencet link/tombol next masuk iklan antah berantah).
- **History flood guard:** menahan spam `pushState/replaceState` pembuat back-trap (kasus: tombol back HP muter ke laman acak).
- **Synthetic `_blank` guard:** klik sintetis ke anchor `_blank` lintas origin diblok saat gesture aktif (termasuk realm iframe).
- **AdFoundry:** slot iklan yang berhasil dihapus mengajarkan ukurannya — banner/iframe berukuran sama dengan source/domain berbeda kini tertangkap.
- Kompatibilitas API Inspector (`finder.user.js`) tetap dijaga lewat `UI_EXEMPT_SELECTOR`.

### 9.1.x

- Perbaikan bug `isImageHostBlocked`, menambah README, menghapus image allowlist manual.
- Konsorsium popup: memakai user activation sebagai penyaring.

## Lisensi

MIT License — Copyright (c) 2026 Agus Dwi Saputro.
