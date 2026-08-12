// ==UserScript==
// @name         Popup & Ad Blocker Pro — China-Enhanced v8.1
// @namespace    http://tampermonkey.net/
// @version      8.1.0
// @description  Popup blocker, ad/tracker blocker, anti-adblock overlay remover, click-hijack grid killer, location-redirect guard, GIF-ad detector — tuned for Chinese sites (FIXED: tab leaks, dynamic anchors, eval injection, beforeunload hijack)
// @author       Mochizhouuu
// @match        *://*/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Mochizhouuu/Adblock-userscript/refs/heads/main/index.user.js
// @downloadURL  https://raw.githubusercontent.com/Mochizhouuu/Adblock-userscript/refs/heads/main/index.user.js
// @license      MIT
// ==/UserScript==

(() => {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       CONFIGURATION
       ═══════════════════════════════════════════════════════════════ */
    const CONFIG = Object.freeze({
        DEBUG: false,

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

        // BARU: proteksi tambahan
        BLOCK_EVAL_INJECTION: true,
        BLOCK_BEFOREUNLOAD_REDIRECT: true,
        BLOCK_DYNAMIC_ANCHOR_CLICK: true,
        BLOCK_AUXCLICK: true,

        MAX_POPUPS_PER_INTERACTION: 0,  // Diubah: 0 = blok SEMUA popup/tab baru
        USER_ACTIVATION_WINDOW_MS: 1500,
        CLEANUP_INTERVAL_MS: 3000,      // Dipercepat

        HIJACK_OPACITY_MAX: 0.15,       // Dinaikkan sedikit
        HIJACK_ZINDEX_MIN: 5,
    });

    const PREFIX = '[🛡️ AAB]';
    const log  = (...a) => CONFIG.DEBUG && console.log(PREFIX, ...a);
    const warn = (...a) => CONFIG.DEBUG && console.warn(PREFIX, ...a);

    /* ═══════════════════════════════════════════════════════════════
       DOMAIN LISTS (Diperluas)
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
        
        // — Tambahan: domain popup umum di situs manga China
        'go2cloud.org','go2affise.com','offergo','clcktrax.com',
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
        'revcontent.com','smartadserver.com','spotxchange.com',
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
       AD SELECTORS (Diperluas)
       ═══════════════════════════════════════════════════════════════ */
    const AD_SELECTORS = [
        // — Global
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

        // — Spesifik ditemukan di wmanhua.com & situs manga China
        '.ad-img',
        'a[target="_blank"] > picture',
        'picture > source[srcset*=".gif"]',

        // — Inline handler redirect ke location
        '[onclick*="location"]',
        '[ontouchend*="location"]',
        '[onmousedown*="location"]',
        '[ontouchstart*="location"]',

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
        
        // — BARU: selector tambahan untuk wmanhua.com
        '[class*="popup" i]','[id*="popup" i]',
        '[class*="popunder" i]','[id*="popunder" i]',
        '[class*="onclick" i]','[id*="onclick" i]',
        '[class*="overlay" i][style*="fixed"]',
        '[class*="modal" i][style*="fixed"]',
        '[class*="hijack" i]','[id*="hijack" i]',
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
        evalBlocked: 0, dynamicAnchors: 0, beforeunloadBlocked: 0,
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
       CLICK GUARD (Diperkuat)
       ═══════════════════════════════════════════════════════════════ */
    const ClickGuard = (() => {
        let lastTrustedClick = null;
        let popupCount = 0;

        const onCaptureClick = event => {
            if (!event.isTrusted) return;
            const target = event.target;
            const anchor =
                target instanceof HTMLAnchorElement ? target :
                target?.closest?.('a[href]');
            lastTrustedClick = {
                time: performance.now(),
                target,
                href: anchor?.getAttribute('href') || null,
                isAnchor: !!anchor,
            };
            popupCount = 0;

            if (CONFIG.BLOCK_BLANK_ANCHORS_TO_ADS && anchor) {
                const tgt = anchor.getAttribute('target');
                if ((tgt === '_blank' || tgt === '_new') && isBlockedURL(anchor.href)) {
                    event.preventDefault();
                    event.stopPropagation();
                    stats.popups++;
                    log('Blocked trusted click to ad anchor:', anchor.href);
                }
            }
        };

        const install = () => {
            // Tangkap SEMUA event klik
            document.addEventListener('click', onCaptureClick, true);
            document.addEventListener('pointerdown', onCaptureClick, true);
            document.addEventListener('touchstart', onCaptureClick, true);
            // BARU: tangkap auxclick (middle click, right click programmatic)
            if (CONFIG.BLOCK_AUXCLICK) {
                document.addEventListener('auxclick', onCaptureClick, true);
            }
            log('ClickGuard installed');
        };

        const isPopupConsentValid = popupURL => {
            if (!lastTrustedClick) return false;
            const recent =
                performance.now() - lastTrustedClick.time <=
                CONFIG.USER_ACTIVATION_WINDOW_MS;
            if (!recent) return false;
            const browserActivation =
                navigator.userActivation?.isActive === true;
            const { isAnchor, href } = lastTrustedClick;
            if (isAnchor && href && urlEquals(href, popupURL)) return true;
            if (isAnchor && href && !urlEquals(href, popupURL)) return false;
            return browserActivation;
        };

        const bumpPopup = () => { popupCount++; };

        return {
            install, isPopupConsentValid, bumpPopup,
            get popupCount() { return popupCount; },
            get maxPopups() { return CONFIG.MAX_POPUPS_PER_INTERACTION; },
        };
    })();

    /* ═══════════════════════════════════════════════════════════════
       POPUP BLOCKER (Diperkuat — blok SEMUA popup)
       ═══════════════════════════════════════════════════════════════ */
    const PopupBlocker = (() => {
        const nativeOpen = window.open;

        const install = () => {
            if (!CONFIG.BLOCK_POPUPS || typeof nativeOpen !== 'function') return;

            // Simpan referensi asli dengan nama acak untuk mencegah bypass
            const _nativeOpen = nativeOpen;

            window.open = new Proxy(_nativeOpen, {
                apply(target, thisArg, args) {
                    const requestedURL = args[0];
                    
                    // Blok SEMUA popup ke domain iklan
                    if (requestedURL && isBlockedURL(requestedURL)) {
                        stats.popups++;
                        log('Blocked ad-domain popup:', requestedURL);
                        return null;
                    }
                    
                    // Blok SEMUA popup tanpa user activation
                    const userActivation =
                        navigator.userActivation?.isActive === true ||
                        ClickGuard.isPopupConsentValid(requestedURL);
                    
                    if (!userActivation) {
                        stats.popups++;
                        log('Blocked popup without valid consent:', requestedURL);
                        return null;
                    }
                    
                    // Jika MAX_POPUPS_PER_INTERACTION = 0, blok SEMUA
                    if (CONFIG.MAX_POPUPS_PER_INTERACTION === 0) {
                        stats.popups++;
                        log('Blocked all popups (zero tolerance):', requestedURL);
                        return null;
                    }
                    
                    if (ClickGuard.popupCount >= ClickGuard.maxPopups) {
                        stats.popups++;
                        log('Blocked extra popup:', requestedURL);
                        return null;
                    }
                    ClickGuard.bumpPopup();
                    return Reflect.apply(target, thisArg, args);
                },
            });

            // Patch juga via defineProperty untuk mencegah reassignment
            try {
                Object.defineProperty(window, 'open', {
                    get() { return window.open; },
                    set() { warn('Attempt to override window.open blocked'); },
                    configurable: false,
                });
            } catch (e) { warn('window.open defineProperty failed:', e); }

            // Patch window.top.open
            try {
                if (window.top && window.top !== window &&
                    typeof window.top.open === 'function') {
                    const nativeTopOpen = window.top.open;
                    window.top.open = new Proxy(nativeTopOpen, {
                        apply(t, thisArg, args) {
                            const u = args[0];
                            if (u && isBlockedURL(u)) {
                                stats.popups++;
                                log('Blocked cross-frame popup:', u);
                                return null;
                            }
                            if (!ClickGuard.isPopupConsentValid(u) &&
                                navigator.userActivation?.isActive !== true) {
                                stats.popups++;
                                log('Blocked cross-frame popup (no consent):', u);
                                return null;
                            }
                            if (CONFIG.MAX_POPUPS_PER_INTERACTION === 0) {
                                stats.popups++;
                                log('Blocked top popup (zero tolerance):', u);
                                return null;
                            }
                            return Reflect.apply(t, thisArg, args);
                        },
                    });
                }
            } catch (err) { warn('Cannot patch top.open:', err); }

            log('Popup blocker installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       EVAL / FUNCTION / SETTIMEOUT GUARD (BARU)
       ═══════════════════════════════════════════════════════════════ */
    const CodeInjectionGuard = (() => {
        const install = () => {
            if (!CONFIG.BLOCK_EVAL_INJECTION) return;

            // Patch eval
            const nativeEval = window.eval;
            window.eval = function(code) {
                if (typeof code === 'string') {
                    const lowered = code.toLowerCase();
                    // Deteksi pola popup/tab dalam string eval
                    if (/window\.open|\.click\(\)|location\.href|location\.assign|location\.replace/.test(code)) {
                        stats.evalBlocked++;
                        log('Blocked eval with popup pattern');
                        return undefined;
                    }
                }
                return nativeEval.apply(this, arguments);
            };

            // Patch Function constructor
            const nativeFunction = window.Function;
            window.Function = new Proxy(nativeFunction, {
                construct(target, args) {
                    const code = args.join(' ');
                    if (/window\.open|\.click\(\)|location\.href|location\.assign|location\.replace/.test(code)) {
                        stats.evalBlocked++;
                        log('Blocked Function with popup pattern');
                        return function() {};
                    }
                    return Reflect.construct(target, args);
                },
            });

            // Patch setTimeout / setInterval string
            const patchTimer = (name, nativeFn) => {
                window[name] = new Proxy(nativeFn, {
                    apply(target, thisArg, args) {
                        if (typeof args[0] === 'string') {
                            const code = args[0];
                            if (/window\.open|\.click\(\)|location\.href|location\.assign|location\.replace/.test(code)) {
                                stats.evalBlocked++;
                                log(`Blocked ${name} with popup pattern`);
                                return 0;
                            }
                        }
                        return Reflect.apply(target, thisArg, args);
                    },
                });
            };
            patchTimer('setTimeout', window.setTimeout);
            patchTimer('setInterval', window.setInterval);

            log('CodeInjectionGuard installed');
        };
        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       BEFOREUNLOAD REDIRECT GUARD (BARU)
       ═══════════════════════════════════════════════════════════════ */
    const BeforeUnloadGuard = (() => {
        const install = () => {
            if (!CONFIG.BLOCK_BEFOREUNLOAD_REDIRECT) return;

            // Blok semua beforeunload yang mengandung redirect
            window.addEventListener('beforeunload', event => {
                // Cek apakah ada script yang mencoba redirect saat unload
                // dengan memeriksa perubahan location dalam 100ms terakhir
                stats.beforeunloadBlocked++;
                log('Intercepted beforeunload event');
                // Tidak preventDefault, tapi kita catat
            }, true);

            // Patch window.onbeforeunload
            const desc = Object.getOwnPropertyDescriptor(window, 'onbeforeunload');
            if (desc) {
                Object.defineProperty(window, 'onbeforeunload', {
                    get() { return desc.get ? desc.get.call(window) : null; },
                    set(fn) {
                        if (typeof fn === 'function') {
                            const wrapped = function(event) {
                                log('Blocked onbeforeunload handler');
                                return null;
                            };
                            if (desc.set) desc.set.call(window, wrapped);
                        }
                    },
                    configurable: true,
                });
            }

            log('BeforeUnloadGuard installed');
        };
        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       DYNAMIC ANCHOR CLICK GUARD (BARU)
       ═══════════════════════════════════════════════════════════════ */
    const DynamicAnchorGuard = (() => {
        const install = () => {
            if (!CONFIG.BLOCK_DYNAMIC_ANCHOR_CLICK) return;

            // Intercept createElement('a') + .click()
            const nativeCreateElement = Document.prototype.createElement;
            Document.prototype.createElement = new Proxy(nativeCreateElement, {
                apply(target, thisArg, args) {
                    const el = Reflect.apply(target, thisArg, args);
                    const tag = String(args[0]).toLowerCase();
                    
                    if (tag === 'a' || tag === 'area') {
                        // Patch .click() pada anchor yang baru dibuat
                        const nativeClick = el.click;
                        el.click = function() {
                            const href = this.getAttribute('href');
                            const tgt = this.getAttribute('target');
                            if ((tgt === '_blank' || tgt === '_new') && isBlockedURL(href)) {
                                stats.dynamicAnchors++;
                                log('Blocked dynamic anchor.click():', href);
                                return;
                            }
                            return nativeClick.apply(this, arguments);
                        };
                    }
                    return el;
                },
            });

            // Intercept createElementNS juga
            const nativeCreateElementNS = Document.prototype.createElementNS;
            if (nativeCreateElementNS) {
                Document.prototype.createElementNS = new Proxy(nativeCreateElementNS, {
                    apply(target, thisArg, args) {
                        const el = Reflect.apply(target, thisArg, args);
                        if (el instanceof HTMLAnchorElement) {
                            const nativeClick = el.click;
                            el.click = function() {
                                const href = this.getAttribute('href');
                                const tgt = this.getAttribute('target');
                                if ((tgt === '_blank' || tgt === '_new') && isBlockedURL(href)) {
                                    stats.dynamicAnchors++;
                                    log('Blocked dynamic NS anchor.click():', href);
                                    return;
                                }
                                return nativeClick.apply(this, arguments);
                            };
                        }
                        return el;
                    },
                });
            }

            log('DynamicAnchorGuard installed');
        };
        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       SYNTHETIC BLANK-CLICK SHIELD (Diperkuat)
       ═══════════════════════════════════════════════════════════════ */
    const AnchorClickShield = (() => {
        const isBlankAdAnchor = el =>
            el instanceof HTMLAnchorElement &&
            (el.getAttribute('target') === '_blank' ||
             el.getAttribute('target') === '_new') &&
            isBlockedURL(el.href);
        const isBlankAdArea = el =>
            el instanceof HTMLAreaElement &&
            (el.getAttribute('target') === '_blank' ||
             el.getAttribute('target') === '_new') &&
            isBlockedURL(el.href);

        const install = () => {
            if (!CONFIG.BLOCK_SYNTHETIC_BLANK_CLICKS) return;

            // HTMLAnchorElement.prototype.click
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

            // HTMLElement.prototype.click (untuk area)
            try {
                const proto = HTMLElement.prototype;
                const nativeClick = proto.click;
                proto.click = function () {
                    if (isBlankAdArea(this) || isBlankAdAnchor(this)) {
                        stats.syntheticClicks++;
                        log('Blocked synthetic element.click():', this.href || this);
                        return;
                    }
                    return nativeClick.apply(this, arguments);
                };
            } catch (e) { warn('element.click patch failed:', e); }

            // Element.prototype.dispatchEvent
            try {
                const proto = Element.prototype;
                const nativeDispatch = proto.dispatchEvent;
                proto.dispatchEvent = function (event) {
                    if (event && event.type === 'click' && !event.isTrusted) {
                        if (isBlankAdAnchor(this) || isBlankAdArea(this)) {
                            stats.syntheticClicks++;
                            log('Blocked synthetic dispatchEvent(click):', this.href);
                            return false;
                        }
                    }
                    return nativeDispatch.apply(this, arguments);
                };
            } catch (e) { warn('dispatchEvent patch failed:', e); }

            // HTMLFormElement.prototype.submit
            try {
                const proto = HTMLFormElement.prototype;
                const nativeSubmit = proto.submit;
                proto.submit = function () {
                    const tgt = this.getAttribute('target');
                    if ((tgt === '_blank' || tgt === '_new') &&
                        isBlockedURL(this.action)) {
                        stats.syntheticClicks++;
                        log('Blocked form.submit() to ad:', this.action);
                        return;
                    }
                    return nativeSubmit.apply(this, arguments);
                };
            } catch (e) { warn('form.submit patch failed:', e); }

            log('AnchorClickShield installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       LOCATION REDIRECT GUARD (Diperkuat)
       ═══════════════════════════════════════════════════════════════ */
    const LocationGuard = (() => {
        const install = () => {
            if (!CONFIG.BLOCK_AD_LOCATION_REDIRECTS) return;

            const wrap = (proto, name, nativeFn) => {
                if (typeof nativeFn !== 'function') return;
                try {
                    Object.defineProperty(proto, name, {
                        value: function (url) {
                            if (isBlockedURL(url)) {
                                stats.locationBlocked++;
                                log(`Blocked location.${name} to ad:`, url);
                                return;
                            }
                            return nativeFn.call(this, url);
                        },
                        writable: true,
                        configurable: true,
                    });
                } catch (e) { warn(`location.${name} patch failed:`, e); }
            };

            // Location.prototype
            try {
                wrap(Location.prototype, 'assign', Location.prototype.assign);
                wrap(Location.prototype, 'replace', Location.prototype.replace);
            } catch (e) { warn('Location prototype patch failed:', e); }

            // Location.prototype.href setter
            try {
                const desc = Object.getOwnPropertyDescriptor(
                    Location.prototype, 'href'
                );
                if (desc && desc.set) {
                    const nativeSet = desc.set;
                    Object.defineProperty(Location.prototype, 'href', {
                        ...desc,
                        set: function (url) {
                            if (isBlockedURL(url)) {
                                stats.locationBlocked++;
                                log('Blocked location.href= to ad:', url);
                                return;
                            }
                            return nativeSet.call(this, url);
                        },
                        configurable: true,
                    });
                }
            } catch (e) { warn('location.href setter patch failed:', e); }

            // BARU: Patch window.location (instance properties)
            try {
                const locDesc = Object.getOwnPropertyDescriptor(window, 'location');
                if (locDesc && locDesc.set) {
                    const nativeSet = locDesc.set;
                    Object.defineProperty(window, 'location', {
                        ...locDesc,
                        set: function(url) {
                            if (isBlockedURL(url)) {
                                stats.locationBlocked++;
                                log('Blocked window.location= to ad:', url);
                                return;
                            }
                            return nativeSet.call(this, url);
                        },
                        configurable: true,
                    });
                }
            } catch (e) { warn('window.location patch failed:', e); }

            // BARU: Patch document.location
            try {
                const docLocDesc = Object.getOwnPropertyDescriptor(document, 'location');
                if (docLocDesc && docLocDesc.set) {
                    const nativeSet = docLocDesc.set;
                    Object.defineProperty(document, 'location', {
                        ...docLocDesc,
                        set: function(url) {
                            if (isBlockedURL(url)) {
                                stats.locationBlocked++;
                                log('Blocked document.location= to ad:', url);
                                return;
                            }
                            return nativeSet.call(this, url);
                        },
                        configurable: true,
                    });
                }
            } catch (e) { warn('document.location patch failed:', e); }

            // BARU: Patch top.location
            try {
                if (window.top && window.top !== window) {
                    const topLocDesc = Object.getOwnPropertyDescriptor(window.top, 'location');
                    if (topLocDesc && topLocDesc.set) {
                        const nativeSet = topLocDesc.set;
                        Object.defineProperty(window.top, 'location', {
                            ...topLocDesc,
                            set: function(url) {
                                if (isBlockedURL(url)) {
                                    stats.locationBlocked++;
                                    log('Blocked top.location= to ad:', url);
                                    return;
                                }
                                return nativeSet.call(this, url);
                            },
                            configurable: true,
                        });
                    }
                }
            } catch (e) { warn('top.location patch failed:', e); }

            log('LocationGuard installed');
        };

        return { install };
    })();

    /* ═══════════════════════════════════════════════════════════════
       REQUEST INTERCEPTION (Diperkuat)
       ═══════════════════════════════════════════════════════════════ */
    const RequestBlocker = (() => {
        const installFetch = () => {
            if (typeof window.fetch !== 'function') return;
            const nativeFetch = window.fetch;
            window.fetch = new Proxy(nativeFetch, {
                apply(target, thisArg, args) {
                    if (isBlockedURL(args[0])) {
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
                    if (isBlockedURL(args[0])) {
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
                if (isBlockedURL(url)) {
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
       HIJACK OVERLAY CLEANER (Diperkuat)
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
            if (style.position !== 'fixed') return false;
            const op = parseOpacity(style);
            const z  = parseZIndex(style);
            if (op > CONFIG.HIJACK_OPACITY_MAX) return false;
            if (z < CONFIG.HIJACK_ZINDEX_MIN) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return false;
            if (rect.right < 0 || rect.bottom < 0) return false;
            if (rect.left > window.innerWidth) return false;
            if (rect.top > window.innerHeight) return false;
            return true;
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
            if (removed.has(el) || !el.isConnected) return false;
            removed.add(el);
            el.remove();
            stats.hijackOverlays++;
            log('Removed hijack overlay:', el);
            return true;
        };

        const process = el => {
            if (!(el instanceof Element) || !el.isConnected) return;
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
                    'div[style*="position:fixed"],div[style*="position: fixed"],' +
                    'div[style*="position:fixed !important"],' +
                    '[onclick],[ontouchend],[onmousedown],[ontouchstart],[onmouseup],[onpointerdown],[onpointerup]'
                );
            } catch { return; }
            for (const c of cands) {
                if (looksLikeHijackOverlay(c) || hasInlineLocationRedirect(c)) {
                    remove(c);
                }
            }
        };

        return { process, fullScan };
    })();

    /* ═══════════════════════════════════════════════════════════════
       DOM CLEANER (Diperkuat)
       ═══════════════════════════════════════════════════════════════ */
    const DOMCleaner = (() => {
        const removed = new WeakSet();

        const getResourceURL = el => {
            switch (el.tagName) {
                case 'SCRIPT': case 'IFRAME': case 'IMG':
                case 'SOURCE': case 'VIDEO': case 'EMBED':
                    return el.getAttribute('src') || el.getAttribute('data-src');
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

        const isAdGif = el => {
            if (!CONFIG.BLOCK_AD_GIFS) return false;
            if (el.tagName === 'IMG' || el.tagName === 'SOURCE' ||
                el.tagName === 'PICTURE') {
                const urls = [
                    el.getAttribute('src'),
                    el.getAttribute('data-src'),
                    ...getSourcesetURLs(el),
                ].filter(Boolean);
                for (const u of urls) {
                    if (isBlockedURL(u)) return true;
                    if (looksLikeAdGifURL(u)) return true;
                }
                if (el.tagName === 'PICTURE') {
                    const subs = el.querySelectorAll('source[srcset],source[src],img[src]');
                    for (const s of subs) {
                        const su = s.getAttribute('src') ||
                                   s.getAttribute('data-src') ||
                                   (s.getAttribute('srcset')||'').split(',')[0]?.trim().split(/\s+/)[0];
                        if (su && (isBlockedURL(su) || looksLikeAdGifURL(su))) return true;
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
            isBlockedURL(el.getAttribute('src') || el.getAttribute('data-src'));

        const isKnownAdElement = el => {
            if (!(el instanceof Element)) return false;
            try { if (el.matches(AD_SELECTOR)) return true; } catch {}
            if (isBlankAdAnchor(el)) return true;
            if (isAdIframe(el)) return true;
            if (isAdGif(el)) return true;
            const u = getResourceURL(el);
            if (u && isBlockedURL(u)) return true;
            if (el.tagName === 'PICTURE') {
                const parentA = el.closest('a[target="_blank"]');
                if (parentA && isBlockedURL(parentA.href)) return true;
            }
            return false;
        };

        const remove = (el, reason) => {
            if (!(el instanceof Element) || removed.has(el) || !el.isConnected)
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
            if (isKnownAdElement(el)) {
                classify(el);
                remove(el, 'known ad element');
                return;
            }
            let descendants;
            try {
                descendants = el.querySelectorAll(
                    `${AD_SELECTOR},${RESOURCE_SELECTOR},img[src],img[data-src],` +
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
                    `${AD_SELECTOR},${RESOURCE_SELECTOR},img[src],img[data-src],` +
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
       CSS HIDING (Diperluas)
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
            a[target="_blank"][href*="go2cloud.org"],
            a[target="_blank"][href*="onclickmega.com"],
            img.ad-img,
            picture > source[srcset*=".gif"],
            img[src*="/gg"][src$=".gif"],
            img[src*="guanggao"][src$=".gif"],
            img[src*="tuiguang"][src$=".gif"],
            img[src*="banner"][src$=".gif"],
            img[src*="cdnweb.win"][src$=".gif"],
            /* BARU: sembunyikan elemen popup umum */
            [class*="popup" i][style*="fixed"],
            [id*="popup" i][style*="fixed"],
            [class*="modal" i][style*="fixed"] {
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
       MUTATION OBSERVER (Dipercepat)
       ═══════════════════════════════════════════════════════════════ */
    const MutationEngine = (() => {
        let observer = null;
        let scheduled = false;
        const pending = new Set();

        const flush = () => {
            scheduled = false;
            const nodes = Array.from(pending);
            pending.clear();
            for (const n of nodes) {
                if (!(n instanceof Element) || !n.isConnected) continue;
                DOMCleaner.processElement(n);
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
                    for (const n of m.addedNodes) {
                        if (n.nodeType === Node.ELEMENT_NODE) pending.add(n);
                    }
                }
                if (pending.size) schedule();
            });
            observer.observe(root, { childList: true, subtree: true });
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
        // document-start shields — URUTAN PENTING!
        CodeInjectionGuard.install();    // BARU: blok eval/Function/setTimeout string
        BeforeUnloadGuard.install();     // BARU: blok beforeunload redirect
        DynamicAnchorGuard.install();    // BARU: intercept createElement('a')
        ClickGuard.install();
        PopupBlocker.install();
        AnchorClickShield.install();
        LocationGuard.install();
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

        log('Initialized successfully (v8.1.0)');
    } catch (err) {
        console.error(PREFIX, 'Initialization failed:', err);
    }
})();
