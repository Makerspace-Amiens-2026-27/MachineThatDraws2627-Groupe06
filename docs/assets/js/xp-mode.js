/* À placer dans : assets/js/xp-mode.js */
(function () {
  'use strict';

  var script = document.currentScript;
  var CUSTOM_CSS = script ? script.getAttribute('data-css') : '';
  var SELECTOR = 'main';
  var SHEETS = { xp: 'https://unpkg.com/xp.css', classic: 'https://unpkg.com/98.css' };
  var K_ON = 'mode_xp_enabled';
  var K_CFG = 'xp_config';
  var K_SES = 'xp_session';
  var DEFAULTS = { multitask: false, keepState: true, theme: 'xp' };
  // Préfixe du site (baseurl) déduit de l'adresse de ce script : fonctionne aussi pour un site de projet GitHub Pages
  var SITE_BASE = (function () {
    try {
      // 1) data-home vaut "{{ '/' | relative_url }}" : c'est exactement le baseurl du site
      var h = script && script.getAttribute('data-home');
      if (h) return new URL(h, location.href).pathname.replace(/\/+$/, '');
      // 2) à défaut, on le déduit de l'adresse de ce script
      return new URL(script.src).pathname.replace(/\/assets\/js\/[^\/]*$/, '');
    } catch (e) { return ''; }
  })();
  window.XP_MODE_INFO = { version: 6, base: SITE_BASE };   // pour vérifier dans la console quelle version est chargée
  function sitePath(p) { return location.origin + SITE_BASE + p; }
  function assetIco(name) { return sitePath('/assets/images/winxp/ico/' + name + '.png'); }
  document.documentElement.style.setProperty('--xp-ico-volume', "url('" + assetIco('volume') + "')");
  document.documentElement.style.setProperty('--xp-ico-volume-off', "url('" + assetIco('volume-muted') + "')");
  var AUTHOR = 'Jan Klod';          // nom affiché dans l'app "Informations système"
  var SEARCH_URL = (script && script.getAttribute('data-search')) || '/assets/js/search-data.json';
  var searchData = null, searchLoading = null;
  var HOME_URL = (script && script.getAttribute('data-home')) || '/';
  var dragMoved = false;
  // >>> METTEZ ICI LE LIEN VERS LEQUEL MÈNE LE FICHIER "secret" (double-clic sur le bureau) <<<
  var SECRET_URL = '';
  var K_SECRET = 'xp_secret_restored';
  var secretGone = false;           // "Vider la corbeille" : le fichier disparaît jusqu'au prochain redémarrage

  var cfg = loadCfg();
  var env = null, winsEl = null, tabsEl = null;
  var wins = [], seq = 0, zTop = 100, activeId = null, lastGeo = null, restoring = false;
  var showPrograms = false;
  var mainProgramsHtml = null;
  var standbyOn = false, booting = false, bsodOn = false;

  function getIconClass(type, url) {
    if (type === 'cpanel') return 'xp-ico-cpanel';
    if (type === 'sysinfo') return 'xp-ico-sysinfo';
    if (type === 'search') return 'xp-ico-search';
    if (type === 'recycle') return 'xp-ico-recycle';
    if (type === 'run') return 'xp-ico-run';
    if (type === 'notepad') return 'xp-ico-notepad';
    if (!url) return 'xp-ico-folder';
    var cleanUrl = clean(url);
    if (cleanUrl.indexOf('/journal') !== -1) return 'xp-ico-journal';
    if (cleanUrl.indexOf('/tests') !== -1) return 'xp-ico-tests';
    if (cleanUrl.indexOf('/github') !== -1) return 'xp-ico-github';
    if (cleanUrl === clean(sitePath('/'))) return 'xp-ico-computer';
    return 'xp-ico-folder';
  }

  function iconUrl(w) {
    if (w.type === 'notepad') return assetIco('notepad');
    var name = getIconClass(w.type, w.url).replace('xp-ico-', '');
    return assetIco(name);
  }

  function loadCfg() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem(K_CFG)) || {}; } catch (e) {}
    return Object.assign({}, DEFAULTS, c);
  }
  function saveCfg() {
    try { localStorage.setItem(K_CFG, JSON.stringify(cfg)); } catch (e) {}
  }

  function byId(id) {
    for (var i = 0; i < wins.length; i++) if (wins[i].id === id) return wins[i];
    return null;
  }
  function isPage(w) { return w.type === 'page'; }
  function winKey(w) { return isPage(w) ? w.url : w.type; }
  function winOf(node) {
    var el = node.closest('.xp-window');
    return el ? byId(+el.getAttribute('data-xp-id')) : null;
  }
  function clean(href) {
    var u = new URL(href, location.href);
    return u.origin + u.pathname.replace(/index\.html$/, '') + u.search;
  }
  function freshState() { return { left: null, top: null, max: false, min: false }; }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(K_SES)); } catch (e) { return null; }
  }
  function saveSession() {
    var a = byId(activeId);
    if (a && isPage(a)) lastGeo = { left: a.st.left, top: a.st.top, max: a.st.max };
    if (restoring) return;
    try {
      if (!cfg.keepState) { sessionStorage.removeItem(K_SES); return; }
      sessionStorage.setItem(K_SES, JSON.stringify({
        active: a ? winKey(a) : null,
        windows: wins.filter(function (w) { return w.type !== 'notepad' && w.type !== 'run'; }).map(function (w) {
          return { type: w.type, url: w.url, view: w.view, st: w.st, hist: w.hist, hi: w.hi };
        })
      }));
    } catch (e) {}
  }

  function applyTheme() {
    var href = SHEETS[cfg.theme] || SHEETS.xp;
    document.documentElement.classList.toggle('xp-classic', cfg.theme === 'classic');
    var old = document.getElementById('xp-theme-sheet');
    if (old && old.getAttribute('href') === href) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.className = 'xp-css';
    if (!old) {
      l.id = 'xp-theme-sheet';
    } else {
      l.onload = function () { old.remove(); l.id = 'xp-theme-sheet'; };
    }
    document.head.insertBefore(l, document.getElementById('xp-custom-sheet'));
  }

  function applyGeo(w) {
    var s = w.st;
    w.el.style.left = s.left != null ? Math.max(0, Math.min(s.left, window.innerWidth - 120)) + 'px' : '';
    w.el.style.top = s.top != null ? Math.max(0, Math.min(s.top, window.innerHeight - 90)) + 'px' : '';
    w.el.classList.toggle('maximized', !!s.max);
    w.el.classList.toggle('minimized', !!s.min);
    var mb = w.el.querySelector('[data-xp-maximize]');
    if (mb) mb.setAttribute('aria-label', s.max ? 'Restore' : 'Maximize');
  }

  function setTitle(w, t) {
    w.title = t;
    var ico = iconUrl(w);
    var icoClass = getIconClass(w.type, w.url);
    var displayTitle = isPage(w) ? t + ' - Doc Projet' : t;

    w.el.querySelector('.title-bar-text').innerHTML =
      '<span class="xp-win-title-ico ' + icoClass + '" style="background-image: url(\'' + ico + '\');"></span><span>' + displayTitle + '</span>';

    w.tab.innerHTML = '<span class="xp-tab-ico" style="background-image: url(\'' + ico + '\');"></span><span>' + t + '</span>';
    w.tab.title = t;
  }

  function createWindow(o) {
    var w = {
      id: ++seq, type: o.type, url: o.url || null, view: 'home',
      st: Object.assign(freshState(), o.st || {}),
      hist: o.url ? [o.url] : [], hi: 0
    };
    var el = document.createElement('div');
    el.className = 'window xp-window' + (o.type !== 'page' ? ' xp-app xp-app-' + o.type : '');
    el.setAttribute('data-xp-id', w.id);
    el.innerHTML =
      '<div class="title-bar"><div class="title-bar-text"></div><div class="title-bar-controls">' +
      '<button type="button" aria-label="Minimize" data-xp-minimize></button>' +
      '<button type="button" aria-label="Maximize" data-xp-maximize></button>' +
      '<button type="button" aria-label="Close" data-xp-close></button>' +
      '</div></div>' +
      (isPage(w)
        ? '<div class="xp-toolbar">' +
          '<button type="button" data-xp-back title="Page précédente">&#9664; Précédent</button>' +
          '<button type="button" data-xp-fwd title="Page suivante">Suivant &#9654;</button>' +
          '<button type="button" data-xp-home title="Page d\'accueil">Accueil</button>' +
          '<div class="xp-tb-addr"><span>Adresse</span><div class="xp-tb-addr-box"></div></div>' +
          '</div>'
        : '') +
      '<div class="window-body"><div class="window-body-container"></div></div>';
    w.el = el;
    w.scroller = el.querySelector('.window-body');
    w.body = el.querySelector('.window-body-container');
    if (isPage(w)) w.body.classList.add('main-content');

    w.tab = document.createElement('div');
    w.tab.className = 'xp-task-tab';
    w.tab.setAttribute('data-xp-tab', w.id);

    winsEl.appendChild(el);
    tabsEl.appendChild(w.tab);
    wins.push(w);
    setTitle(w, o.title || '');
    updateNav(w);
    applyGeo(w);
    makeDraggable(w);
    el.addEventListener('mousedown', function () { if (activeId !== w.id) focusWin(w); }, true);
    return w;
  }

  function focusWin(w) {
    if (!w) return;
    if (w.st.min) { w.st.min = false; applyGeo(w); }
    w.el.style.zIndex = ++zTop;
    activeId = w.id;
    wins.forEach(function (x) { x.tab.classList.toggle('active', x === w); });
    if (isPage(w) && w.url) { try { history.replaceState(null, '', w.url); } catch (e) {} }
    saveSession();
  }

  function focusTop() {
    var best = null;
    wins.forEach(function (x) {
      if (!x.st.min && (!best || +x.el.style.zIndex > +best.el.style.zIndex)) best = x;
    });
    if (best) focusWin(best);
  }

  function minimize(w) {
    w.st.min = true;
    applyGeo(w);
    if (activeId === w.id) {
      activeId = null;
      w.tab.classList.remove('active');
      focusTop();
    }
    saveSession();
  }

  function toggleMax(w) {
    w.st.max = !w.st.max;
    applyGeo(w);
    saveSession();
  }

  function closeWin(w) {
    var wasActive = activeId === w.id;
    w.el.remove();
    w.tab.remove();
    wins = wins.filter(function (x) { return x !== w; });
    if (wasActive) { activeId = null; focusTop(); }
    saveSession();
  }

  function makeDraggable(w) {
    var bar = w.el.querySelector('.title-bar');
    bar.addEventListener('dblclick', function (e) {
      if (!e.target.closest('button')) toggleMax(w);
    });
    bar.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || e.target.closest('button') || w.st.max) return;
      e.preventDefault();
      var sx = e.clientX, sy = e.clientY, ox = w.el.offsetLeft, oy = w.el.offsetTop;

      var isClassic = cfg.theme === 'classic';
      var ghost = null;

      if (isClassic) {
        ghost = document.createElement('div');
        ghost.className = 'xp-drag-ghost';
        ghost.style.left = ox + 'px';
        ghost.style.top = oy + 'px';
        ghost.style.width = w.el.offsetWidth + 'px';
        ghost.style.height = w.el.offsetHeight + 'px';
        env.appendChild(ghost);
      }

      function move(ev) {
        var newLeft = ox + ev.clientX - sx;
        var newTop = Math.max(0, oy + ev.clientY - sy);

        if (isClassic && ghost) {
          ghost.style.left = newLeft + 'px';
          ghost.style.top = newTop + 'px';
        } else {
          w.el.style.left = newLeft + 'px';
          w.el.style.top = newTop + 'px';
        }
      }

      function up(ev) {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);

        if (isClassic && ghost) {
          w.el.style.left = ghost.style.left;
          w.el.style.top = ghost.style.top;
          ghost.remove();
        }

        w.st.left = w.el.offsetLeft;
        w.st.top = w.el.offsetTop;
        saveSession();
      }

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  function enforceSingle() {
    var pages = wins.filter(isPage);
    if (pages.length < 2) return;
    var keep = pages.reduce(function (a, b) { return +b.el.style.zIndex > +a.el.style.zIndex ? b : a; });
    pages.forEach(function (p) { if (p !== keep) closeWin(p); });
  }

  function onCfg(k) {
    if (k === 'multitask' && !cfg.multitask) enforceSingle();
    if (k === 'keepState') saveSession();
  }

  function pageTitle(doc) {
    var h = doc.querySelector(SELECTOR + ' h1');
    var t = (h ? h.textContent : doc.title) || 'Page';
    // On retire les émojis du titre (ex. "📖 Journal de bord") : seule l'icône des assets reste dans la barre de titre
    t = t.replace(/[\p{Extended_Pictographic}️‍]/gu, '');
    return t.replace(/\s+/g, ' ').trim() || 'Page';
  }

  function absolutize(root, base) {
    [['a[href]', 'href'], ['img[src]', 'src'], ['source[src]', 'src'],
     ['video[src]', 'src'], ['audio[src]', 'src'], ['iframe[src]', 'src']].forEach(function (p) {
      root.querySelectorAll(p[0]).forEach(function (n) {
        var v = n.getAttribute(p[1]);
        if (!v || v.charAt(0) === '#' || /^(mailto:|tel:|javascript:|data:)/i.test(v)) return;
        try { n.setAttribute(p[1], new URL(v, base).href); } catch (e) {}
      });
    });
  }

  function fetchPage(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var m = doc.querySelector(SELECTOR);
      if (!m) throw new Error('contenu introuvable');
      var main = document.importNode(m, true);
      ['#xp-template', '#btn-switch-xp', 'script[src*="xp-mode"]'].forEach(function (s) {
        main.querySelectorAll(s).forEach(function (n) { n.remove(); });
      });
      absolutize(main, url);
      return { main: main, title: pageTitle(doc) };
    });
  }

  function typeset(w) {
    try {
      var M = window.MathJax;
      if (!M) return;                     // MathJax pas encore chargé : il traitera la page lui-même
      var tries = 0;
      var go = function () {
        if (M.typesetPromise) { M.typesetPromise([w.body]).catch(function () {}); return; }
        if (++tries < 40) setTimeout(go, 500);      // MathJax est encore en train de se charger
      };
      if (M.startup && M.startup.promise) M.startup.promise.then(go); else go();
    } catch (e) {}
  }

  function scrollToHash(w, hash) {
    if (!w || !hash || hash.length < 2) return;
    try {
      var id = decodeURIComponent(hash.slice(1));
      var el = w.body.querySelector('#' + CSS.escape(id));
      if (el) el.scrollIntoView();
    } catch (e) {}
  }

  /* ----- Historique par fenêtre (barre Précédent / Suivant / Accueil) ----- */
  function updateNav(w) {
    if (!w || !isPage(w)) return;
    var b = w.el.querySelector('[data-xp-back]');
    var f = w.el.querySelector('[data-xp-fwd]');
    var a = w.el.querySelector('.xp-tb-addr-box');
    if (b) b.disabled = w.hi <= 0;
    if (f) f.disabled = w.hi >= w.hist.length - 1;
    if (a) {
      try { var u = new URL(w.url, location.href); a.textContent = u.pathname + u.hash; }
      catch (e) { a.textContent = w.url || ''; }
    }
  }

  function fillPage(w, url, r) {
    w.url = url;
    w.body.innerHTML = '';
    w.body.appendChild(r.main);
    w.scroller.scrollTop = 0;
    setTitle(w, r.title);
    typeset(w);
    updateNav(w);
  }

  function goHistory(w, delta) {
    if (!w || !isPage(w)) return;
    var i = w.hi + delta;
    if (i < 0 || i >= w.hist.length) return;
    var url = w.hist[i];
    fetchPage(url).then(function (r) {
      w.hi = i;
      fillPage(w, url, r);
      focusWin(w);
    }).catch(function (err) {
      console.warn('Mode XP : navigation impossible.', err);
    });
  }

  function addPage(url, title, main, st) {
    var w = createWindow({ type: 'page', url: url, title: title, st: st });
    w.body.appendChild(main);
    typeset(w);
    return w;
  }

  function openPage(href, hash) {
    var url = clean(href);
    var same = wins.filter(function (w) { return isPage(w) && w.url === url; })[0];
    if (same) { focusWin(same); scrollToHash(same, hash); return Promise.resolve(); }

    return fetchPage(url).then(function (r) {
      var w = null;
      if (!cfg.multitask) {
        var cur = byId(activeId);
        var pages = wins.filter(isPage);
        w = (cur && isPage(cur)) ? cur : pages[pages.length - 1];
      }
      if (w) {
        w.hist = w.hist.slice(0, w.hi + 1);
        w.hist.push(url);
        w.hi = w.hist.length - 1;
        fillPage(w, url, r);
        if (!cfg.keepState) { w.st = freshState(); applyGeo(w); }
      } else {
        w = addPage(url, r.title, r.main, freshState());
      }
      focusWin(w);
      scrollToHash(w, hash);
    }).catch(function (err) {
      console.warn('Mode XP : ouverture impossible, navigation classique.', err);
      location.href = url;
    });
  }

  /* ===================== Panneau de configuration ===================== */
  function radio(v, label) {
    return '<div class="field-row"><input type="radio" name="cp-theme" id="cp-th-' + v + '" value="' + v + '"' +
      (cfg.theme === v ? ' checked' : '') + '><label for="cp-th-' + v + '">' + label + '</label></div>';
  }
  function check(key, id, label, hint) {
    return '<div class="field-row"><input type="checkbox" id="' + id + '" data-cfg="' + key + '"' +
      (cfg[key] ? ' checked' : '') + '><label for="' + id + '">' + label + '</label></div>' +
      '<p class="cp-hint">' + hint + '</p>';
  }
  function cat(view, iconName, label) {
    var icoUrl = /^data:/.test(iconName) ? iconName : assetIco(iconName);
    return '<a href="#" class="cp-cat" data-cp-view="' + view + '"><span class="cp-ico" style="background-image: url(\'' + icoUrl + '\');"></span><span>' + label + '</span></a>';
  }

  function renderCpanel(w, view) {
    w.view = view;
    var body;
    if (view === 'appearance') {
      body = '<h2 class="cp-h">Apparence et thèmes</h2>' +
        '<p>Choisissez le thème du bureau. Le changement est immédiat.</p>' +
        '<fieldset><legend>Thème</legend>' +
        radio('xp', 'Windows XP (Luna)') + radio('classic', 'Windows classique') +
        '</fieldset>';
    } else if (view === 'windows') {
      body = '<h2 class="cp-h">Fenêtres et multitâche</h2>' +
        '<fieldset><legend>Multitâche</legend>' +
        check('multitask', 'cp-multi', 'Autoriser plusieurs fenêtres ouvertes en même temps',
          'Désactivé : ouvrir une page remplace la fenêtre actuelle.') +
        '</fieldset>' +
        '<fieldset><legend>Mémorisation</legend>' +
        check('keepState', 'cp-keep', 'Mémoriser l\'état des fenêtres (position, plein écran)',
          'Les nouvelles pages s\'ouvrent au même endroit et dans le même état. Oublié à la fermeture de l\'onglet.') +
        '</fieldset>';
    } else if (view === 'sound') {
      var vtxt = !snd.card ? 'Aucun périphérique audio.' : (snd.muted ? 'Le son est sur muet.' : 'Volume actuel : ' + snd.vol + ' %.');
      body = '<h2 class="cp-h">Son et périphériques audio</h2>' +
        '<fieldset><legend>Périphérique audio</legend>' +
        '<div class="field-row"><input type="checkbox" id="cp-card"' + (snd.card ? ' checked' : '') + '><label for="cp-card">Carte audio activée</label></div>' +
        '<p class="cp-hint">Désactivée : plus aucun son, et l\'icône de volume reste sur muet. ' + vtxt + '</p>' +
        '</fieldset>' +
        '<fieldset><legend>Tester les sons</legend><div class="cp-snd-list">' +
        SOUND_LIST.map(function (it) {
          return '<div class="cp-snd-row"><span>' + it[1] + '</span><button type="button" data-snd-test="' + it[0] + '"' + (snd.card ? '' : ' disabled') + '>Écouter</button></div>';
        }).join('') +
        '</div><p class="cp-snd-msg"></p></fieldset>';
    } else {
      body = '<h2 class="cp-h">Choisissez une catégorie</h2><div class="cp-cats">' +
        cat('appearance', 'theme', 'Apparence et thèmes') +
        cat('windows', 'multitask', 'Fenêtres et multitâche') +
        cat('sound', 'sound', 'Son et périphériques audio') + '</div>';
    }
    if (view !== 'home') {
      body += '<p class="cp-actions"><button type="button" data-cp-view="home">&lt; Retour</button> ' +
        '<button type="button" data-cp-reset>Valeurs par défaut</button></p>';
    }
    w.body.innerHTML =
      '<div class="cp"><aside class="cp-side">' +
      '<div class="cp-box"><div class="cp-box-title">Voir aussi</div>' +
      '<a href="#" data-cp-view="home">Accueil du panneau de configuration</a></div>' +
      '<div class="cp-box"><div class="cp-box-title">Aide</div>' +
      '<span>Les réglages sont enregistrés dans ce navigateur.</span></div>' +
      '</aside><section class="cp-main">' + body + '</section></div>';
  }

  /* ===================== Informations système ===================== */
  function renderSysinfo(w) {
    w.view = 'home';
    var ico = iconUrl(w);
    w.body.innerHTML =
      '<div class="si">' +
        '<div class="si-head">' +
          '<span class="si-logo" style="background-image: url(\'' + ico + '\');"></span>' +
          '<div class="si-head-text"><strong>Informations système</strong><span>Doc Projet &mdash; mode Windows XP</span></div>' +
        '</div>' +
        '<div class="si-body">' +
          '<p class="si-credit">Application développée par <strong>' + AUTHOR + '</strong></p>' +
          '<p class="si-hint">Simulation de l\'environnement Windows XP pour la documentation du projet.</p>' +
          '<fieldset><legend>Diagnostic</legend>' +
            '<p>Lancer un test de l\'écran d\'erreur système.</p>' +
            '<button type="button" data-xp-bsod-test>Test</button>' +
          '</fieldset>' +
        '</div>' +
      '</div>';
  }

  /* ===================== Recherche (utilise l'index de Just the Docs) ===================== */
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function icoPng(name) {
    return assetIco(name);
  }

  function loadSearchData() {
    if (searchData) return Promise.resolve(searchData);
    if (!searchLoading) {
      searchLoading = fetch(SEARCH_URL, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (json) {
        var base = '';
        try { base = new URL(SEARCH_URL, location.href).pathname.replace(/\/assets\/js\/search-data\.json$/, ''); } catch (e) {}
        searchData = Object.keys(json).map(function (k) {
          var d = json[k];
          var rel = d.relUrl || '';
          if (!rel && d.url) {
            try { var u = new URL(d.url, location.href); rel = u.pathname + u.hash; } catch (e) {}
          }
          if (base && rel.charAt(0) === '/' && rel !== base && rel.indexOf(base + '/') !== 0) rel = base + rel;
          var doc = d.doc || '', title = d.title || '', content = d.content || '';
          return {
            doc: doc, title: title, content: content, url: rel,
            nDoc: norm(doc), nTitle: norm(title), nContent: norm(content)
          };
        });
        return searchData;
      }).catch(function (err) { searchLoading = null; throw err; });
    }
    return searchLoading;
  }

  function queryTerms(q) {
    return norm(q).split(/[^a-z0-9]+/).filter(Boolean);
  }

  function runSearch(q) {
    var terms = queryTerms(q);
    if (!terms.length) return { terms: terms, hits: [] };
    var hits = [];
    searchData.forEach(function (d) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i], s = 0;
        if (d.nTitle.indexOf(t) !== -1) s += 10;
        if (d.nDoc.indexOf(t) !== -1) s += 5;
        var from = 0, n = 0, p;
        while (n < 10 && (p = d.nContent.indexOf(t, from)) !== -1) { n++; from = p + t.length; }
        s += n;
        if (!s) return;          // tous les mots doivent être présents
        score += s;
      }
      hits.push({ d: d, score: score });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    return { terms: terms, hits: hits.slice(0, 60) };
  }

  function highlight(text, terms) {
    var n = norm(text), flags = new Array(text.length + 1).join('0').split('');
    terms.forEach(function (t) {
      var from = 0, p;
      while ((p = n.indexOf(t, from)) !== -1) {
        for (var i = p; i < p + t.length && i < flags.length; i++) flags[i] = '1';
        from = p + t.length;
      }
    });
    var out = '', open = false;
    for (var i = 0; i < text.length; i++) {
      var on = flags[i] === '1';
      if (on && !open) { out += '<mark>'; open = true; }
      if (!on && open) { out += '</mark>'; open = false; }
      out += esc(text.charAt(i));
    }
    if (open) out += '</mark>';
    return out;
  }

  function snippet(d, terms) {
    var pos = -1;
    terms.forEach(function (t) {
      var i = d.nContent.indexOf(t);
      if (i !== -1 && (pos === -1 || i < pos)) pos = i;
    });
    var start = pos === -1 ? 0 : Math.max(0, pos - 45);
    var txt = d.content.substr(start, 150);
    return (start > 0 ? '… ' : '') + highlight(txt, terms) + (start + 150 < d.content.length ? ' …' : '');
  }

  function folderOf(url) {
    var p = String(url || '').split('#')[0].replace(/index\.html$/, '');
    return p || '/';
  }

  function renderSearch(w, view) {
    var q = (view && view !== 'home') ? view : '';
    w.view = q || 'home';
    w.body.innerHTML =
      '<div class="sr">' +
        '<div class="sr-menu"><span>Fichier</span><span>Édition</span><span>Affichage</span><span>Favoris</span><span>Outils</span><span>?</span></div>' +
        '<div class="sr-tool">' +
          '<span class="sr-tb dis"><b class="sr-arrow">&#9664;</b> Précédent</span>' +
          '<span class="sr-tb dis"><b class="sr-arrow">&#9654;</b></span>' +
          '<span class="sr-tb on"><span class="sr-ico" style="background-image:url(\'' + icoPng('search') + '\')"></span> Rechercher</span>' +
          '<span class="sr-tb"><span class="sr-ico" style="background-image:url(\'' + icoPng('folder') + '\')"></span> Dossiers</span>' +
        '</div>' +
        '<div class="sr-addr"><span>Adresse</span>' +
          '<div class="sr-addr-box"><span class="sr-ico" style="background-image:url(\'' + icoPng('search') + '\')"></span><span>Résultats de la recherche</span></div>' +
          '<span class="sr-gobtn"><b class="sr-arrow green">&#9654;</b> OK</span></div>' +
        '<div class="sr-cols">' +
          '<div class="sr-pane">' +
            '<div class="sr-pane-title">Assistant de recherche</div>' +
            '<div class="sr-bubble">' +
              '<p><strong>Que voulez-vous rechercher ?</strong></p>' +
              '<p class="sr-label">Tout ou partie du texte :</p>' +
              '<input type="text" class="sr-input" autocomplete="off" spellcheck="false" value="' + esc(q) + '">' +
              '<p><button type="button" data-sr-go>Rechercher</button></p>' +
              '<p class="sr-tip">Tapez un ou plusieurs mots : seules les pages contenant tous ces mots sont affichées.</p>' +
            '</div>' +
            '<span class="sr-dog" style="background-image:url(\'' + icoPng('search-dog') + '\')"></span>' +
          '</div>' +
          '<div class="sr-results">' +
            '<div class="sr-head"><span class="sr-h-name">Nom</span><span class="sr-h-folder">Dans le dossier</span></div>' +
            '<div class="sr-list"><p class="sr-msg">Pour lancer la recherche, suivez les instructions du volet gauche.</p></div>' +
            '<div class="sr-status">&nbsp;</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    if (q) doSearch(w);
    else { var inp = w.body.querySelector('.sr-input'); if (inp) setTimeout(function () { inp.focus(); }, 0); }
  }

  function doSearch(w) {
    var inp = w.body.querySelector('.sr-input');
    var list = w.body.querySelector('.sr-list');
    var status = w.body.querySelector('.sr-status');
    if (!inp || !list) return;
    var q = inp.value.trim();
    w.view = q || 'home';
    saveSession();
    if (!queryTerms(q).length) {
      list.innerHTML = '<p class="sr-msg">Entrez au moins un mot à rechercher.</p>';
      status.textContent = ' ';
      return;
    }
    list.innerHTML = '<p class="sr-msg">Recherche en cours...</p>';
    status.textContent = ' ';
    loadSearchData().then(function () {
      if (w.view !== q) return;     // une recherche plus récente a été lancée
      var r = runSearch(q);
      if (!r.hits.length) {
        list.innerHTML = '<p class="sr-msg">Aucun résultat pour « ' + esc(q) + ' ».</p>';
        status.textContent = '0 objet(s) trouvé(s)';
        return;
      }
      list.innerHTML = r.hits.map(function (h) {
        var d = h.d;
        var name = (d.title && d.title !== d.doc && d.doc) ? esc(d.doc) + ' &rsaquo; ' + esc(d.title) : esc(d.title || d.doc || d.url);
        return '<a class="sr-row" href="' + esc(d.url) + '">' +
          '<span class="sr-ico" style="background-image:url(\'' + icoPng('folder') + '\')"></span>' +
          '<span class="sr-name"><b>' + name + '</b><span class="sr-snip">' + snippet(d, r.terms) + '</span></span>' +
          '<span class="sr-folder">' + esc(folderOf(d.url)) + '</span></a>';
      }).join('');
      status.textContent = r.hits.length + ' objet(s) trouvé(s)';
    }).catch(function () {
      list.innerHTML = '<p class="sr-msg">Impossible de charger l\'index de recherche (' + esc(SEARCH_URL) + ').</p>';
    });
  }

  /* ===================== Sons Windows XP (désactivés par défaut) ===================== */
  // Fichiers attendus dans assets/sounds/winxp/ : startup, error, shutdown, ding (.mp3, .wav ou .ogg)
  var K_SND = 'xp_sound';
  var snd = (function () {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(K_SND)) || {}; } catch (e) {}
    return { vol: Math.max(0, Math.min(100, +s.vol || 0)), muted: !!s.muted, card: s.card !== false };
  })();
  var audioCtx = null, bufCache = {}, missingSnd = {}, exiting = false;

  function saveSnd() {
    try { localStorage.setItem(K_SND, JSON.stringify(snd)); } catch (e) {}
  }
  function soundLevel() { return (!snd.card || snd.muted) ? 0 : snd.vol / 100; }

  function getCtx() {
    if (!audioCtx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { audioCtx = new C(); } catch (e) { return null; }
    }
    return audioCtx;
  }
  function unlockAudio() {
    var c = getCtx();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
  }

  function loadSound(name) {
    if (missingSnd[name]) return Promise.reject(new Error('son absent'));
    if (bufCache[name]) return bufCache[name];
    var ctx = getCtx();
    if (!ctx) return Promise.reject(new Error('audio indisponible'));
    var exts = ['mp3', 'wav', 'ogg'];
    function next(i) {
      if (i >= exts.length) return Promise.reject(new Error('son absent'));
      return fetch(sitePath('/assets/sounds/winxp/' + name + '.' + exts[i]), { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      }).then(function (ab) {
        return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
      }).catch(function () { return next(i + 1); });
    }
    var p = next(0);
    bufCache[name] = p;
    p.catch(function () { delete bufCache[name]; missingSnd[name] = true; });
    return p;
  }
  function preloadSounds() {
    ['startup', 'error', 'shutdown', 'ding', 'tada', 'logon', 'logoff'].forEach(function (n) { loadSound(n).catch(function () {}); });
  }

  // Joue un son au volume réglé ; onEnd(true) à la fin du son, onEnd(false) s'il n'a pas pu être joué
  function playSound(name, onEnd) {
    var lvl = soundLevel();
    if (lvl <= 0) { if (onEnd) onEnd(false); return; }
    var ctx = getCtx();
    if (!ctx) { if (onEnd) onEnd(false); return; }
    unlockAudio();
    loadSound(name).then(function (buf) {
      var src = ctx.createBufferSource();
      var g = ctx.createGain();
      src.buffer = buf;
      g.gain.value = lvl;
      src.connect(g);
      g.connect(ctx.destination);
      src.onended = function () { if (onEnd) onEnd(true); };
      src.start(0);
    }).catch(function () { if (onEnd) onEnd(false); });
  }

  function updateVolumeUI() {
    var btn = document.getElementById('xp-tray-volume');
    var r = document.getElementById('xp-volume-range');
    var m = document.getElementById('xp-volume-mute');
    var off = !snd.card || snd.muted || snd.vol === 0;
    if (btn) {
      btn.classList.toggle('off', off);
      btn.classList.toggle('nocard', !snd.card);
      btn.title = !snd.card ? 'Aucun périphérique audio' : (snd.muted ? 'Volume : muet' : 'Volume : ' + snd.vol + ' %');
    }
    if (r) { if (+r.value !== snd.vol) r.value = snd.vol; r.disabled = !snd.card; }
    if (m) { m.checked = snd.muted; m.disabled = !snd.card; }
  }

  /* ===================== Session : déconnexion, changement d'utilisateur, connexion ===================== */

  var SOUND_LIST = [
    ['startup', 'Démarrage de Windows'], ['shutdown', 'Arrêt de Windows'],
    ['logon', 'Ouverture de session'], ['logoff', 'Fermeture de session'],
    ['error', 'Erreur critique'], ['ding', 'Ding'], ['tada', 'Tada'], ['balloon', 'Info-bulle'],
    ['hardware-insert', 'Connexion d\'un périphérique'], ['hardware-remove', 'Déconnexion d\'un périphérique'],
    ['hardware-fail', 'Échec d\'un périphérique']
  ];
  var BOOT_TEXT = 'Windows est en cours de démarrage...';
  var loginOn = false, loginMode = null, powerOffHtml = null;

  function openPowerDialog(mode) {
    var o = document.getElementById('xp-shutdown-overlay');
    if (!o) return;
    var actions = o.querySelector('.shutdown-actions');
    var title = o.querySelector('.shutdown-title-text');
    if (!actions || !title) return;
    if (powerOffHtml === null) powerOffHtml = actions.innerHTML;
    if (mode === 'logoff') {
      title.textContent = 'Se déconnecter de Windows';
      actions.innerHTML =
        '<button type="button" class="shutdown-btn" data-xp-switch-user>' +
          '<span class="shutdown-ico" style="background-image:url(\'' + assetIco('switch-user') + '\')"></span><span>Changer d\'utilisateur</span></button>' +
        '<button type="button" class="shutdown-btn" data-xp-logoff>' +
          '<span class="shutdown-ico" style="background-image:url(\'' + assetIco('logoff') + '\')"></span><span>Se déconnecter</span></button>';
    } else {
      title.textContent = 'Éteindre l\'ordinateur';
      actions.innerHTML = powerOffHtml;
    }
    o.classList.remove('xp-off');
    o.classList.add('active');
  }

  function setBootText(txt) {
    var el = document.querySelector('#xp-boot-screen .xp-boot-text');
    if (el) el.textContent = txt;
  }
  // Affiche l'écran de démarrage avec un texte ; before() est appelé juste avant de le retirer
  function showBoot(text, ms, before, after) {
    var boot = document.getElementById('xp-boot-screen');
    if (!boot) { if (before) before(); if (after) after(); return; }
    setBootText(text);
    boot.classList.add('active');
    setTimeout(function () {
      if (before) before();
      boot.classList.remove('active');
      setBootText(BOOT_TEXT);
      if (after) after();
    }, ms);
  }

  function hideLogin() {
    var l = document.getElementById('xp-login-screen');
    if (l) l.classList.remove('active');
    loginOn = false;
  }

  function showLogin(mode) {
    var l = document.getElementById('xp-login-screen');
    if (!l) return;
    loginOn = true;
    loginMode = mode;
    var st = l.querySelector('.lg-status');
    if (st) st.textContent = mode === 'switched' ? 'Utilisateur connecté' : '';
    var note = l.querySelector('.lg-c-note');
    if (note) note.textContent = mode === 'switched' ? 'Windows XP : utilisateur connecté' : '';
    var u = l.querySelector('.lg-c-user'), p = l.querySelector('.lg-c-pass');
    if (u) u.value = 'Windows XP';
    if (p) p.value = '';
    l.classList.add('active');
    if (p && document.documentElement.classList.contains('xp-classic')) setTimeout(function () { p.focus(); }, 0);
  }

  // Se déconnecter : son d'arrêt, écran "Déconnexion...", puis écran de connexion
  function logOff() {
    if (booting || loginOn) return;
    booting = true;
    closeShutdownDialog();
    var menu = document.getElementById('xp-start-menu'), sb = document.getElementById('xp-start-btn');
    if (menu) menu.classList.remove('open');
    if (sb) sb.classList.remove('active');
    playSound('shutdown');
    wins.slice().forEach(function (w) { closeWin(w); });
    showBoot('Déconnexion...', 2800, function () { showLogin('loggedoff'); }, function () { booting = false; });
  }

  // Changer d'utilisateur : la session reste ouverte derrière l'écran de connexion
  function switchUser() {
    if (booting || loginOn) return;
    closeShutdownDialog();
    playSound('logoff');
    showLogin('switched');
  }

  function loginAs(user) {
    if (!loginOn) return;
    if (user === 'normal') { exit(true); return; }            // retour immédiat au site de base
    if (loginMode === 'switched') {
      hideLogin();
      playSound('logon');
      return;
    }
    booting = true;
    playSound('startup');
    showBoot('Chargement de vos paramètres personnels...', 4200, hideLogin, function () { booting = false; });
  }

  function classicLogin() {
    var l = document.getElementById('xp-login-screen');
    var u = l ? l.querySelector('.lg-c-user') : null;
    var raw = (u ? u.value : '').toLowerCase().replace(/\s+/g, '');
    if (raw === 'windowsxp' || raw === 'xp') loginAs('xp');
    else if (raw === 'sitenormal' || raw === 'normal') loginAs('normal');
    else dialog({
      title: 'Ouverture de session Windows', icon: 'error',
      text: 'Le nom d\'utilisateur ou le mot de passe est incorrect. Veuillez réessayer.',
      buttons: [{ label: 'OK' }]
    });
  }

  // Panneau de configuration > Son : test d'un son
  function testSound(w, name) {
    var msg = w ? w.body.querySelector('.cp-snd-msg') : null;
    function say(t) { if (msg) msg.textContent = t; }
    if (!snd.card) { say('La carte audio est désactivée.'); return; }
    if (soundLevel() <= 0) { say('Aucun son : le volume est coupé. Montez-le avec l\'icône haut-parleur de la barre des tâches.'); return; }
    say('');
    playSound(name, function (ok) {
      if (!ok) say('Fichier son introuvable : assets/sounds/winxp/' + name + '.mp3 (ou .wav / .ogg)');
    });
  }

  /* ===================== Boîtes de dialogue, Exécuter, Bloc-notes ===================== */
  var K_FILES = 'xp_files';          // fichiers enregistrés sur le bureau (temporaires : sessionStorage)
  var BUSH_GLITCH = '畂桳栠摩琠敨映捡獴';   // ce que Bloc-notes affichait pour "Bush hid the facts"

  function loadFiles() {
    try { return JSON.parse(sessionStorage.getItem(K_FILES)) || []; } catch (e) { return []; }
  }
  function storeFiles(a) {
    try { sessionStorage.setItem(K_FILES, JSON.stringify(a)); } catch (e) {}
    renderDesktopSecret();
  }
  function findFile(id) {
    return loadFiles().filter(function (f) { return f.id === id; })[0] || null;
  }
  // Easter egg : "Bush hid the facts" enregistré puis rouvert s'affiche en caractères chinois
  function fileDisplayText(f) {
    return /^Bush hid the facts[\r\n]*$/.test(f.text) ? BUSH_GLITCH : f.text;
  }
  function normFileName(raw) {
    var n = String(raw || '').replace(/[\\\/:*?"<>|]/g, '').trim();
    if (!n) return '';
    if (!/\.[^.\s]+$/.test(n)) n += '.txt';
    return n;
  }

  /* Boîte de dialogue modale style XP : {title, text, icon, input:{label,value}, list:[{value,label}], buttons:[{label,action}]} */
  function dialog(o) {
    var wrap = document.createElement('div');
    wrap.className = 'xp-modal';
    var win = document.createElement('div');
    win.className = 'window xp-dialog';
    win.tabIndex = -1;
    win.innerHTML =
      '<div class="title-bar"><div class="title-bar-text"></div><div class="title-bar-controls">' +
      '<button type="button" aria-label="Close" data-dlg-x></button></div></div>' +
      '<div class="window-body"><div class="dlg-row"></div><div class="dlg-extra"></div><div class="dlg-btns"></div></div>';
    win.querySelector('.title-bar-text').textContent = o.title || '';
    var row = win.querySelector('.dlg-row');
    if (o.icon) {
      var ic = document.createElement('span');
      ic.className = 'dlg-icon dlg-' + o.icon;
      row.appendChild(ic);
    }
    var tx = document.createElement('div');
    tx.className = 'dlg-text';
    tx.textContent = o.text || '';
    row.appendChild(tx);

    var extra = win.querySelector('.dlg-extra'), input = null, list = null;
    if (o.input) {
      var lb = document.createElement('label');
      lb.textContent = o.input.label || '';
      input = document.createElement('input');
      input.type = 'text';
      input.value = o.input.value || '';
      extra.appendChild(lb);
      extra.appendChild(input);
    } else if (o.list) {
      list = document.createElement('select');
      list.size = 6;
      list.className = 'dlg-list';
      o.list.forEach(function (it, i) {
        var op = document.createElement('option');
        op.value = it.value;
        op.textContent = it.label;
        if (i === 0) op.selected = true;
        list.appendChild(op);
      });
      extra.appendChild(list);
    } else {
      extra.remove();
    }

    function close() { wrap.remove(); }
    function cancel() { close(); if (o.onCancel) o.onCancel(); }
    var btns = win.querySelector('.dlg-btns'), first = null;
    (o.buttons || []).forEach(function (b, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.textContent = b.label;
      if (i === 0) { el.className = 'dlg-default'; first = el; }
      el.addEventListener('click', function () {
        var v = input ? input.value : (list ? list.value : null);
        close();
        if (b.action) b.action(v);
      });
      btns.appendChild(el);
    });
    win.querySelector('[data-dlg-x]').addEventListener('click', cancel);
    win.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && first) { e.preventDefault(); first.click(); }
    });
    wrap.appendChild(win);
    env.appendChild(wrap);
    if (o.icon === 'info') playSound('ding');
    else if (o.icon === 'error' || o.icon === 'question') playSound('error');   // pas de son pour "Enregistrer sous" / "Ouvrir"
    setTimeout(function () {
      var f = input || list || first || win;
      f.focus();
      if (input) input.select();
    }, 0);
  }

  /* ----- Exécuter ----- */
  function renderRun(w) {
    w.view = 'home';
    w.body.innerHTML =
      '<div class="rn">' +
        '<div class="rn-top"><span class="rn-ico" style="background-image:url(\'' + assetIco('run') + '\')"></span>' +
        '<p>Entrez le nom d\'un programme, dossier, document ou d\'une ressource Internet, et Windows l\'ouvrira pour vous.</p></div>' +
        '<div class="rn-row"><label>Ouvrir :</label>' +
          '<div class="rn-combo"><input type="text" class="rn-input" autocomplete="off" spellcheck="false"><span class="rn-arrow">&#9660;</span></div></div>' +
        '<div class="rn-btns"><button type="button" data-rn-ok>OK</button><button type="button" data-rn-cancel>Annuler</button>' +
        '<button type="button" data-rn-browse>Parcourir...</button></div>' +
      '</div>';
    var inp = w.body.querySelector('.rn-input');
    if (inp) setTimeout(function () { inp.focus(); }, 0);
  }

  function runCommand(w) {
    var inp = w.body.querySelector('.rn-input');
    var raw = inp ? inp.value.trim() : '';
    if (!raw) return;
    var cmd = raw.replace(/^["']|["']$/g, '').toLowerCase().replace(/\.exe$/, '');
    var map = {
      notepad: function () { createNotepad(); },
      control: function () { openApp('cpanel'); },
      msinfo32: function () { openApp('sysinfo'); }
    };
    if (!Object.prototype.hasOwnProperty.call(map, cmd)) {
      dialog({
        title: raw, icon: 'error',
        text: 'Windows ne trouve pas « ' + raw + ' ». Vérifiez que vous avez correctement tapé le nom, puis essayez à nouveau.',
        buttons: [{ label: 'OK' }]
      });
      return;
    }
    closeWin(w);
    map[cmd]();
  }

  /* ----- Bloc-notes ----- */
  function npItems(list) {
    return list.map(function (i) {
      return i ? '<div class="np-it" data-np-cmd="' + i[0] + '"><span>' + i[1] + '</span><em>' + (i[2] || '') + '</em></div>'
               : '<div class="np-sep"></div>';
    }).join('');
  }

  function createNotepad() {
    var n = wins.filter(function (x) { return x.type === 'notepad'; }).length;
    var off = (n % 6) * 26;
    var w = createWindow({
      type: 'notepad', title: 'Sans titre - Bloc-notes',
      st: { left: Math.max(10, Math.round(window.innerWidth / 2 - 320) + off), top: 60 + off }
    });
    w.fileId = null; w.fileName = ''; w.dirty = false; w.fs = 13; w.npLines = -1;
    renderNotepad(w);
    focusWin(w);
    return w;
  }

  function renderNotepad(w) {
    w.view = 'home';
    var tb = function (cmd, glyph, title) {
      return '<span class="np-btn" data-np-cmd="' + cmd + '" title="' + title + '">' + glyph + '</span>';
    };
    var sep = '<span class="np-tsep"></span>';
    w.body.innerHTML =
      '<div class="np">' +
        '<div class="np-menubar">' +
          '<span class="np-m" data-np-menu>Fichier<div class="np-dd">' + npItems([
            ['new', 'Nouveau'], ['open', 'Ouvrir...'], ['save', 'Enregistrer', 'Ctrl+S'], ['saveas', 'Enregistrer sous...'], null, ['quit', 'Quitter']
          ]) + '</div></span>' +
          '<span class="np-m" data-np-menu>Édition<div class="np-dd">' + npItems([
            ['undo', 'Annuler', 'Ctrl+Z'], ['redo', 'Rétablir', 'Ctrl+Y'], null,
            ['cut', 'Couper', 'Ctrl+X'], ['copy', 'Copier', 'Ctrl+C'], ['paste', 'Coller', 'Ctrl+V'], null,
            ['selectall', 'Tout sélectionner', 'Ctrl+A']
          ]) + '</div></span>' +
          '<span class="np-m" data-np-menu>Affichage<div class="np-dd">' + npItems([
            ['zoomin', 'Zoom avant'], ['zoomout', 'Zoom arrière']
          ]) + '</div></span>' +
          '<span class="np-m">Paramètres</span>' +
          '<span class="np-m" data-np-menu>?<div class="np-dd">' + npItems([['about', 'À propos de Bloc-notes']]) + '</div></span>' +
        '</div>' +
        '<div class="np-toolbar">' +
          tb('new', '&#128196;', 'Nouveau') + tb('open', '&#128194;', 'Ouvrir') + tb('save', '&#128190;', 'Enregistrer') + sep +
          tb('undo', '&#8630;', 'Annuler') + tb('redo', '&#8631;', 'Rétablir') + sep +
          tb('cut', '&#9986;', 'Couper') + tb('copy', '&#10697;', 'Copier') + tb('paste', '&#128203;', 'Coller') + sep +
          tb('zoomin', '&#65291;', 'Zoom avant') + tb('zoomout', '&#65293;', 'Zoom arrière') +
        '</div>' +
        '<div class="np-edit"><div class="np-gutter"><div class="np-gutter-in"></div></div>' +
          '<textarea class="np-text" wrap="off" spellcheck="false" autocomplete="off"></textarea></div>' +
        '<div class="np-status"><span class="np-st-pos"></span><span class="np-st-size"></span>' +
          '<span>ANSI</span><span>CR+LF</span><span>INS</span><span>Texte par défaut</span></div>' +
      '</div>';
    npZoom(w, 0);
    npUpdate(w);
    var ta = w.body.querySelector('.np-text');
    if (ta) setTimeout(function () { ta.focus(); }, 0);
  }

  function npZoom(w, d) {
    w.fs = Math.max(8, Math.min(32, (w.fs || 13) + d));
    var np = w.body.querySelector('.np');
    if (np) {
      np.style.setProperty('--np-fs', w.fs + 'px');
      np.style.setProperty('--np-lh', Math.round(w.fs * 1.3) + 'px');
    }
  }

  function npUpdate(w) {
    var ta = w.body.querySelector('.np-text');
    if (!ta) return;
    var v = ta.value, pos = ta.selectionStart || 0;
    var before = v.slice(0, pos).split('\n');
    var lines = v.split('\n').length;
    var g = w.body.querySelector('.np-gutter-in');
    if (g && w.npLines !== lines) {
      var h = '';
      for (var i = 1; i <= lines; i++) h += i + '<br>';
      g.innerHTML = h;
      w.npLines = lines;
    }
    var gut = w.body.querySelector('.np-gutter');
    if (gut) gut.scrollTop = ta.scrollTop;
    var sel = Math.abs((ta.selectionEnd || 0) - (ta.selectionStart || 0));
    w.body.querySelector('.np-st-pos').textContent =
      'Ln ' + before.length + ' : ' + lines + '   Col ' + (before[before.length - 1].length + 1) + '   Sel ' + sel;
    var bytes = v.length;
    try { bytes = new Blob([v]).size; } catch (e) {}
    w.body.querySelector('.np-st-size').textContent = bytes + ' Octets';
  }

  function npLoad(w, file, text) {
    var ta = w.body.querySelector('.np-text');
    if (!ta) return;
    ta.value = text || '';
    w.fileId = file ? file.id : null;
    w.fileName = file ? file.name : '';
    w.dirty = false;
    w.npLines = -1;
    setTitle(w, (w.fileName || 'Sans titre') + ' - Bloc-notes');
    ta.scrollTop = 0;
    npUpdate(w);
    ta.focus();
  }

  function npSave(w, saveAs, done) {
    var ta = w.body.querySelector('.np-text');
    if (!ta) return;
    var text = ta.value;
    function commit(name) {
      var files = loadFiles(), f = null;
      if (w.fileId && !saveAs) f = files.filter(function (x) { return x.id === w.fileId; })[0] || null;
      if (!f) f = files.filter(function (x) { return x.name === name; })[0] || null;
      if (!f) {
        f = { id: 'f' + Date.now().toString(36) + Math.floor(Math.random() * 10000), name: name, text: '' };
        files.push(f);
      }
      f.name = name;
      f.text = text;
      storeFiles(files);
      w.fileId = f.id;
      w.fileName = name;
      w.dirty = false;
      setTitle(w, name + ' - Bloc-notes');
      if (done) done();
    }
    if (w.fileId && !saveAs && findFile(w.fileId)) { commit(w.fileName); return; }
    dialog({
      title: 'Enregistrer sous', text: 'Enregistrer dans : Bureau',
      input: { label: 'Nom du fichier :', value: w.fileName || 'Sans titre' },
      buttons: [
        { label: 'Enregistrer', action: function (v) { var n = normFileName(v); if (n) commit(n); } },
        { label: 'Annuler' }
      ]
    });
  }

  function npGuard(w, proceed) {
    if (!w.dirty) { proceed(); return; }
    dialog({
      title: 'Bloc-notes', icon: 'question',
      text: 'Le texte du fichier ' + (w.fileName || 'Sans titre') + ' a changé.\n\nVoulez-vous enregistrer les modifications ?',
      buttons: [
        { label: 'Oui', action: function () { npSave(w, false, proceed); } },
        { label: 'Non', action: proceed },
        { label: 'Annuler' }
      ]
    });
  }

  function npRequestClose(w) {
    npGuard(w, function () { closeWin(w); });
  }

  function npCmd(w, cmd) {
    var ta = w.body.querySelector('.np-text');
    if (!ta) return;
    switch (cmd) {
      case 'new': npGuard(w, function () { npLoad(w, null, ''); }); break;
      case 'open':
        npGuard(w, function () {
          var files = loadFiles();
          if (!files.length) {
            dialog({ title: 'Ouvrir', icon: 'info', text: 'Aucun fichier sur le Bureau.', buttons: [{ label: 'OK' }] });
            return;
          }
          dialog({
            title: 'Ouvrir', text: 'Fichiers du Bureau :',
            list: files.map(function (f) { return { value: f.id, label: f.name }; }),
            buttons: [
              { label: 'Ouvrir', action: function (id) { var f = findFile(id); if (f) npLoad(w, f, fileDisplayText(f)); } },
              { label: 'Annuler' }
            ]
          });
        });
        break;
      case 'save': npSave(w, false); break;
      case 'saveas': npSave(w, true); break;
      case 'quit': npRequestClose(w); break;
      case 'undo': ta.focus(); document.execCommand('undo'); break;
      case 'redo': ta.focus(); document.execCommand('redo'); break;
      case 'cut': ta.focus(); document.execCommand('cut'); break;
      case 'copy': ta.focus(); document.execCommand('copy'); break;
      case 'paste':
        ta.focus();
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (t) {
            ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end');
            w.dirty = true;
            npUpdate(w);
          }).catch(function () { document.execCommand('paste'); });
        } else { document.execCommand('paste'); }
        break;
      case 'selectall': ta.focus(); ta.select(); break;
      case 'zoomin': npZoom(w, 1); break;
      case 'zoomout': npZoom(w, -1); break;
      case 'about':
        dialog({ title: 'À propos de Bloc-notes', icon: 'info',
          text: 'Bloc-notes simulé pour la documentation du projet.\nApplication développée par ' + AUTHOR + '.',
          buttons: [{ label: 'OK' }] });
        break;
    }
    npUpdate(w);
  }

  function openFile(id) {
    var f = findFile(id);
    if (!f) return;
    var ex = wins.filter(function (x) { return x.type === 'notepad' && x.fileId === id; })[0];
    if (ex) { focusWin(ex); return; }
    var w = createNotepad();
    npLoad(w, f, fileDisplayText(f));
  }

  function npEvent(e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('np-text')) return;
    var w = winOf(t);
    if (!w) return;
    if (e.type === 'input') w.dirty = true;
    npUpdate(w);
  }

  /* ===================== Corbeille ===================== */
  var RB_DATE = (function () {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  })();

  function secretRestored() {
    try { return localStorage.getItem(K_SECRET) === 'true'; } catch (e) { return false; }
  }
  function secretInBin() { return !secretRestored() && !secretGone; }

  function renderDesktopSecret() {
    // (re)construit les icônes ajoutées sous "Ce PC" : le fichier secret restauré, puis les fichiers enregistrés
    var box = document.getElementById('xp-desktop-icons');
    if (!box) return;
    box.querySelectorAll('[data-xp-secret],[data-xp-file]').forEach(function (n) { n.remove(); });
    function add(attr, val, name) {
      var ic = document.createElement('div');
      ic.className = 'xp-icon';
      ic.setAttribute(attr, val);
      ic.title = name;
      ic.innerHTML = '<span class="xp-icon-img" style="background-image:url(\'' + assetIco('secret') + '\')"></span>' +
        '<span class="xp-icon-label"></span>';
      ic.querySelector('.xp-icon-label').textContent = name;
      box.appendChild(ic);
    }
    if (secretRestored()) add('data-xp-secret', '', 'secret');
    loadFiles().forEach(function (f) { add('data-xp-file', f.id, f.name); });
  }

  function renderAllRecycle() {
    wins.forEach(function (w) { if (w.type === 'recycle') renderRecycle(w); });
  }
  function setSecret(restored) {
    try { localStorage.setItem(K_SECRET, restored ? 'true' : 'false'); } catch (e) {}
    secretGone = false;
    renderDesktopSecret();
    renderAllRecycle();
  }
  function emptyBin(w) {
    if (!secretInBin()) return;
    dialog({
      title: 'Confirmer la suppression de fichier', icon: 'question',
      text: 'Voulez-vous vraiment supprimer définitivement « secret » ?',
      buttons: [
        { label: 'Oui', action: function () { secretGone = true; if (w) w.rbSel = false; renderAllRecycle(); } },
        { label: 'Non' }
      ]
    });
  }
  function openSecret() {
    if (!SECRET_URL) {
      dialog({ title: 'secret', icon: 'error', text: 'Impossible d\'ouvrir ce fichier : aucun lien n\'est associé.', buttons: [{ label: 'OK' }] });
      return;
    }
    location.href = SECRET_URL;
  }

  function renderRecycle(w) {
    w.view = 'home';
    var has = secretInBin();
    var sel = has && !!w.rbSel;
    var tasks;
    if (!has) tasks = '<span class="rb-dis">Vider la corbeille</span>';
    else tasks = '<a href="#" data-rb-empty>Vider la corbeille</a>' +
      (sel ? '<a href="#" data-rb-restore>Restaurer cet élément</a>'
           : '<a href="#" data-rb-restore-all>Restaurer tous les éléments</a>');
    var details = sel
      ? '<strong>secret</strong><span>Fichier</span><span>Date de modification : ' + RB_DATE + '</span><span>Taille : 1 Ko</span>'
      : '<strong>Corbeille</strong><span>Dossier système</span>';
    var row = has
      ? '<tr class="rb-row' + (sel ? ' sel' : '') + '" data-rb-row>' +
        '<td><span class="rb-ico" style="background-image:url(\'' + assetIco('secret') + '\')"></span>secret</td>' +
        '<td>C:\\Documents and Settings\\Doc Projet\\Bureau</td><td>' + RB_DATE + '</td><td>1 Ko</td><td>Fichier</td><td>' + RB_DATE + '</td></tr>'
      : '';
    w.body.innerHTML =
      '<div class="rb">' +
        '<div class="sr-menu"><span>Fichier</span><span>Édition</span><span>Affichage</span><span>Favoris</span><span>Outils</span><span>?</span></div>' +
        '<div class="sr-tool">' +
          '<span class="sr-tb dis"><b class="sr-arrow">&#9664;</b> Précédent</span>' +
          '<span class="sr-tb dis"><b class="sr-arrow">&#9654;</b></span>' +
          '<span class="sr-tb dis"><b class="sr-arrow">&#9650;</b></span>' +
          '<span class="sr-tb"><span class="sr-ico" style="background-image:url(\'' + assetIco('search') + '\')"></span> Rechercher</span>' +
          '<span class="sr-tb"><span class="sr-ico" style="background-image:url(\'' + assetIco('folder') + '\')"></span> Dossiers</span>' +
        '</div>' +
        '<div class="sr-addr"><span>Adresse</span>' +
          '<div class="sr-addr-box"><span class="sr-ico" style="background-image:url(\'' + assetIco('recycle') + '\')"></span><span>Corbeille</span></div>' +
          '<span class="sr-gobtn"><b class="sr-arrow green">&#9654;</b> OK</span></div>' +
        '<div class="sr-cols">' +
          '<div class="rb-side">' +
            '<div class="cp-box"><div class="cp-box-title">Tâches corbeille</div><div class="rb-tasks">' + tasks + '</div></div>' +
            '<div class="cp-box"><div class="cp-box-title">Autres emplacements</div><div class="rb-tasks">' +
              '<span>Bureau</span><span>Mes documents</span><span>Poste de travail</span></div></div>' +
            '<div class="cp-box"><div class="cp-box-title">Détails</div><div class="rb-details">' + details + '</div></div>' +
          '</div>' +
          '<div class="rb-list">' +
            '<table class="rb-table"><thead><tr><th>Nom</th><th>Emplacement d\'origine</th><th>Date de suppression</th><th>Taille</th><th>Type</th><th>Date de modification</th></tr></thead>' +
            '<tbody>' + row + '</tbody></table>' +
          '</div>' +
        '</div>' +
        '<div class="sr-status">' + (has ? '1 objet(s)\u00a0\u00a0\u00a0\u00a01 Ko' : '0 objet(s)') + '</div>' +
      '</div>';
  }

  /* ===================== Applications du menu Démarrer ===================== */
  var APPS = {
    cpanel: { title: 'Panneau de configuration', render: renderCpanel },
    sysinfo: { title: 'Informations système', render: renderSysinfo },
    search: { title: 'Résultats de la recherche', render: renderSearch },
    recycle: { title: 'Corbeille', render: renderRecycle },
    run: { title: 'Exécuter', render: renderRun }
  };

  function openApp(name, st, view, quiet) {
    var app = APPS[name];
    if (!app) return null;
    var ex = wins.filter(function (w) { return w.type === name; })[0];
    if (ex) { if (!quiet) focusWin(ex); return ex; }
    var w = createWindow({ type: name, title: app.title, st: st });
    app.render(w, view || 'home');
    if (!quiet) focusWin(w);
    return w;
  }

  function progItem(path, ico, title, sub) {
    return '<li><a href="' + sitePath(path) + '"><span class="xp-start-ico" style="background-image: url(\'' + assetIco(ico) +
      '\');"></span><div class="xp-start-text"><strong>' + title + '</strong><span>' + sub + '</span></div></a></li>';
  }

  function toggleProgramsView() {
    showPrograms = !showPrograms;
    var listEl = document.getElementById('xp-left-menu-list');
    var btnText = document.getElementById('xp-programs-btn-text');
    var arrow = document.getElementById('xp-programs-arrow');
    if (!listEl) return;

    if (showPrograms) {
      if (!mainProgramsHtml) mainProgramsHtml = listEl.innerHTML;
      if (btnText) btnText.textContent = 'Retour';
      if (arrow) arrow.classList.add('back');
      listEl.innerHTML = [
        progItem('/', 'computer', 'Accueil', 'Principal'),
        progItem('/objectifs.html', 'folder', 'Objectifs', 'Buts du projet'),
        progItem('/equipe.html', 'folder', 'Équipe', 'Membres'),
        progItem('/etudes.html', 'folder', 'Études', 'Recherches'),
        progItem('/conception/', 'folder', 'Conception', 'CAO & Code'),
        progItem('/fabrication/', 'folder', 'Fabrication', 'Assemblage'),
        progItem('/tests.html', 'tests', 'Tests', 'Résultats'),
        progItem('/journal/', 'journal', 'Journal', 'Suivi')
      ].join('');
    } else {
      if (btnText) btnText.textContent = 'Tous les programmes';
      if (arrow) arrow.classList.remove('back');
      if (mainProgramsHtml) listEl.innerHTML = mainProgramsHtml;
    }
  }

  function initClock() {
    var clockEl = document.getElementById('xp-tray-clock');
    if (!clockEl) return;

    function update() {
      var now = new Date();
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var timeStr = (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
      clockEl.textContent = timeStr;

      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      clockEl.title = now.toLocaleDateString('fr-FR', options);
    }

    update();
    setInterval(update, 10000);
  }

  /* ===================== Veille, écran bleu et redémarrage ===================== */
  function closeShutdownDialog() {
    var o = document.getElementById('xp-shutdown-overlay');
    if (o) o.classList.remove('active');
  }

  // Mise en veille simulée : écran noir, un clic (ou une touche) le rallume
  function standby() {
    var s = document.getElementById('xp-standby-screen');
    if (!s) return;
    closeShutdownDialog();
    s.classList.add('active');
    standbyOn = true;
  }
  function wakeUp() {
    var s = document.getElementById('xp-standby-screen');
    if (s) s.classList.remove('active');
    standbyOn = false;
  }

  // Écran bleu en plein écran : un clic (ou une touche) lance le redémarrage
  function showBsod() {
    var b = document.getElementById('xp-bsod-screen');
    if (!b || booting) return;
    closeShutdownDialog();
    b.classList.add('active');
    bsodOn = true;
    playSound('error');
  }
  function hideBsod() {
    var b = document.getElementById('xp-bsod-screen');
    if (b) b.classList.remove('active');
    bsodOn = false;
  }

  // Redémarrage simulé : écran noir, puis écran de démarrage XP, puis bureau vide
  function restart() {
    if (booting) return;
    var boot = document.getElementById('xp-boot-screen');
    var black = document.getElementById('xp-black-screen');
    if (!boot || !black) return;
    booting = true;
    secretGone = false;
    renderAllRecycle();
    hideBsod();
    closeShutdownDialog();

    var menu = document.getElementById('xp-start-menu');
    var startBtn = document.getElementById('xp-start-btn');
    if (menu) menu.classList.remove('open');
    if (startBtn) startBtn.classList.remove('active');
    if (showPrograms) toggleProgramsView();

    black.classList.add('active');                          // 1) écran noir
    wins.slice().forEach(function (w) { closeWin(w); });    // comme un vrai redémarrage : plus aucune fenêtre

    setTimeout(function () {
      boot.classList.add('active');
      playSound('startup');                         // 2) écran de démarrage (fondu depuis le noir)
      setTimeout(function () { black.classList.remove('active'); }, 600);
      setTimeout(function () {                              // 3) bureau
        boot.classList.remove('active');
        booting = false;
      }, 4500);
    }, 1800);
  }

  function enter() {
    if (env) return;
    var mainEl = document.querySelector(SELECTOR);
    var tpl = document.getElementById('xp-template');
    if (!mainEl || !tpl) {
      document.documentElement.classList.remove('xp-on');
      try { localStorage.setItem(K_ON, 'false'); } catch (e) {}
      return;
    }
    document.body.appendChild(tpl);

    applyTheme();
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = CUSTOM_CSS;
    css.className = 'xp-css';
    css.id = 'xp-custom-sheet';
    document.head.appendChild(css);

    env = tpl.content.firstElementChild.cloneNode(true);
    document.body.appendChild(env);

    initClock();

    winsEl = env.querySelector('#xp-windows');
    tabsEl = env.querySelector('#xp-task-tabs');
    renderDesktopSecret();
    updateVolumeUI();
    if (soundLevel() > 0) preloadSounds();
    document.documentElement.classList.add('xp-on');
    document.body.classList.add('mode-xp-active');
    try { localStorage.setItem(K_ON, 'true'); } catch (e) {}

    var sess = cfg.keepState ? loadSession() : null;
    var saved = (sess && sess.windows) || [];
    var curUrl = clean(location.href);
    var mine = null, base = null;
    saved.forEach(function (s) {
      if (s.type !== 'page') return;
      if (s.url === curUrl) mine = s;
      if (sess.active === s.url) base = s;
    });
    base = base || mine;
    if (base) lastGeo = { left: base.st.left, top: base.st.top, max: base.st.max };
    var st = mine ? mine.st
      : (base ? { left: base.st.left, top: base.st.top, max: base.st.max, min: false } : {});

    restoring = true;
    var first = addPage(curUrl, pageTitle(document), mainEl, st);
    if (mine && mine.hist && mine.hist[mine.hi] === curUrl) { first.hist = mine.hist; first.hi = mine.hi; updateNav(first); }
    focusWin(first);

    var chain = Promise.resolve();
    saved.forEach(function (s) {
      if (s === mine) return;
      if (s.type !== 'page' && APPS[s.type]) {
        chain = chain.then(function () { openApp(s.type, s.st, s.view, true); });
      } else if (s.type === 'page' && cfg.multitask && s.url !== curUrl) {
        chain = chain.then(function () {
          return fetchPage(s.url).then(function (r) {
            var pw = addPage(s.url, r.title, r.main, s.st);
            if (s.hist && s.hist[s.hi] === s.url) { pw.hist = s.hist; pw.hi = s.hi; updateNav(pw); }
          }).catch(function () {});
        });
      }
    });
    chain.then(function () {
      var target = null;
      if (sess && sess.active) wins.forEach(function (w) { if (winKey(w) === sess.active) target = w; });
      restoring = false;
      if (target && !target.st.min) focusWin(target); else saveSession();
    });
  }

  function exit(now) {
    if (exiting) return;
    var go = function () {
      try {
        localStorage.setItem(K_ON, 'false');
        sessionStorage.removeItem(K_SES);
      } catch (e) {}
      location.reload();
    };
    if (!now && soundLevel() > 0) {
      exiting = true;
      var ov = document.getElementById('xp-shutdown-overlay');
      if (ov) ov.classList.add('xp-off');          // la boîte disparaît, l'écran reste en noir et blanc
      var fin = function () { if (go) { var g = go; go = null; g(); } };
      playSound('shutdown', fin);                  // se termine tout de suite si le son est absent
      setTimeout(fin, 4000);
    } else {
      go();
    }
  }

  function handleLink(e, a, w) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var raw = a.getAttribute('href') || '';
    if (raw.charAt(0) === '#') {
      e.preventDefault();
      scrollToHash(w, raw);
      return;
    }
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    if (/\.(pdf|zip|stl|step|stp|dxf|png|jpe?g|gif|svg|webm|csv|txt)$/i.test(u.pathname)) return;
    e.preventDefault();
    openPage(u.href, u.hash);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-xp-enter]')) { enter(); return; }
    if (!env) return;

    // Un glisser-déposer d'icône vient de se terminer : ce n'est pas un clic
    if (dragMoved) { dragMoved = false; return; }

    // Menus déroulants du Bloc-notes : se ferment dès qu'on clique ailleurs
    document.querySelectorAll('.np-m.open').forEach(function (m) { if (!m.contains(t)) m.classList.remove('open'); });

    // Icône de volume (barre des tâches) et fenêtre "Volume"
    var volPop = document.getElementById('xp-volume-popup');
    if (t.closest('[data-xp-volume]')) {
      e.preventDefault();
      var sm0 = document.getElementById('xp-start-menu'), sb0 = document.getElementById('xp-start-btn');
      if (sm0) sm0.classList.remove('open');
      if (sb0) sb0.classList.remove('active');
      if (volPop) {
        var openNow = !volPop.classList.contains('open');
        volPop.classList.toggle('open', openNow);
        if (openNow) {
          var br = t.closest('[data-xp-volume]').getBoundingClientRect();
          var pl = br.left + br.width / 2 - volPop.offsetWidth / 2;
          volPop.style.left = Math.max(4, Math.min(window.innerWidth - volPop.offsetWidth - 4, pl)) + 'px';
        }
      }
      return;
    }
    if (t.closest('#xp-volume-popup')) return;
    if (volPop) volPop.classList.remove('open');

    // Barre Précédent / Suivant / Accueil des fenêtres de pages
    if (t.closest('[data-xp-back]') || t.closest('[data-xp-fwd]') || t.closest('[data-xp-home]')) {
      e.preventDefault();
      var nw = winOf(t);
      if (nw) {
        if (t.closest('[data-xp-back]')) goHistory(nw, -1);
        else if (t.closest('[data-xp-fwd]')) goHistory(nw, 1);
        else openPage(new URL(HOME_URL, location.href).href);
      }
      return;
    }

    // Écrans plein écran : l'écran bleu redémarre, la veille se rallume, noir et démarrage ignorent les clics
    if (t.closest('#xp-bsod-screen')) { restart(); return; }
    if (t.closest('#xp-standby-screen')) { wakeUp(); return; }
    if (t.closest('#xp-black-screen') || t.closest('#xp-boot-screen')) return;

    // Écran de connexion (Luna : noms d'utilisateur ; classique : boîte "Ouverture de session")
    if (t.closest('#xp-login-screen')) {
      var lu = t.closest('[data-lg-user]');
      if (lu) { e.preventDefault(); loginAs(lu.getAttribute('data-lg-user')); }
      else if (t.closest('[data-lg-turnoff]')) { exit(); }
      else if (t.closest('[data-lg-ok]')) { classicLogin(); }
      return;
    }

    // Bouton Test de "Informations système"
    if (t.closest('[data-xp-bsod-test]')) { e.preventDefault(); showBsod(); return; }

    // Bouton "Rechercher" de l'app Recherche
    if (t.closest('[data-sr-go]')) {
      e.preventDefault();
      var sw = winOf(t);
      if (sw) doSearch(sw);
      return;
    }

    var icon = t.closest('.xp-icon');
    if (icon) {
      document.querySelectorAll('.xp-icon').forEach(function(i) { i.classList.remove('selected'); });
      icon.classList.add('selected');

      var targetUrl = icon.getAttribute('data-xp-url');
      if (targetUrl) {
        openPage(targetUrl);
        return;
      }
    } else if (!t.closest('#xp-desktop-icons')) {
      document.querySelectorAll('.xp-icon').forEach(function(i) { i.classList.remove('selected'); });
    }

    var menu = document.getElementById('xp-start-menu');
    var startBtn = document.getElementById('xp-start-btn');
    var shutdownOverlay = document.getElementById('xp-shutdown-overlay');

    if (t.closest('[data-xp-start]')) {
      menu.classList.toggle('open');
      if (startBtn) startBtn.classList.toggle('active', menu.classList.contains('open'));
      return;
    }

    if (t.closest('[data-xp-shutdown-trigger]')) {
      e.preventDefault();
      menu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('active');
      openPowerDialog('off');
      return;
    }

    if (t.closest('[data-xp-logoff-trigger]')) {
      e.preventDefault();
      menu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('active');
      openPowerDialog('logoff');
      return;
    }
    if (t.closest('[data-xp-switch-user]')) { e.preventDefault(); switchUser(); return; }
    if (t.closest('[data-xp-logoff]')) { e.preventDefault(); logOff(); return; }

    if (t.closest('[data-xp-cancel-shutdown]')) {
      if (shutdownOverlay) shutdownOverlay.classList.remove('active');
      return;
    }

    if (t.closest('[data-xp-standby]')) { e.preventDefault(); standby(); return; }
    if (t.closest('[data-xp-restart]')) { e.preventDefault(); restart(); return; }
    if (t.closest('[data-xp-poweroff]')) { exit(); return; }

    if (t.closest('#xp-toggle-programs-btn')) {
      e.preventDefault();
      toggleProgramsView();
      return;
    }

    if (!t.closest('#xp-start-menu') && !t.closest('[data-xp-start]') && (!shutdownOverlay || !shutdownOverlay.contains(t))) {
      menu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('active');
      if (showPrograms) toggleProgramsView();
    }

    var sndTest = t.closest('[data-snd-test]');
    if (sndTest) { e.preventDefault(); testSound(winOf(sndTest), sndTest.getAttribute('data-snd-test')); return; }

    var npIt = t.closest('[data-np-cmd]');
    if (npIt) {
      e.preventDefault();
      var npw = winOf(npIt), par = npIt.closest('.np-m');
      if (par) par.classList.remove('open');
      if (npw) npCmd(npw, npIt.getAttribute('data-np-cmd'));
      return;
    }
    var npm = t.closest('[data-np-menu]');
    if (npm) { npm.classList.toggle('open'); return; }

    var rn = t.closest('[data-rn-ok],[data-rn-cancel],[data-rn-browse]');
    if (rn) {
      e.preventDefault();
      var rnw = winOf(rn);
      if (rnw) {
        if (rn.hasAttribute('data-rn-ok')) runCommand(rnw);
        else if (rn.hasAttribute('data-rn-cancel')) closeWin(rnw);
        else dialog({ title: 'Parcourir', icon: 'info', text: 'Le navigateur de fichiers n\'est pas disponible dans cette simulation.', buttons: [{ label: 'OK' }] });
      }
      return;
    }

    if (t.closest('.rb')) {
      var rbw = winOf(t);
      if (rbw) {
        if (t.closest('[data-rb-restore]') || t.closest('[data-rb-restore-all]')) { e.preventDefault(); rbw.rbSel = false; setSecret(true); playSound('tada'); return; }
        if (t.closest('[data-rb-empty]')) { e.preventDefault(); emptyBin(rbw); return; }
        if (t.closest('[data-rb-row]')) { rbw.rbSel = true; renderRecycle(rbw); return; }
        if (t.closest('.rb-list')) { rbw.rbSel = false; renderRecycle(rbw); return; }
      }
    }

    var app = t.closest('[data-xp-app]');
    if (app) {
      e.preventDefault();
      menu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('active');
      if (showPrograms) toggleProgramsView();
      openApp(app.getAttribute('data-xp-app'));
      return;
    }

    var cv = t.closest('[data-cp-view]');
    if (cv) {
      e.preventDefault();
      var cw = winOf(cv);
      if (cw) { renderCpanel(cw, cv.getAttribute('data-cp-view')); saveSession(); }
      return;
    }
    if (t.closest('[data-cp-reset]')) {
      var rw = winOf(t);
      cfg = Object.assign({}, DEFAULTS);
      saveCfg();
      applyTheme();
      enforceSingle();
      saveSession();
      if (rw) renderCpanel(rw, rw.view);
      return;
    }

    var tab = t.closest('.xp-task-tab');
    if (tab) {
      var tw = byId(+tab.getAttribute('data-xp-tab'));
      if (tw) { if (tw.id === activeId && !tw.st.min) minimize(tw); else focusWin(tw); }
      return;
    }

    var w = winOf(t);
    if (w) {
      if (t.closest('[data-xp-minimize]')) { minimize(w); return; }
      if (t.closest('[data-xp-maximize]')) { toggleMax(w); return; }
      if (t.closest('[data-xp-close]')) { if (w.type === 'notepad') npRequestClose(w); else closeWin(w); return; }
    }

    var a = t.closest('a[href]');
    if (a && env.contains(a)) {
      menu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('active');
      if (showPrograms) toggleProgramsView();
      handleLink(e, a, w);
    }
  });

  // Glisser-déposer des icônes du bureau : "Ce PC" jeté dans la Corbeille => écran bleu
  document.addEventListener('mousedown', function (e) {
    if (!env || e.button !== 0 || !e.target || !e.target.closest) return;
    var ic = e.target.closest('#xp-desktop-icons .xp-icon');
    if (!ic) return;
    e.preventDefault();
    var sx = e.clientX, sy = e.clientY, ghost = null;
    var bin = document.getElementById('xp-recycle');

    function over(ev) {
      if (!bin) return false;
      var r = bin.getBoundingClientRect();
      return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    }
    function move(ev) {
      if (!ghost) {
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 6) return;
        ghost = ic.cloneNode(true);
        ghost.removeAttribute('id');
        ghost.classList.add('xp-icon-ghost');
        env.appendChild(ghost);
        ic.classList.add('dragging');
      }
      ghost.style.left = (ev.clientX - 37) + 'px';
      ghost.style.top = (ev.clientY - 24) + 'px';
      if (bin) bin.classList.toggle('drop-over', over(ev));
    }
    function up(ev) {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (!ghost) return;                 // simple clic : géré par le gestionnaire de clic
      var hit = over(ev);
      ghost.remove();
      ic.classList.remove('dragging');
      if (bin) bin.classList.remove('drop-over');
      dragMoved = true;
      setTimeout(function () { dragMoved = false; }, 0);
      if (hit && ic.hasAttribute('data-xp-pc')) showBsod();
      else if (hit && ic.hasAttribute('data-xp-secret')) setSecret(false);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // Double-clic : ouvre la Corbeille, ou le fichier "secret" restauré sur le bureau
  document.addEventListener('dblclick', function (e) {
    if (!env || !e.target || !e.target.closest) return;
    if (e.target.closest('#xp-recycle')) { openApp('recycle'); return; }
    if (e.target.closest('[data-xp-secret]')) { openSecret(); return; }
    var fi = e.target.closest('[data-xp-file]');
    if (fi) openFile(fi.getAttribute('data-xp-file'));
  });

  // Curseur de volume : monter le son l'active, descendre à 0 le coupe
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!env || !t || t.id !== 'xp-volume-range' || !snd.card) return;
    snd.vol = +t.value;
    if (snd.vol > 0) {
      snd.muted = false;
      unlockAudio();
      preloadSounds();
    }
    saveSnd();
    updateVolumeUI();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!env || !t) return;
    if (t.id === 'cp-card') {
      // Carte audio : "branchée" (activée) ou "débranchée" (désactivée, le son reste sur muet)
      if (t.checked) {
        snd.card = true;
        saveSnd();
        updateVolumeUI();
        unlockAudio();
        playSound('hardware-insert');
      } else {
        playSound('hardware-remove');
        snd.card = false;
        saveSnd();
        updateVolumeUI();
      }
      var cw = winOf(t);
      if (cw) renderCpanel(cw, 'sound');
    } else if (t.id === 'xp-volume-range') {
      playSound('ding');                            // petit "ding" de contrôle quand on lâche le curseur
    } else if (t.id === 'xp-volume-mute') {
      snd.muted = t.checked;
      if (!snd.muted && snd.vol > 0) { unlockAudio(); preloadSounds(); }
      saveSnd();
      updateVolumeUI();
      if (!snd.muted) playSound('ding');
    }
  });
  // Les navigateurs n'autorisent le son qu'après une action de l'utilisateur
  ['pointerdown', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (env && soundLevel() > 0) unlockAudio(); }, true);
  });

  // Une touche rallume l'écran en veille, ou redémarre depuis l'écran bleu
  document.addEventListener('keydown', function (e) {
    if (standbyOn) { wakeUp(); return; }
    if (bsodOn) { restart(); return; }
    if (!env || !e.target || !e.target.classList) return;
    var cl = e.target.classList;
    if (cl.contains('sr-input') && e.key === 'Enter') {
      e.preventDefault();
      var sw = winOf(e.target);
      if (sw) doSearch(sw);
    } else if (cl.contains('rn-input')) {
      var rw2 = winOf(e.target);
      if (!rw2) return;
      if (e.key === 'Enter') { e.preventDefault(); runCommand(rw2); }
      else if (e.key === 'Escape') { closeWin(rw2); }
    } else if (cl.contains('lg-c-user') || cl.contains('lg-c-pass')) {
      if (e.key === 'Enter') { e.preventDefault(); classicLogin(); }
    } else if (cl.contains('np-text')) {
      var nw = winOf(e.target);
      if (!nw) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        npSave(nw, false);
      } else if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (!document.execCommand('insertText', false, '\t')) {
          e.target.setRangeText('\t', e.target.selectionStart, e.target.selectionEnd, 'end');
        }
        nw.dirty = true;
        npUpdate(nw);
      }
    }
  });

  // Bloc-notes : mise à jour de la barre d'état, du compteur de lignes et de l'état "modifié"
  ['input', 'keyup', 'mouseup'].forEach(function (ev) { document.addEventListener(ev, npEvent); });
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('np-text') && t.parentNode) {
      var g = t.parentNode.querySelector('.np-gutter');
      if (g) g.scrollTop = t.scrollTop;
    }
  }, true);
  // Les boutons / menus du Bloc-notes ne volent pas le focus du texte
  document.addEventListener('mousedown', function (e) {
    if (env && e.target && e.target.closest && e.target.closest('.np-btn, .np-it')) e.preventDefault();
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!env || !t || !t.closest || !t.closest('.cp')) return;
    if (t.name === 'cp-theme') {
      cfg.theme = t.value;
      saveCfg();
      applyTheme();
    } else if (t.getAttribute('data-cfg')) {
      var k = t.getAttribute('data-cfg');
      cfg[k] = t.checked;
      saveCfg();
      onCfg(k);
    }
  });

  (function boot() {
    var tpl = document.getElementById('xp-template');
    if (tpl) document.body.appendChild(tpl);
    var want = false;
    try { want = localStorage.getItem(K_ON) === 'true'; } catch (e) {}
    if (want) enter();
  })();
})();