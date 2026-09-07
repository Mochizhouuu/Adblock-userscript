# 🛡️ Popup & Ad Blocker Pro — China-Enhanced

UserScript for Tampermonkey/Violentmonkey that blocks popups, ads, trackers, and anti-adblock overlays — specially tuned for Chinese manga/novel/comic sites.

## Features

| Feature | Description |
|---------|-------------|
| **Popup Blocker** | Blocks `window.open()` popups without user consent |
| **Ad Request Blocker** | Blocks network requests to known ad/tracker domains |
| **Tracker Blocker** | Blocks analytics & tracking scripts (Google Analytics, Hotjar, etc.) |
| **DOM Cleanup** | Removes ad elements by CSS selectors |
| **Anti-Adblock Remover** | Detects and removes "Please disable adblock" overlays |
| **Click Hijack Protection** | Blocks hidden overlays that hijack clicks |
| **GIF Ad Detector** | Detects and removes animated ad banners |
| **Iframe Sandboxer** | Sandboxes new iframes to prevent bypass |
| **Realm Patcher** | Patches iframe realms to block popup bypass |
| **Meta Redirect Filter** | Removes `<meta refresh>` to ad URLs |
| **Cross-Origin Blocker** | Blocks `_blank` links to ad domains |

## Domain Lists

### Global Ad Networks
- Google AdSense, DoubleClick, Amazon Ads
- AppNexus, OpenX, PubMatic, Criteo
- Taboola, Outbrain, RevContent, MGID
- PopAds, PropellerAds, OnClickAds
- Exoclick, JuicyAds, TrafficJunky

### Chinese Ad Networks
- Baidu (pos.baidu.com, cpro.baidu.com, etc.)
- Tencent (gdt.qq.com, e.qq.com)
- Alibaba (tanx.com, alimama.com)
- Youmi, ADView, ADSame
- And many more regional SSPs

### Trackers
- Google Analytics, Hotjar, Mixpanel
- Baidu Tongji, CNZZ, Umeng
- Segment, Amplitude, Heap

## Installation

1. Install [Tampermonkey](https://tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) browser extension
2. Click the extension icon → "Create a new script"
3. Copy the contents of `index.user.js` and paste it
4. Save and enable

Or install directly from GitHub:
```
https://raw.githubusercontent.com/Mochizhouuu/Adblock-userscript/main/index.user.js
```

## Configuration

Edit the `CONFIG` object at the top of the script:

```javascript
const CONFIG = Object.freeze({
    DEBUG: false,              // Enable debug logging
    
    // Core blocking
    BLOCK_POPUPS: true,
    BLOCK_AD_REQUESTS: true,
    BLOCK_TRACKERS: true,
    
    // DOM cleanup
    REMOVE_AD_ELEMENTS: true,
    REMOVE_ANTI_ADBLOCK_OVERLAYS: true,
    REMOVE_META_REDIRECTS_TO_ADS: true,
    
    // Hijack protection
    HIJACK_GUARD: true,
    BLOCK_SYNTHETIC_BLANK_CLICKS: true,
    BLOCK_BLANK_ANCHORS_TO_ADS: true,
    BLOCK_AD_GIFS: true,
    BLOCK_AD_IFRAMES: true,
    BLOCK_AD_LOCATION_REDIRECTS: true,
    REMOVE_HIJACK_OVERLAYS: true,
    
    // Iframe/Realm
    PATCH_IFRAME_REALM: true,
    SANDBOX_NEW_IFRAMES: true,
    
    // Image allowlist
    USE_IMAGE_ALLOWLIST: true,
});
```

## Image Allowlist

By default, images from the current page's hostname are allowed. To add specific CDN hosts:

```javascript
const IMAGE_ALLOWLIST = new Set([
    'www.wmanhua.com',
    'wmanhua.com',
    'i0.wp.com',     // WordPress CDN
    'cdn.jsdelivr.net',
    // Add more as needed...
]);
```

## Stats

Access stats via console:
```javascript
console.log(window.__AAB.getStats());
// { popups: 0, requests: 0, elements: 0, overlays: 0, ... }
```

## License

MIT License — Copyright (c) 2026 Agus Dwi Saputro

## Support

- Report issues: https://github.com/Mochizhouuu/Adblock-userscript/issues
- Homepage: https://github.com/Mochizhouuu/Adblock-userscript
