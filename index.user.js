// ==UserScript==
// @name         Popup & Ad Blocker Pro — China-Enhanced v9
// @namespace    http://tampermonkey.net/
// @version      9.1.1
// @description  Popup blocker, ad/tracker blocker, anti-adblock overlay remover, click-hijack grid killer, location-redirect guard, GIF-ad detector — tuned for Chinese sites (heuristic banners, animated-image context, document.write guard)
// @author       Mochizhouuu
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @license      MIT
// @homepageURL  https://github.com/Mochizhouuu/Adblock-userscript
// @supportURL   https://github.com/Mochizhouuu/Adblock-userscript/issues
// @updateURL    https://raw.githubusercontent.com/Mochizhouuu/Adblock-userscript/main/index.user.js
// @downloadURL  https://raw.githubusercontent.com/Mochizhouuu/Adblock-userscript/main/index.user.js
// ==/UserScript==

(() => {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       CONFIGURATION
       ═══════════════════════════════════════════════════════════════ */
    const CONFIG = Object.freeze({
        DEBUG: false,

        // ── Core blocking ──
        BLOCK_POPUPS: true,
        BLOCK_AD_REQUESTS: true,
        BLOCK_TRACKERS: true,

        // ── DOM cleanup ──
        REMOVE_AD_ELEMENTS: true,
        REMOVE_ANTI_ADBLOCK_OVERLAYS: true,
        REMOVE_META_REDIRECTS_TO_ADS: true,

        // ── Hijack protection ──
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

        // ── NEW: iframe realm patching ──
        PATCH_IFRAME_REALM: true,
        SANDBOX_NEW_IFRAMES: true,

        // ── REMOVED: dangerous eval/Function patching ──
        // BLOCK_EVAL_INJECTION: false,
        // BLOCK_BEFOREUNLOAD_REDIRECT: false,
        // BLOCK_DYNAMIC_ANCHOR_CLICK: false,

        // ── Popup tolerance ──
        MAX_POPUPS_PER_INTERACTION: 0,  // reserved; user-activated popups are allowed
        USER_ACTIVATION_WINDOW_MS: 1500,
        CLEANUP_INTERVAL_MS: 2000,

        // ── Overlay detection ──
        HIJACK_OPACITY_MAX: 0.15,
        HIJACK_ZINDEX_MIN: 5,
    });

    const PREFIX = '[🛡️ AAB]';
    const log  = (...a) => CONFIG.DEBUG && console.log(PREFIX, ...a);
    const warn = (...a) => CONFIG.DEBUG && console.warn(PREFIX, ...a);

    /* ═══════════════════════════════════════════════════════════════
       PENGECUALIAN UI USERSCRIPT (koordinasi antar userscript)

       Beberapa userscript UI (mis. "API Inspector / Endpoint Finder")
       memasang panel memakai host div fixed + z-index sangat tinggi,
       dengan isi di dalam shadow root. Dari sudut pandang heuristik
       hijack-overlay di bawah ini, host seperti itu memang terlihat
       seperti overlay pembajak: fixed, z-index >= 50, background
       transparan di level host, dan menutup cuplikan viewport besar,
       padahal konten light-DOM-nya kosong. Elemen yang diberi tanda
       di bawah ini JANGAN dihapus oleh cleaner mana pun.
       ═══════════════════════════════════════════════════════════════ */
    const UI_EXEMPT_SELECTOR = [
        '[data-userscript-ui]',
        '[data-api-inspector]',
        '[data-api-inspector-boot-error]',
        '#api-inspector-userscript-host',
    ].join(',');

    const isUserscriptUI = el => {
        try {
            return !!(el && el.matches && el.matches(UI_EXEMPT_SELECTOR));
        } catch { return false; }
    };

    /* ═══════════════════════════════════════════════════════════════
       DOMAIN LISTS
       ═══════════════════════════════════════════════════════════════ */
    const AD_DOMAINS = new Set([
        // — Global
        'doubleclick.net','googlesyndication.com','googleadservices.com',
        'googletagservices.com','amazon-adsystem.com','adnxs.com','appnexus.com',
        'openx.net','openx.com','pubmatic.com','rubiconproject.com','criteo.com',
        'criteo.net','adform.net','media.net','taboola.com','outbrain.com',
        'revcontent.com','mgid.com','adskeeper.com','popads.net','popcash.net',
        'propellerads.com','onclickads.net','onclkds.com','adsterra.com',
        'adsterratech.com','exoclick.com','exosrv.com','exdynsrv.com',
        'juicyads.com','trafficjunky.net','trafficfactory.biz','a-ads.com',
        'coinzilla.com','cointraffic.io',

        // — China: iklan / SSP / exchange
        'pos.baidu.com','cpro.baidu.com','cpro.baidustatic.com','eclick.baidu.com',
        'dl_dir.baidu.com','union.baidu.com','tuiguang.baidu.com','bs.baidu.com',
        'nsclick.baidu.com','mobads.baidu.com','mobads-logs.baidu.com',
        'gdt.qq.com','e.qq.com','mi.gdt.qq.com','tanx.com','alimama.com',
        'mmstat.com','allyes.com','allyes.cn','admaster.com.cn','miaozhen.com',
        'adpush.cn','irs01.com','ipinyou.com','ipinyou.com.cn','mediav.com',
        'zhugeio.com','inmobi.cn','gridsum.com','domob.cn','youmi.net',
        'kdlyy.com','adview.cn','adsame.com','yigao.com','ixigan.com',
        'taomeng.com','adsame.cn','adsgg.com','biddingx.com','adx01.com',
        'mediavgg.com','sinawf.com','sax.sina.com.cn','saxn.sina.com.cn',
        'dmp.sina.com.cn','p.zol.com.cn','imp.zol.com.cn','x.cnxz.cn','cv01.cn',
        'vogo.com.cn','u5i5.com','5c5c.com','duo5.cn','3393.com',

        // — Ad landing / redirect (rotating subdomain)
        'gewt00g.com','cdnweb.win','aipornhub.ltd',
        'oe188bu.com','lp-is.com',
        '8ox.cn','papa.me','meimanhua.com','mh1234.com',
        'fxxkwg.com','kmyay.com','wenku8.com',

        // — Popup/redirect domains umum
        'go2cloud.org','go2affise.com','clcktrax.com',
        'onclickmega.com','pushmejs.com','pushlaram.com','notifpush.com',
        'push-notifications.top','pushnott.com','pushengage.com',
        'bidgear.com','adplus.co.id','adplus.id','adnety.com',
        'ad-maven.com','adk2x.com','adsrv4k.com','yabidos.com',
        'jads.co','juicyads.com','adserve.work','adkova.com',
        'adrotator.se','adsbetnet.com','adspubcenter.com',
        'clkrev.com','clksite.com','clksupplies.com',
        'directrev.com','fastclick.net','flashtalking.com',
        'intellitxt.com','kontera.com','linkbucks.com',
        'maxbounty.com','mobidea.com','mylead.global',
        'performancehorizon.com','redirectvoluum.com',
        'smartadserver.com','spotxchange.com',
        'tribalfusion.com','zedo.com','zergnet.com',
    ]);

    const TRACKER_DOMAINS = new Set([
        'google-analytics.com','analytics.google.com','stats.g.doubleclick.net',
        'hotjar.com','hotjar.io','mixpanel.com','mxpnl.com','segment.com',
        'segment.io','amplitude.com','amplitude.io','heapanalytics.com',
        'fullstory.com','fullstory.io','mouseflow.com','inspectlet.com',
        'clarity.ms','statcounter.com','scorecardresearch.com','quantserve.com',
        'chartbeat.com',
        'hm.baidu.com','push.zhanzhang.baidu.com','cnzz.com','cnzz.net',
        'umeng.com','umengcloud.com','growingio.com','sensorsdata.cn',
        'talkingdata.com','getui.com','shuzilm.cn',
        'cdnweb.win','umami.is','cloudflareinsights.com',
        'googletagmanager.com','instant.page',
    ]);

    /* ═══════════════════════════════════════════════════════════════
       AD SELECTORS (Cleaned - removed dangerous broad selectors)
       ═══════════════════════════════════════════════════════════════ */
    const AD_SELECTORS = [
        // — Global ad containers
        'ins.adsbygoogle','.adsbygoogle','[data-ad-client]','[data-ad-slot]',
        '[data-ad-unit]','[data-ad-zone]',
        '#ad-container','#ad-wrapper','#ad-banner','#ad-slot','#advertisement',
        '.ad-container','.ad-wrapper','.ad-banner','.ad-slot','.ad-unit','.ad-zone',
        '.advertisement','.advertising','.advert-box','.google-ad','.google-ads',
        '.google-ad-container','.adsense','.ad-placeholder','.banner-ad',
        '.header-ad','.footer-ad','.sidebar-ad','.inline-ad','.article-ad',
        '.video-ad','.sponsored-ad','.sponsored-content',
        '[aria-label="Advertisement" i]','[aria-label="Ads" i]',
        '[aria-label="Sponsored" i]',
        '.taboola','.taboola-container','.outbrain','.OUTBRAIN','.revcontent',
        '.mgid','.adskeeper',

        // — Inline handler redirect ke location
        '[onclick*="location"]','[ontouchend*="location"]',
        '[onmousedown*="location"]','[ontouchstart*="location"]',

        // — Discuz! forum ads
        '.a_fl','.a_fr','.a_mu','.a_pb','.a_pt','.a_cn','.a_oscar1','.a_ssk_cn',
        '.a_sxc','.a_xsfl',

        // — gg / guanggao
        '.gg','.ggad','.ggbox','.ggone','.gg_1','.gg_2','.gg_3','.gg_4','.gg_5',
        '.gg_6','.gg_300','.gg_728','.gg_950','.gg_960','.gg_canvas','.gg_full',
        '.gg_pc','.gg_tp','.ggpost-below','.ggtop','.ggw','.gg-box','.gg-one',
        '.gg1000','.gg430','.ggs','._ggs','._cggp','.guanggao','.guanggao2',
        '.guangg','.guanggaoBox','.gg-content','.gg_url','.gg300',

        // — Couplet / duilian
        '#duilian_left','#duilian_right','.duilian','.duilian2','.duilian_gg',
        '.coupletad','.adv-couplets','#leftCouple','#rightCouple','#leftCouplet',
        '#rightCouplet','#left_couple','#right_couple','#left_couplet',
        '#right_couplet',

        // — Floating ads
        '.floatAd','.floatad','.floatad2','.floatad-winpop','.float_bot_right',
        '#leftFloat','#rightFloat','#leftFloat1','#rightFloat1',
        '#left_float','#right_float','#left_up_float_ad','#right_up_float_ad',
        '#left_down_float_ad','#right_down_float_ad','#fuo_top_float',
        '#crazy_ad_float','#crazy_ad_layer','#miaov_float_layer',
        '#mv_float_layer','#floatad-winpop',

        // — Lovexin / popup layer
        '#lovexin1','#lovexin2','#lovexin11','#lovexin12','#lovexin121',
        '#lovexin13','#lovexin14',

        // — Baidu / portal
        '.baiduad','#ad_globle_div','#ad-floatwin','#adLeftFloat','#adRightFloat',
        '#adUrl','#ad_box1','#ad_box2','#ad_full','#ad_headerbanner','#adad',
        '#adrights14','#adtop1','#topNavad','#toperAd2','#header_global_ad',
        '#news_top_advert','#bottomAD','#bottomNavad','#bottombanner',

        // — Comiis
        '.comiis_ad','.comiis_adbox','.comiis_guanggao','.comiis_guanggao_tit',

        // — Player / video
        '.ad_pc','.ad_hf','.adHF','.adHF3','.adHF6','.ad_content_mask',
        '.ad_couplebanner','.ad_footerbanner','.ad_headerbanner','.ad_thread',
        '.ad_right_1','.ad_right_2','.ad-pc','.ad-right-top','.ad-right-down',
        '.ad-left-down','.ad-shine-panel','.ad-site','.ad-block-cn',
        '.adpc','.adpcc','.adppc','.adsoho','.ads100','.ads200',
        '.ads_all > .ads_w','.ads_desktop','.ads_mobile','.ads_plugin',
        '.ads_topBanner','.ads-after-content','.ads-after-header',
        '.ads-before-content','.advertising_lightbox','.adv-6park','.adv-g1',
        '.advInfoElem','.advert-short','.add-gg','.addddddwarp','.adlistcss',
        '.adsense160','.adsense200',

        // — Situs manga/novel/streaming
        '.artad','.article-pop-up-ad','.artplayer-plugin-ads','.asb-index',
        '.asb-post','.assort-ad','.aub-post','.bus_adsbox','.conch-ads-box',
        '.common-topad','.common_ad','.con_ad','.containeradvertising',
        '.content_ad_300','.corner-gg','.ctm_ad','.d_banner_inner','.dipiao',
        '.dplayer > .tips','.ec-ad','.edtj','.eis_muad','.eis_pad1','.eis_pad2',
        '.event_fullscreen_gg_modal','.fed-part-case > .ads-img','.ff-ads',
        '.frontpageAdvM','.full.banners12','.getads','.gpt_ads_box',
        '.gpt_ads_title','.guruin-ads','.hao123-unionad-pic','.headxx11xiaoapp',
        '.hengfu','.hengfu1.banner','.hengfu2.banner','.hfad','.index_adfloat',

        // — Misc China patterns
        '#__long_gg_container','#aafoot.top_box','#aaheadtop','#aatop.top_box',
        '#adBody07','#adv-2','#adv-3','#adv-fixed-square','#adv_wrap_hh',
        '#adx_cggp','#bfad','#bfad1','#bfad2','#bfad3','#bfad4','#bfad5','#bfad6',
        '#bottom-gg1','#chs_bannerArea','#dbgg','#dgf_pc','#diads',
        '#div_top_ads','#dy_card_dy','#everydayadv_mask','#fk_faiVisitStateAd',
        '#fnbt','#footer_fix_ggw','#fwin_popad_7ree','#gg_url','#googleAD1',
        '#googleAD2','#googleAD3','#googleAdIndexTop','#haoxinqing_me_img',
        '#header-top + .advertisement','#hengfu > #jiukan','#imgad',
        '#index_aside_ad','#index_content_ad','#js_ads_banner_top',
        '#js_ads_banner_top_slide','#kfpopupDiv','#ldgindexbuttom','#modalgg',
        '#movieInfoRight','#mv_ad_dom','#my-adsFPR','#olfullad','#piao_div_0',
        '#piao_div_1','#playerAdvLayer','#popadv_popmask','#popadv_popmenu',
        '#pp-modal-id','#qinav_a1','#qj960a','#qj960b','#reportPop','#rm-float3',
        '#sc-superman-ad','#sitefocus.focus','#snActive-wrap','#sponsorAdDiv2',
        '#syad','#syad1','#syad2','#syad3','#syad4','#syad5','#syad6',
        '#textggs','#timedfuo','#top-gg-container','#top_ads0','#xinnxi',
        '#xqad','#xqad1','#xqad2','#xqad3','#left-promotion','#right-promotion',
    ];
    const AD_SELECTOR = AD_SELECTORS.join(',');

    const RESOURCE_SELECTOR = [
        'script[src]','iframe[src]','img[src]','img[data-src]',
        'source[src]','source[srcset]','video[src]','link[href]',
        'object[data]','embed[src]',
        'a[target="_blank"]','area[target="_blank"]','picture',
    ].join(',');

    const AD_GIF_URL_PATTERN =
        /(?:^|[\/_\-])(?:gg|guanggao|tuiguang|banner|adv?ert?|sponsored|couplet|duilian|float|popup|popad|jdt|zfkmpd|zg)[\/_\-]?[^\/]*\.(?:gif|webp|png|jpg|jpeg)$/i;

    const COMMON_AD_DIMENSIONS = new Set([
        '728x90','960x60','960x90','960x80','960x150','960x120','960x200',
        '980x90','980x60','970x90','970x250','1000x60','1000x90','1200x60',
        '1200x90','300x250','300x100','300x300','336x280','250x250','468x60',
        '480x60','120x600','160x600','240x400','640x320','640x100','640x60',
    ]);
    const GIF_DIMENSION_PATTERN = /(\d{2,4})\s*[x×*_]\s*(\d{2,4})/i;

    const ANTI_ADBLOCK_TEXT =
        /(?:disable|turn\s*off|whitelist|remove).{0,35}(?:ad[\s-]*block|adblocker)|(?:ad[\s-]*block|adblocker).{0,35}(?:detected|enabled|active)|matikan.{0,25}adblock|nonaktifkan.{0,25}adblock|检测到.{0,15}广告拦截|关闭.{0,15}广告拦截|请.{0,10}(?:关闭|禁用|退出).{0,15}广告拦截|广告拦截.{0,15}(?:插件|软件|工具)|(?:屏蔽|拦截)了.{0,10}广告|检测到您.{0,20}广告屏蔽|请.{0,10}关闭.{0,10}广告|广告屏蔽.{0,10}插件/i;

    const stats = {
        popups: 0, requests: 0, elements: 0, overlays: 0,
        metaRedirects: 0, hijacks: 0, syntheticClicks: 0, blankAnchors: 0,
        gifs: 0, iframes: 0, locationBlocked: 0, hijackOverlays: 0,
        realmPatches: 0, sandboxedIframes: 0, docwrite: 0, sockets: 0,
        banners: 0,
    };

    /* ═══════════════════════════════════════════════════════════════
       URL UTILITIES
       ═══════════════════════════════════════════════════════════════ */
    const normalizeURL = v => {
        if (!v) return null;
        try {
            if (v instanceof URL) return v;
            if (typeof Request !== 'undefined' && v instanceof Request)
                return new URL(v.url, location.href);
            return new URL(String(v), location.href);
        } catch { return null; }
    };
    const hostnameMatches = (h, d) => {
        h = (h||'').toLowerCase(); d = (d||'').toLowerCase();
        return h === d || h.endsWith(`.${d}`);
    };
    const matchesDomainSet = (url, domains) => {
        const p = normalizeURL(url);
        if (!p || !/^https?:$/.test(p.protocol)) return false;
        for (const d of domains) if (hostnameMatches(p.hostname, d)) return true;
        return false;
    };
    const isBlockedURL = url =>
        (CONFIG.BLOCK_AD_REQUESTS && matchesDomainSet(url, AD_DOMAINS)) ||
        (CONFIG.BLOCK_TRACKERS && matchesDomainSet(url, TRACKER_DOMAINS));

    const AD_PATH_PATTERN =
        /(?:^|[\/_.?&#-])(?:ads?|adv?|adverts?|advertisements?|sponsors?(?:ed)?|promos?(?:tion)?|banners?|pop(?:ups?|unders?)?|interstitials?)(?:[\/_.?&#-]|$)/i;
    const AD_QUERY_PATTERN = /(^|[?&])(?:ad|ads|advert|sponsor|promo|banner)=/i;
    const sameSite = (a, b) => {
        a = (a || '').toLowerCase(); b = (b || '').toLowerCase();
        return !!a && !!b && (a === b || a.endsWith('.' + b) || b.endsWith('.' + a));
    };
    const isFirstPartyAdURL = url => {
        if (!CONFIG.BLOCK_FIRST_PARTY_AD_PATHS) return false;
        const u = normalizeURL(url);
        if (!u || !/^https?:$/.test(u.protocol)) return false;
        if (!sameSite(u.hostname, location.hostname)) return false;
        const hay = `${u.pathname}?${u.search}`;
        return AD_PATH_PATTERN.test(hay) || AD_QUERY_PATTERN.test(u.search);
    };
    const isAdResourceURL = url => isBlockedURL(url) || isFirstPartyAdURL(url);

    const looksLikeAdGifURL = url => {
        const p = normalizeURL(url);
        if (!p) return false;
        const path = (p.pathname + '?' + p.search).toLowerCase();
        if (AD_GIF_URL_PATTERN.test(p.href)) return true;
        const dim = path.match(GIF_DIMENSION_PATTERN);
        if (dim && COMMON_AD_DIMENSIONS.has(`${dim[1]}x${dim[2]}`)) return true;
        return false;
    };
    const urlEquals = (a, b) => {
        const ua = normalizeURL(a), ub = normalizeURL(b);
        if (!ua || !ub) return false;
        return ua.hostname === ub.hostname &&
               ua.pathname === ub.pathname && ua.search === ub.search;
    };

    /* ═══════════════════════════════════════════════════════════════
       REALM PATCHER (NEW - fixes iframe bypass)
       ═══════════════════════════════════════════════════════════════ */
    const RealmPatcher = (() => {
        const patched = new WeakSet();

        const patchRealm = w => {
            try {
                if (!w || w.__aab || patched.has(w)) return;
                patched.add(w);
                w.__aab = 1;

                // Block window.open in realm
                if (w.open && typeof w.open === 'function') {
                    const native = w.open;
                    w.open = function(...args) {
                        const url = args[0];
                        if (url && isBlockedURL(url)) {
                            stats.popups++;
                            log('Blocked realm popup:', url);
                            return null;
                        }
                        return native.apply(this, args);
                    };
                }

                // Block anchor clicks in realm
                const P = w.HTMLAnchorElement?.prototype;
                if (P) {
                    const nativeClick = P.click;
                    P.click = function() {
                        const tgt = this.getAttribute('target');
                        const href = this.getAttribute('href');
                        if ((tgt === '_blank' || tgt === '_new') && isBlockedURL(href)) {
                            stats.syntheticClicks++;
                            log('Blocked realm anchor.click():', href);
                            return;
                        }
                        return nativeClick.apply(this, arguments);
                    };
                }

                stats.realmPatches++;
                log('Patched realm:', w.location?.href || 'unknown');
            } catch (e) { warn('Realm patch failed:', e); }
        };

        const install = () => {
            if (!CONFIG.PATCH_IFRAME_REALM) return;

            try {
                const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
                if (!d || !d.get) {
                    warn('contentWindow getter not found');
                    return;
                }

                Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
                    get() {
                        let w;
                        try { w = d.get.call(this); } catch (e) { return null; }
                        try { patchRealm(w); } catch (e) { warn('patchRealm failed:', e); }
                        return w;
                    },
                    configurable: true,
                });

                // Also patch contentDocument
                const dd = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
                if (dd && dd.get) {
                    Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
                        get() {
                            let doc;
                            try { doc = dd.get.call(this); } catch (e) { return null; }
                            try { if (doc && doc.defaultView) patchRealm(doc.defaultView); } catch (e) { warn('patchRealm failed:', e); }
                            return doc;
                        },
                        configurable: true,
                    });
                }

                log('RealmPatcher installed');
            } catch (e) { warn('RealmPatcher install failed:', e); }
        };

        return { install, patchRealm };
    })();

    /* ═══════════════════════════════════════════════════════════════
       IFRAME SANDBOXER (NEW)
       ═══════════════════════════════════════════════════════════════ */
    const IframeSandboxer = (() => {
        const sandboxed = new WeakSet();

        const sandbox = iframe => {
            if (sandboxed.has(iframe)) return;
            if (iframe.hasAttribute('sandbox')) return;

            // Don't sandbox same-origin iframes that might be needed
            const src = iframe.getAttribute('src');
            if (src) {
                const p = normalizeURL(src);
                if (p && p.hostname === location.hostname) return;
            }

            try {
                iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
                sandboxed.add(iframe);
                stats.sandboxedIframes++;
                log('Sandboxed iframe:', src || 'no-src');
            } catch (e) { warn('Sandbox failed:', e); }
        };

        return { sandbox };
    })();

    /* ═══════════════════════════════════════════════════════════════
       POPUP BLOCKER (FIXED - no recursive getter)
       ═══════════════════════════════════════════════════════════════ */
    const PopupBlocker = (() => {
        const nativeOpen = window.open;

        // Create proxy ONCE and store in local variable
        const proxiedOpen = new Proxy(nativeOpen, {
            apply(target, thisArg, args) {
                const requestedURL = args[0];

                if (requestedURL && isBlockedURL(requestedURL)) {
                    stats.popups++;
                    log('Blocked ad-domain popup:', requestedURL);
                    return null;
                }

                const userActivation =
                    navigator.userActivation?.isActive === true;

                if (!userActivation) {
                    stats.popups++;
                    log('Blocked popup without consent:', requestedURL);
                    return null;
                }

                // Allow legitimate user-initiated popups (zero-tolerance gate removed)

                return Reflect.apply(target, thisArg, args);
            },
        });

        const install = () => {
            if (!CONFIG.BLOCK_POPUPS || typeof nativeOpen !== 'function') return;

            // Simply assign the proxy - no defineProperty with recursive getter
            window.open = proxiedOpen;

            // Also patch top.open
            try {
                if (window.top && window.top !== window &&
                    typeof window.top.open === 'function') {
                    window.top.open = proxiedOpen;
                }
            } catch (err) { warn('Cannot patch top.open:', err); }

            log('Popup blocker installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       ANCHOR CLICK SHIELD
       ═══════════════════════════════════════════════════════════════ */
    const AnchorClickShield = (() => {
        const isBlankAdAnchor = el =>
            el instanceof HTMLAnchorElement &&
            (el.getAttribute('target') === '_blank' ||
             el.getAttribute('target') === '_new') &&
            isBlockedURL(el.href);

        const install = () => {
            if (!CONFIG.BLOCK_SYNTHETIC_BLANK_CLICKS) return;

            // Patch HTMLAnchorElement.prototype.click
            try {
                const proto = HTMLAnchorElement.prototype;
                const nativeClick = proto.click;
                proto.click = function () {
                    if (isBlankAdAnchor(this)) {
                        stats.syntheticClicks++;
                        log('Blocked synthetic anchor.click():', this.href);
                        return;
                    }
                    return nativeClick.apply(this, arguments);
                };
            } catch (e) { warn('anchor.click patch failed:', e); }

            // Patch HTMLElement.prototype.click for broader coverage
            try {
                const proto = HTMLElement.prototype;
                const nativeClick = proto.click;
                proto.click = function () {
                    if (this instanceof HTMLAnchorElement && isBlankAdAnchor(this)) {
                        stats.syntheticClicks++;
                        log('Blocked synthetic element.click():', this.href);
                        return;
                    }
                    return nativeClick.apply(this, arguments);
                };
            } catch (e) { warn('element.click patch failed:', e); }

            // Patch dispatchEvent
            try {
                const proto = Element.prototype;
                const nativeDispatch = proto.dispatchEvent;
                proto.dispatchEvent = function (event) {
                    if (event && event.type === 'click' && !event.isTrusted) {
                        if (this instanceof HTMLAnchorElement && isBlankAdAnchor(this)) {
                            stats.syntheticClicks++;
                            log('Blocked synthetic dispatchEvent(click):', this.href);
                            return false;
                        }
                    }
                    return nativeDispatch.apply(this, arguments);
                };
            } catch (e) { warn('dispatchEvent patch failed:', e); }

            log('AnchorClickShield installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       CROSS-ORIGIN BLANK CLICK BLOCKER
       ═══════════════════════════════════════════════════════════════ */
    const CrossOriginBlocker = (() => {
        const install = () => {
            // Block ALL _blank clicks to cross-origin domains
            // This is the most effective approach for manga sites
            document.addEventListener('click', e => {
                const a = e.target?.closest?.('a[href]');
                if (!a) return;

                const target = (a.getAttribute('target') || '').toLowerCase();
                if (target !== '_blank' && target !== '_new') return;

                const url = normalizeURL(a.href);
                if (!url) return;

                // Allow same-origin
                if (url.hostname === location.hostname) return;
                if (url.hostname === 'www.' + location.hostname) return;
                if ('www.' + url.hostname === location.hostname) return;

                // Only block known ad/tracker domains
                if (!isBlockedURL(url)) return;

                e.preventDefault();
                e.stopPropagation();
                stats.blankAnchors++;
                log('Blocked ad _blank:', url.href);
            }, true);

            // Also block auxclick (middle click)
            document.addEventListener('auxclick', e => {
                if (e.button !== 1) return; // middle click only
                const a = e.target?.closest?.('a[href]');
                if (!a) return;

                const url = normalizeURL(a.href);
                if (!url) return;
                if (url.hostname === location.hostname) return;
                if (!isBlockedURL(url)) return;

                e.preventDefault();
                e.stopPropagation();
                stats.blankAnchors++;
                log('Blocked middle-click ad:', url.href);
            }, true);

            log('CrossOriginBlocker installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       SCRIPT LOADER BLOCKER (NEW - prevent ad scripts from loading)
       ═══════════════════════════════════════════════════════════════ */
    const ScriptLoaderBlocker = (() => {
        const install = () => {
            // Intercept appendChild, insertBefore for SCRIPT elements
            const methods = ['appendChild', 'insertBefore', 'append', 'prepend', 'insertAdjacentElement', 'replaceWith'];

            for (const method of methods) {
                const proto = Node.prototype;
                if (!proto[method]) continue;

                const native = proto[method];
                proto[method] = function(...args) {
                    for (const arg of args) {
                        if (arg instanceof HTMLScriptElement) {
                            const src = arg.getAttribute('src');
                            if (src) {
                                const p = normalizeURL(src);
                                if (p && isAdResourceURL(src)) {
                                    log('Blocked script append:', src);
                                    arg.removeAttribute('src');
                                    arg.setAttribute('type', 'javascript/blocked');
                                    arg.textContent = '';
                                    stats.requests++;
                                    return arg; // Return without executing
                                }
                                // Do not block all cross-origin scripts: only block known ad/tracker domains (above)
                            }
                        }
                    }
                    return native.apply(this, args);
                };
            }

            log('ScriptLoaderBlocker installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       REQUEST INTERCEPTION
       ═══════════════════════════════════════════════════════════════ */
    const RequestBlocker = (() => {
        const installFetch = () => {
            if (typeof window.fetch !== 'function') return;
            const nativeFetch = window.fetch;
            window.fetch = new Proxy(nativeFetch, {
                apply(target, thisArg, args) {
                    if (isAdResourceURL(args[0])) {
                        stats.requests++;
                        log('Blocked fetch:', normalizeURL(args[0])?.href);
                        return Promise.resolve(
                            new Response(null, { status: 204, statusText: 'No Content' })
                        );
                    }
                    return Reflect.apply(target, thisArg, args);
                },
            });
        };
        const installBeacon = () => {
            if (typeof navigator.sendBeacon !== 'function') return;
            const nativeBeacon = navigator.sendBeacon;
            navigator.sendBeacon = new Proxy(nativeBeacon, {
                apply(target, thisArg, args) {
                    if (isAdResourceURL(args[0])) {
                        stats.requests++;
                        log('Blocked beacon:', args[0]);
                        return true;
                    }
                    return Reflect.apply(target, thisArg, args);
                },
            });
        };
        const installXHR = () => {
            if (typeof XMLHttpRequest !== 'function') return;
            const nativeOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                if (isAdResourceURL(url)) {
                    stats.requests++;
                    log('Blocked XHR:', url);
                    this.__aabBlocked = true;
                }
                return nativeOpen.call(this, method, url, ...rest);
            };
            const nativeSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function (...args) {
                if (this.__aabBlocked) {
                    try { Object.defineProperty(this, 'readyState', { value: 0 }); } catch {}
                    return;
                }
                return nativeSend.apply(this, args);
            };
        };
        const install = () => {
            if (!CONFIG.BLOCK_AD_REQUESTS && !CONFIG.BLOCK_TRACKERS) return;
            try { installFetch(); }  catch (e) { warn('fetch patch failed:', e); }
            try { installBeacon(); } catch (e) { warn('beacon patch failed:', e); }
            try { installXHR(); }    catch (e) { warn('XHR patch failed:', e); }
            log('Request interception installed');
        };
        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       HIJACK OVERLAY CLEANER (FIXED - broader detection)
       ═══════════════════════════════════════════════════════════════ */
    const HijackOverlayCleaner = (() => {
        const removed = new WeakSet();

        const parseOpacity = style => {
            const v = style.opacity;
            const n = parseFloat(v);
            return isNaN(n) ? 1 : n;
        };
        const parseZIndex = style => {
            const v = style.zIndex;
            if (v === 'auto' || v == null) return 0;
            const n = parseInt(v, 10);
            return isNaN(n) ? 0 : n;
        };

        const looksLikeHijackOverlay = el => {
            if (!(el instanceof Element)) return false;
            let style;
            try { style = getComputedStyle(el); } catch { return false; }

            const pos = style.position;
            if (pos !== 'fixed' && pos !== 'absolute' && pos !== 'sticky') return false;

            const z = parseZIndex(style);
            if (z < CONFIG.HIJACK_ZINDEX_MIN) return false;

            const rect = el.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return false;
            if (rect.right < 0 || rect.bottom < 0) return false;
            if (rect.left > window.innerWidth) return false;
            if (rect.top > window.innerHeight) return false;

            // Check if element covers significant viewport area
            const vp = Math.max(1, window.innerWidth * window.innerHeight);
            const area = Math.max(0, rect.width) * Math.max(0, rect.height);
            const coversViewport = area / vp >= 0.15;

            // Check if element has no visible content (transparent hijack)
            const hasVisibleContent = el.querySelector('img, video, canvas, svg, iframe') !== null ||
                                      (el.innerText || '').trim().length > 0;

            // Either very transparent OR covers viewport with no visible content
            const op = parseOpacity(style);
            const isTransparent = op <= CONFIG.HIJACK_OPACITY_MAX;
            const bg = style.backgroundColor;
            const isTransparentBg = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';

            if (isTransparent && z >= 100) return true;
            if (coversViewport && !hasVisibleContent && z >= 50) return true;
            if (isTransparentBg && coversViewport && z >= 50) return true;

            return false;
        };

        const hasInlineLocationRedirect = el => {
            const attrs = ['onclick','ontouchend','onmousedown','ontouchstart','onmouseup','onpointerdown','onpointerup'];
            for (const a of attrs) {
                const v = el.getAttribute?.(a);
                if (!v) continue;
                if (/location\s*[\.\[]\s*(?:href|assign|replace)/i.test(v) ||
                    /top\s*\.\s*location\s*=/i.test(v) ||
                    /window\s*\.\s*location\s*=/i.test(v) ||
                    /open\s*\(/i.test(v)) {
                    return true;
                }
            }
            return false;
        };

        const remove = el => {
            if (isUserscriptUI(el) || removed.has(el) || !el.isConnected)
                return false;
            removed.add(el);
            el.remove();
            stats.hijackOverlays++;
            log('Removed hijack overlay:', el);
            return true;
        };

        const process = el => {
            if (!(el instanceof Element) || !el.isConnected) return;
            if (isUserscriptUI(el)) return;
            if (looksLikeHijackOverlay(el)) {
                remove(el);
                return;
            }
            try {
                const candidates = el.matches?.('[onclick],[ontouchend],[onmousedown],[ontouchstart],[onmouseup],[onpointerdown],[onpointerup]')
                    ? [el]
                    : [];
                const desc = el.querySelectorAll?.(
                    '[onclick],[ontouchend],[onmousedown],[ontouchstart],[onmouseup],[onpointerdown],[onpointerup]'
                ) || [];
                for (const c of [...candidates, ...desc]) {
                    if (hasInlineLocationRedirect(c)) {
                        remove(c);
                    }
                }
            } catch {}
        };

        const fullScan = () => {
            if (!document.documentElement) return;
            let cands;
            try {
                cands = document.querySelectorAll(
                    'div,section,article,aside,nav,header,footer,span'
                );
            } catch { return; }
            for (const c of cands) {
                if (isUserscriptUI(c)) continue;
                if (looksLikeHijackOverlay(c) || hasInlineLocationRedirect(c)) {
                    remove(c);
                }
            }
        };

        return { process, fullScan };
    })();

    /* ═══════════════════════════════════════════════════════════════
       DOM CLEANER
       ═══════════════════════════════════════════════════════════════ */
    const DOMCleaner = (() => {
        const removed = new WeakSet();

        const getResourceURL = el => {
            switch (el.tagName) {
                case 'SCRIPT': case 'IFRAME': case 'IMG':
                case 'SOURCE': case 'VIDEO': case 'EMBED':
                    return el.getAttribute('src') || el.getAttribute('data-src') ||
                           el.getAttribute('data-original') || el.getAttribute('data-echo') ||
                           el.getAttribute('data-lazy');
                case 'LINK':  return el.getAttribute('href');
                case 'OBJECT':return el.getAttribute('data');
                case 'A': case 'AREA':
                    return el.getAttribute('href');
                default: return null;
            }
        };

        const getSourcesetURLs = el => {
            if (el.tagName !== 'SOURCE' && el.tagName !== 'IMG') return [];
            const ss = el.getAttribute('srcset') || el.getAttribute('data-srcset');
            if (!ss) return [];
            return ss.split(',')
                .map(s => s.trim().split(/\s+/)[0])
                .filter(Boolean);
        };

        const AD_NAME_PATTERN =
            /(ad|ads|advert|sponsor|promo|banner|popup|popunder|interstitial|syndication|taboola|outbrain|revcontent|mgid)/i;
        const elementHasAdName = el => {
            try {
                const name = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;
                return AD_NAME_PATTERN.test(name);
            } catch { return false; }
        };
        const currentImageURL = el => {
            try {
                if (el.tagName === 'SOURCE') {
                    return el.getAttribute('src') ||
                           (el.getAttribute('srcset') || '').split(',')[0]?.trim().split(/\s+/)[0] ||
                           null;
                }
                return el.currentSrc ||
                       el.getAttribute('src') ||
                       el.getAttribute('data-src') ||
                       el.getAttribute('data-original') ||
                       el.getAttribute('data-echo') ||
                       el.getAttribute('data-lazy') ||
                       getSourcesetURLs(el)[0] ||
                       null;
            } catch { return null; }
        };
        const renderedSizeKey = el => {
            try {
                let w = el.naturalWidth || 0;
                let h = el.naturalHeight || 0;
                if ((!w || !h) && el.getBoundingClientRect) {
                    const r = el.getBoundingClientRect();
                    w = Math.round(r.width);
                    h = Math.round(r.height);
                }
                return w > 0 && h > 0 ? `${w}x${h}` : null;
            } catch { return null; }
        };
        const hasAdContext = el => {
            if (elementHasAdName(el)) return true;
            try {
                const link = el.closest?.('a[href],area[href]');
                if (link) {
                    const href = link.getAttribute('href') || link.href;
                    if (href && isAdResourceURL(href)) return true;
                }
            } catch {}
            return false;
        };
        const isAdImageLink = el =>
            el instanceof HTMLAnchorElement &&
            !!el.querySelector?.('img,picture') &&
            isAdResourceURL(el.getAttribute('href') || el.href);

        const isAdGif = el => {
            if (!CONFIG.BLOCK_AD_GIFS) return false;
            if (el.tagName === 'IMG' || el.tagName === 'SOURCE' ||
                el.tagName === 'PICTURE') {
                const urls = [
                    el.getAttribute('src'),
                    el.getAttribute('data-src'),
                    el.getAttribute('data-original'),
                    el.getAttribute('data-echo'),
                    el.getAttribute('data-lazy'),
                    ...getSourcesetURLs(el),
                ].filter(Boolean);
                for (const u of urls) {
                    if (isAdResourceURL(u)) return true;
                    if (looksLikeAdGifURL(u)) return true;
                }
                if (el.tagName === 'IMG') {
                    const current = currentImageURL(el);
                    if (current && /\.gif([?#]|$)/i.test(current)) {
                        if (isAdResourceURL(current) || looksLikeAdGifURL(current)) return true;
                        const key = renderedSizeKey(el);
                        if (key && COMMON_AD_DIMENSIONS.has(key) && hasAdContext(el)) return true;
                    }
                }
                if (el.tagName === 'PICTURE') {
                    const subs = el.querySelectorAll('source[srcset],source[src],img[src],img[data-src]');
                    for (const s of subs) {
                        const su = s.getAttribute('src') ||
                                   s.getAttribute('data-src') ||
                                   s.getAttribute('data-original') ||
                                   (s.getAttribute('srcset')||'').split(',')[0]?.trim().split(/\s+/)[0];
                        if (su && (isAdResourceURL(su) || looksLikeAdGifURL(su))) return true;
                    }
                }
            }
            return false;
        };

        const isBlankAdAnchor = el =>
            el instanceof HTMLAnchorElement &&
            (el.getAttribute('target') === '_blank' ||
             el.getAttribute('target') === '_new') &&
            isBlockedURL(el.href);

        const isAdIframe = el =>
            CONFIG.BLOCK_AD_IFRAMES &&
            el.tagName === 'IFRAME' &&
            isAdResourceURL(el.getAttribute('src') || el.getAttribute('data-src'));

        const isKnownAdElement = el => {
            if (!(el instanceof Element)) return false;
            try { if (el.matches(AD_SELECTOR)) return true; } catch {}
            if (isBlankAdAnchor(el)) return true;
            if (isAdIframe(el)) return true;
            if (isAdGif(el)) return true;
            if (isAdImageLink(el)) return true;
            if (el.tagName === 'A' || el.tagName === 'AREA') {
                const u = getResourceURL(el);
                if (u && isBlockedURL(u)) return true;
                return false;
            }
            const u = getResourceURL(el);
            if (u && isAdResourceURL(u)) return true;
            if (el.tagName === 'PICTURE') {
                const parentA = el.closest('a[target="_blank"]');
                if (parentA && isBlockedURL(parentA.href)) return true;
            }
            return false;
        };

        const remove = (el, reason) => {
            if (!(el instanceof Element) ||
                isUserscriptUI(el) ||
                removed.has(el) ||
                !el.isConnected)
                return false;
            removed.add(el);
            log('Removed:', reason, el);
            el.remove();
            stats.elements++;
            return true;
        };

        const classify = el => {
            if (isAdGif(el)) stats.gifs++;
            if (isAdIframe(el)) stats.iframes++;
            if (isBlankAdAnchor(el)) stats.blankAnchors++;
        };

        const processElement = el => {
            if (!(el instanceof Element)) return;
            if (isUserscriptUI(el)) return;

            // Sandbox new iframes
            if (CONFIG.SANDBOX_NEW_IFRAMES && el.tagName === 'IFRAME') {
                IframeSandboxer.sandbox(el);
            }

            if (isKnownAdElement(el)) {
                classify(el);
                remove(el, 'known ad element');
                return;
            }
            let descendants;
            try {
                descendants = el.querySelectorAll(
                    `${AD_SELECTOR},${RESOURCE_SELECTOR},img[src],img[data-src],img[data-original],img[data-echo],img[data-lazy],` +
                    `iframe[src],iframe[data-src],picture,source[srcset],source[src]`
                );
            } catch { return; }
            for (const child of descendants) {
                if (isKnownAdElement(child)) {
                    classify(child);
                    remove(child, 'ad descendant');
                }
            }
        };

        const fullCleanup = () => {
            if (!CONFIG.REMOVE_AD_ELEMENTS || !document.documentElement) return;
            let cands;
            try {
                cands = document.querySelectorAll(
                    `${AD_SELECTOR},${RESOURCE_SELECTOR},img[src],img[data-src],img[data-original],img[data-echo],img[data-lazy],` +
                    `iframe[src],iframe[data-src],picture,source[srcset],source[src]`
                );
            } catch (err) { warn('cleanup failed:', err); return; }
            for (const el of cands) {
                if (isKnownAdElement(el)) {
                    classify(el);
                    remove(el, 'periodic cleanup');
                }
            }
        };

        return { processElement, fullCleanup };
    })();

    /* ═══════════════════════════════════════════════════════════════
       ANTI-ADBLOCK OVERLAY CLEANER
       ═══════════════════════════════════════════════════════════════ */
    const OverlayCleaner = (() => {
        const CANDIDATE_SELECTOR = [
            '[id*="adblock" i]','[class*="adblock" i]',
            '[id*="ad-block" i]','[class*="ad-block" i]',
            '[role="dialog"]','[aria-modal="true"]',
        ].join(',');
        const coversSignificantViewport = el => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (!['fixed','absolute','sticky'].includes(style.position)) return false;
            const vp = Math.max(1, window.innerWidth * window.innerHeight);
            const area = Math.max(0, rect.width) * Math.max(0, rect.height);
            return area / vp >= 0.25;
        };
        const restoreScroll = () => {
            for (const el of [document.documentElement, document.body]) {
                if (!el) continue;
                const c = getComputedStyle(el);
                if (c.overflow === 'hidden' || c.overflowY === 'hidden') {
                    el.style.setProperty('overflow-y', 'auto', 'important');
                }
            }
        };
        const cleanup = root => {
            if (!CONFIG.REMOVE_ANTI_ADBLOCK_OVERLAYS) return;
            const base = (root instanceof Element || root instanceof Document)
                ? root : document;
            let cands;
            try { cands = base.querySelectorAll(CANDIDATE_SELECTOR); }
            catch { return; }
            let any = false;
            for (const el of cands) {
                if (!el.isConnected) continue;
                const text = (el.innerText || el.textContent || '').trim().slice(0, 1500);
                if (!ANTI_ADBLOCK_TEXT.test(text)) continue;
                const id = /ad[\s_-]*block/i.test(
                    `${el.id} ${typeof el.className === 'string' ? el.className : ''}`
                );
                if (id || coversSignificantViewport(el)) {
                    log('Removed anti-adblock overlay:', el);
                    el.remove();
                    stats.overlays++;
                    any = true;
                }
            }
            if (any) restoreScroll();
        };
        return { cleanup };
    })();

    /* ═══════════════════════════════════════════════════════════════
       META REFRESH FILTER
       ═══════════════════════════════════════════════════════════════ */
    const cleanMetaRefresh = root => {
        if (!CONFIG.REMOVE_META_REDIRECTS_TO_ADS) return;
        const base = (root instanceof Element || root instanceof Document)
            ? root : document;
        let metas = [];
        try {
            if (base instanceof HTMLMetaElement &&
                base.httpEquiv?.toLowerCase() === 'refresh') {
                metas = [base];
            } else {
                metas = base.querySelectorAll?.('meta[http-equiv="refresh" i]') || [];
            }
        } catch { return; }
        for (const m of metas) {
            const content = m.getAttribute('content') || '';
            const match = content.match(/url\s*=\s*["']?([^"';]+)/i);
            if (!match) continue;
            if (isBlockedURL(match[1].trim())) {
                log('Removed ad meta redirect:', match[1]);
                m.remove();
                stats.metaRedirects++;
            }
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       CSS HIDING (Cleaned - removed dangerous broad selectors)
       ═══════════════════════════════════════════════════════════════ */
    const installCosmeticFilter = () => {
        if (!CONFIG.REMOVE_AD_ELEMENTS) return;
        const style = document.createElement('style');
        style.dataset.aabStyle = 'true';
        style.textContent = `
            ${AD_SELECTOR},
            a[target="_blank"][href*="doubleclick.net"],
            a[target="_blank"][href*="googlesyndication.com"],
            a[target="_blank"][href*="pos.baidu.com"],
            a[target="_blank"][href*="alimama.com"],
            a[target="_blank"][href*="gdt.qq.com"],
            a[target="_blank"][href*="tanx.com"],
            a[target="_blank"][href*="mmstat.com"],
            a[target="_blank"][href*="gewt00g.com"],
            a[target="_blank"][href*="cdnweb.win"],
            a[target="_blank"][href*="aipornhub.ltd"],
            a[target="_blank"][href*="oe188bu.com"],
            a[target="_blank"][href*="lp-is.com"],
            img.ad-img,
            picture > source[srcset*=".gif"],
            img[src*="/gg"][src$=".gif"],
            img[src*="guanggao"][src$=".gif"],
            img[src*="tuiguang"][src$=".gif"],
            img[src*="banner"][src$=".gif"],
            img[src*="cdnweb.win"][src$=".gif"],
            a[href*="doubleclick.net"] > img,
            a[href*="googlesyndication.com"] > img,
            a[href*="pos.baidu.com"] > img,
            a[href*="gdt.qq.com"] > img,
            a[href*="tanx.com"] > img,
            a[href*="alimama.com"] > img,
            a[href*="gewt00g.com"] > img,
            a[href*="cdnweb.win"] > img,
            img[src$=".gif"][src*="300x250"],
            img[src$=".gif"][src*="728x90"],
            img[src$=".gif"][src*="960x90"],
            img[src$=".gif"][src*="160x600"] {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
                opacity: 0 !important;
                height: 0 !important;
                width: 0 !important;
                overflow: hidden !important;
            }
        `;
        const append = () => {
            const parent = document.head || document.documentElement;
            if (parent && !style.isConnected) parent.appendChild(style);
        };
        append();
        if (!style.isConnected) {
            document.addEventListener('readystatechange', append, { once: true });
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       DOCUMENT.WRITE AD GUARD
       ═══════════════════════════════════════════════════════════════ */
    const DocumentWriteGuard = (() => {
        const payloadHasAd = html => {
            const text = String(html ?? '');
            if (!text) return false;
            const urls = text.match(/https?:\/\/[^\s"'<>()]+/gi) || [];
            if (urls.some(u => isAdResourceURL(u))) return true;
            return AD_PATH_PATTERN.test(text) ||
                   /(adsbygoogle|data-ad-client|googlesyndication|doubleclick|taboola|outbrain)/i.test(text);
        };
        const install = () => {
            if (!CONFIG.BLOCK_DOCUMENT_WRITE_ADS) return;
            for (const name of ['write', 'writeln']) {
                const native = document[name];
                if (typeof native !== 'function') continue;
                document[name] = function (...args) {
                    try {
                        // After load, document.write would wipe the page; never allow it.
                        if (document.readyState !== 'loading') {
                            stats.docwrite++;
                            log(`Blocked document.${name} after load`);
                            return;
                        }
                        if (args.some(payloadHasAd)) {
                            stats.docwrite++;
                            log(`Blocked document.${name} ad payload`);
                            return;
                        }
                    } catch (e) { warn(`document.${name} guard failed:`, e); }
                    return native.apply(this, args);
                };
            }
            log('DocumentWriteGuard installed');
        };
        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       AD SOCKET BLOCKER
       ═══════════════════════════════════════════════════════════════ */
    const SocketBlocker = (() => {
        const dummySocket = (url, kind) => ({
            url: String(url),
            readyState: kind === 'websocket' ? 3 : 2,
            bufferedAmount: 0,
            extensions: '',
            protocol: '',
            binaryType: 'blob',
            onopen: null, onmessage: null, onerror: null, onclose: null,
            close() {}, send() {},
            addEventListener() {}, removeEventListener() {},
            dispatchEvent() { return false; },
        });
        const install = () => {
            if (!CONFIG.BLOCK_AD_SOCKETS) return;
            try {
                if (typeof window.EventSource === 'function') {
                    const NativeEventSource = window.EventSource;
                    window.EventSource = new Proxy(NativeEventSource, {
                        construct(target, args) {
                            if (isAdResourceURL(args[0])) {
                                stats.sockets++;
                                log('Blocked EventSource:', args[0]);
                                return dummySocket(args[0], 'eventsource');
                            }
                            return Reflect.construct(target, args);
                        },
                    });
                }
            } catch (e) { warn('EventSource patch failed:', e); }
            try {
                if (typeof window.WebSocket === 'function') {
                    const NativeWebSocket = window.WebSocket;
                    window.WebSocket = new Proxy(NativeWebSocket, {
                        construct(target, args) {
                            if (isAdResourceURL(args[0])) {
                                stats.sockets++;
                                log('Blocked WebSocket:', args[0]);
                                return dummySocket(args[0], 'websocket');
                            }
                            return Reflect.construct(target, args);
                        },
                    });
                }
            } catch (e) { warn('WebSocket patch failed:', e); }
            log('SocketBlocker installed');
        };
        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       FIXED/STICKY BANNER CLEANER
       ═══════════════════════════════════════════════════════════════ */
    const FixedBannerCleaner = (() => {
        const removed = new WeakSet();
        const BANNER_NAME_PATTERN =
            /(ad|ads|advert|sponsor|promo|banner|popup|popunder|interstitial|syndication|taboola|outbrain|revcontent|mgid)/i;

        const hasBannerName = el => {
            try {
                const name = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;
                return BANNER_NAME_PATTERN.test(name);
            } catch { return false; }
        };
        const hasAdResource = el => {
            try {
                const nodes = el.querySelectorAll(
                    'img[src],img[data-src],img[data-original],iframe[src],iframe[data-src],a[href],script[src]'
                );
                for (const n of nodes) {
                    const url = n.currentSrc ||
                                n.getAttribute('src') ||
                                n.getAttribute('data-src') ||
                                n.getAttribute('data-original') ||
                                n.getAttribute('href');
                    if (url && isAdResourceURL(url)) return true;
                }
            } catch {}
            return false;
        };
        const isFixedAdBanner = el => {
            if (!CONFIG.REMOVE_FIXED_AD_BANNERS) return false;
            if (!(el instanceof Element) || !el.isConnected) return false;
            if (!/^(DIV|SECTION|ASIDE|HEADER|FOOTER|INS)$/.test(el.tagName)) return false;
            let style;
            try { style = getComputedStyle(el); } catch { return false; }
            if (style.position !== 'fixed' && style.position !== 'sticky') return false;
            let rect;
            try { rect = el.getBoundingClientRect(); } catch { return false; }
            if (!rect || rect.width < 200 || rect.height < 24) return false;
            if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
            // Require real ad proof so normal fixed headers/navbars are untouched.
            return hasBannerName(el) || hasAdResource(el);
        };
        const remove = el => {
            if (isUserscriptUI(el) || removed.has(el) || !el.isConnected)
                return false;
            removed.add(el);
            el.remove();
            stats.banners++;
            log('Removed fixed ad banner:', el);
            return true;
        };
        const process = el => {
            if (isUserscriptUI(el)) return;
            if (isFixedAdBanner(el)) remove(el);
        };
        const fullScan = () => {
            if (!document.documentElement) return;
            let cands;
            try {
                cands = document.querySelectorAll('div,section,aside,header,footer,ins');
            } catch { return; }
            for (const c of cands) process(c);
        };
        return { process, fullScan };
    })();

    /* ═══════════════════════════════════════════════════════════════
       MUTATION OBSERVER
       ═══════════════════════════════════════════════════════════════ */
    const MutationEngine = (() => {
        let observer = null;
        let scheduled = false;
        const pending = new Set();
        const ATTRIBUTE_FILTER = [
            'src', 'srcset', 'href', 'action',
            'data-src', 'data-srcset', 'data-original', 'data-echo', 'data-lazy',
            'class', 'style',
        ];

        const flush = () => {
            scheduled = false;
            const nodes = Array.from(pending);
            pending.clear();
            for (const n of nodes) {
                if (!(n instanceof Element) || !n.isConnected) continue;
                DOMCleaner.processElement(n);
                FixedBannerCleaner.process(n);
                if (CONFIG.REMOVE_HIJACK_OVERLAYS) HijackOverlayCleaner.process(n);
                OverlayCleaner.cleanup(n);
                cleanMetaRefresh(n);
            }
        };
        const schedule = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(flush);
        };
        const start = () => {
            const root = document.documentElement;
            if (!root) { setTimeout(start, 0); return; }
            observer = new MutationObserver(muts => {
                for (const m of muts) {
                    if (m.type === 'childList') {
                        for (const n of m.addedNodes) {
                            if (n.nodeType === Node.ELEMENT_NODE) pending.add(n);
                        }
                    } else if (m.type === 'attributes' && m.target instanceof Element) {
                        pending.add(m.target);
                    }
                }
                if (pending.size) schedule();
            });
            observer.observe(root, CONFIG.WATCH_ATTRIBUTE_CHANGES
                ? { childList: true, subtree: true, attributes: true, attributeFilter: ATTRIBUTE_FILTER }
                : { childList: true, subtree: true });
            log('MutationObserver started');
        };
        const stop = () => { observer?.disconnect(); observer = null; pending.clear(); };
        return { start, stop };
    })();

    /* ═══════════════════════════════════════════════════════════════
       MAIN CLEANUP & INIT
       ═══════════════════════════════════════════════════════════════ */
    const runCleanup = () => {
        if (document.hidden) return;
        DOMCleaner.fullCleanup();
        FixedBannerCleaner.fullScan();
        if (CONFIG.REMOVE_HIJACK_OVERLAYS) HijackOverlayCleaner.fullScan();
        OverlayCleaner.cleanup(document);
        cleanMetaRefresh(document);
    };

    const initializeDOMFeatures = () => {
        MutationEngine.start();
        runCleanup();
        setInterval(runCleanup, CONFIG.CLEANUP_INTERVAL_MS);
    };

    try {
        // ── Order matters! Install realm patcher FIRST ──
        RealmPatcher.install();          // NEW: Patch iframe realms
        DocumentWriteGuard.install();    // NEW: Filter document.write ad injection
        SocketBlocker.install();         // NEW: Block EventSource/WebSocket to ad URLs
        ScriptLoaderBlocker.install();   // NEW: Block ad scripts before they load
        CrossOriginBlocker.install();    // NEW: Block _blank links to ad domains
        PopupBlocker.install();          // FIXED: No recursive getter
        AnchorClickShield.install();     // FIXED: Clean implementation
        RequestBlocker.install();
        installCosmeticFilter();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDOMFeatures, { once: true });
        } else {
            initializeDOMFeatures();
        }

        Object.defineProperty(window, '__AAB', {
            value: Object.freeze({
                getStats: () => ({ ...stats }),
                cleanup: runCleanup,
                stopObserver: MutationEngine.stop,
            }),
            configurable: true,
        });

        log('Initialized successfully (v9.1.1)');
    } catch (err) {
        console.error(PREFIX, 'Initialization failed:', err);
    }
})();
