# 🛡️ Popup & Ad Blocker Pro — China-Enhanced

UserScript untuk Tampermonkey/Violentmonkey yang memblokir popup, request iklan/tracker, banner, gambar iklan animasi, overlay anti-adblock, dan klik yang dibajak — disetel untuk situs manga/novel/komik China.

Versi: `9.1.0`

## Prinsip penting

- Tidak lagi memakai image allowlist / whitelist CDN manual.
- Gambar normal dari CDN tidak diblokir berdasarkan host.
- Yang diblokir adalah URL iklan/tracker yang dikenal, path iklan first-party, serta gambar/banner dengan pola iklan.
- Popup yang benar-benar diklik/dibuka oleh pengguna tetap diizinkan; popup tanpa interaksi tetap diblokir.

## Fitur

- **Popup blocker:** memblokir `window.open()` tanpa user activation.
- **Request blocker:** memblokir `fetch`, `XHR`, `sendBeacon`, `EventSource`, dan `WebSocket` ke domain iklan/tracker atau path iklan.
- **Script loader guard:** memblokir `<script>` iklan sebelum sempat dimuat.
- **DOM cleaner:** menghapus elemen iklan berdasarkan selector, resource iklan, iframe iklan, dan link gambar-iklan.
- **Animated ad detector:** menargetkan GIF iklan berdasarkan pola URL, ukuran iklan umum, dan konteks iklan — bukan berdasarkan host CDN.
- **Fixed/sticky banner cleaner:** menghapus banner fixed/sticky hanya bila ada bukti iklan, agar header/navbar normal tidak ikut hilang.
- **Anti-adblock remover:** menghapus overlay “disable adblock” dan mengembalikan scroll.
- **Hijack protection:** membersihkan overlay transparan penjebak klik dan redirect inline mencurigakan.
- **Meta refresh filter:** menghapus redirect `<meta refresh>` ke URL iklan.
- **Blank-link guard:** memblokir link `_blank` ke domain iklan.
- **Iframe guard:** mem-patch realm iframe dan me-sandbox iframe lintas-origin yang mencurigakan.

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
```

Tidak ada lagi pengaturan allowlist gambar.

## Statistik

Jalankan di console:

```js
window.__AAB.getStats();
```

Contoh hasil:

```js
{
  popups: 0,
  requests: 0,
  elements: 0,
  overlays: 0,
  gifs: 0,
  iframes: 0,
  banners: 0,
  sockets: 0,
  docwrite: 0
}
```

## Troubleshooting

- Jika situs rusak: matikan bertahap `REMOVE_FIXED_AD_BANNERS`, `BLOCK_FIRST_PARTY_AD_PATHS`, lalu `REMOVE_AD_ELEMENTS`.
- Jika iklan lolos: sertakan URL halaman dan URL gambar/script iklan dari tab Network, lalu tambahkan polanya ke domain/path detector.
- Script ini bukan pengganti penuh uBlock Origin untuk Trabasan tingkat jaringan.

## Lisensi

MIT License — Copyright (c) 2026 Agus Dwi Saputro.
