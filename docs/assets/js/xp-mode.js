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
  var AUTHOR = 'Jan Klod';          // nom affiché dans l'app "Informations système"
  var SEARCH_URL = (script && script.getAttribute('data-search')) || '/assets/js/search-data.json';
  var searchData = null, searchLoading = null;
  var HOME_URL = (script && script.getAttribute('data-home')) || '/';
  var dragMoved = false;

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
    if (!url) return 'xp-ico-folder';
    var cleanUrl = clean(url);
    if (cleanUrl.indexOf('/journal') !== -1) return 'xp-ico-journal';
    if (cleanUrl.indexOf('/tests') !== -1) return 'xp-ico-tests';
    if (cleanUrl.indexOf('/github') !== -1) return 'xp-ico-github';
    if (cleanUrl === clean(location.origin + '/')) return 'xp-ico-computer';
    return 'xp-ico-folder';
  }

  function iconUrl(w) {
    var name = getIconClass(w.type, w.url).replace('xp-ico-', '');
    return new URL('/assets/images/winxp/ico/' + name + '.png', location.href).href;
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
        windows: wins.map(function (w) {
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
    return t.replace(/\s+/g, ' ').trim();
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
    try { if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([w.body]); } catch (e) {}
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
    var icoUrl = new URL('/assets/images/winxp/ico/' + iconName + '.png', location.href).href;
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
    } else {
      body = '<h2 class="cp-h">Choisissez une catégorie</h2><div class="cp-cats">' +
        cat('appearance', 'theme', 'Apparence et thèmes') +
        cat('windows', 'multitask', 'Fenêtres et multitâche') + '</div>';
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
    return new URL('/assets/images/winxp/ico/' + name + '.png', location.href).href;
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

  /* ===================== Applications du menu Démarrer ===================== */
  var APPS = {
    cpanel: { title: 'Panneau de configuration', render: renderCpanel },
    sysinfo: { title: 'Informations système', render: renderSysinfo },
    search: { title: 'Résultats de la recherche', render: renderSearch }
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
      listEl.innerHTML =
        '<li><a href="' + location.origin + '/"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/computer.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Accueil</strong><span>Principal</span></div></a></li>' +
        '<li><a href="' + location.origin + '/objectifs.html"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/folder.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Objectifs</strong><span>Buts du projet</span></div></a></li>' +
        '<li><a href="' + location.origin + '/equipe.html"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/folder.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Équipe</strong><span>Membres</span></div></a></li>' +
        '<li><a href="' + location.origin + '/etudes.html"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/folder.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Études</strong><span>Recherches</span></div></a></li>' +
        '<li><a href="' + location.origin + '/conception/"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/folder.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Conception</strong><span>CAO & Code</span></div></a></li>' +
        '<li><a href="' + location.origin + '/fabrication/"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/folder.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Fabrication</strong><span>Assemblage</span></div></a></li>' +
        '<li><a href="' + location.origin + '/tests.html"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/tests.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Tests</strong><span>Résultats</span></div></a></li>' +
        '<li><a href="' + location.origin + '/journal/"><span class="xp-start-ico" style="background-image: url(\'' + new URL('/assets/images/winxp/ico/journal.png', location.href).href + '\');"></span><div class="xp-start-text"><strong>Journal</strong><span>Suivi</span></div></a></li>';
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
      boot.classList.add('active');                         // 2) écran de démarrage (fondu depuis le noir)
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

  function exit() {
    try {
      localStorage.setItem(K_ON, 'false');
      sessionStorage.removeItem(K_SES);
    } catch (e) {}
    location.reload();
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
      if (shutdownOverlay) shutdownOverlay.classList.add('active');
      return;
    }

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
      if (t.closest('[data-xp-close]')) { closeWin(w); return; }
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
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  // Une touche rallume l'écran en veille, ou redémarre depuis l'écran bleu
  document.addEventListener('keydown', function (e) {
    if (standbyOn) wakeUp();
    else if (bsodOn) restart();
    else if (env && e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('sr-input')) {
      e.preventDefault();
      var sw = winOf(e.target);
      if (sw) doSearch(sw);
    }
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