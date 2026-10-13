/* =====================================================================
   Office 97 pour le mode Windows XP — chargé à la demande par xp-mode.js
   À placer dans : assets/js/office97.js
   Applications : Word, Excel, PowerPoint, Access, Outlook (simulées)
   Easter eggs  : Word 97 (flipper) et Excel 97 (simulateur de vol)
   ===================================================================== */
(function () {
  'use strict';
  var X = window.XP_API;
  if (!X) return;

  var VERSION_TXT = 'Microsoft Office 97';

  /* ------------------------------------------------------------------
     Styles (injectés une seule fois)
     ------------------------------------------------------------------ */
  var CSS = [
    '#xp-desktop-environment .xp-window.xp-app-word.xp-app-word,#xp-desktop-environment .xp-window.xp-app-excel.xp-app-excel{width:820px;height:560px;left:calc(50vw - 410px);top:30px;max-width:calc(100vw - 10px)}',
    '#xp-desktop-environment .xp-window.xp-app-powerpoint.xp-app-powerpoint,#xp-desktop-environment .xp-window.xp-app-access.xp-app-access,#xp-desktop-environment .xp-window.xp-app-outlook.xp-app-outlook{width:760px;height:520px;left:calc(50vw - 380px);top:40px;max-width:calc(100vw - 10px)}',
    '#xp-desktop-environment .xp-app-word .window-body,#xp-desktop-environment .xp-app-excel .window-body,#xp-desktop-environment .xp-app-powerpoint .window-body,#xp-desktop-environment .xp-app-access .window-body,#xp-desktop-environment .xp-app-outlook .window-body{background:#c0c0c0!important;overflow:hidden!important}',
    '.of{position:relative;display:flex;flex-direction:column;height:100%;background:#c0c0c0;color:#000;font:11px Tahoma,"MS Sans Serif",Arial,sans-serif;outline:none;user-select:none}',
    '.of *{box-sizing:border-box}',
    '.of-menubar{display:flex;flex:none;padding:1px 2px;border-bottom:1px solid #808080;position:relative}',
    '.of-mi{padding:3px 7px;cursor:default;position:relative}',
    '.of-mi.open,.of-mi:hover{background:#000080;color:#fff}',
    '.of-dd{position:absolute;left:0;top:100%;z-index:50;min-width:190px;background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:1px 1px 0 #000;padding:2px;color:#000}',
    '.of-di{display:flex;justify-content:space-between;gap:24px;padding:3px 18px 3px 22px;white-space:nowrap;cursor:default}',
    '.of-di:hover{background:#000080;color:#fff}',
    '.of-di.dis{color:#808080}.of-di.dis:hover{background:transparent;color:#808080}',
    '.of-di em{font-style:normal;opacity:.85}',
    '.of-sep{height:2px;margin:3px 1px;border-top:1px solid #808080;border-bottom:1px solid #fff}',
    '.of-tb{display:flex;align-items:center;flex-wrap:wrap;gap:2px;flex:none;padding:2px 3px;border-bottom:1px solid #808080;border-top:1px solid #fff}',
    '.of-b{min-width:24px;height:22px;padding:0 5px;background:#c0c0c0;border:1px solid transparent;font:11px Tahoma,sans-serif;cursor:default;color:#000;display:inline-flex;align-items:center;justify-content:center}',
    '.of-b:hover{border-color:#fff #404040 #404040 #fff}.of-b:active,.of-b.on{border-color:#404040 #fff #fff #404040;background:#d8d8d8}',
    '.of-tsep{width:2px;height:20px;margin:0 3px;border-left:1px solid #808080;border-right:1px solid #fff}',
    '.of-sel{height:21px;font:11px Tahoma,sans-serif;background:#fff;border:2px inset #fff;border-color:#808080 #fff #fff #808080}',
    '.of-client{flex:1;min-height:0;display:flex;position:relative;background:#808080;overflow:hidden}',
    '.of-status{flex:none;display:flex;gap:2px;padding:2px 3px;border-top:1px solid #fff;font-size:11px}',
    '.of-status span{flex:1;padding:1px 6px;border:1px solid;border-color:#808080 #fff #fff #808080;white-space:nowrap;overflow:hidden}',
    '.of-layer{position:absolute;inset:0;z-index:100;display:none}',
    '.of-layer.on{display:block}',
    /* boîtes de dialogue internes */
    '.of-modal{position:absolute;inset:0;background:rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;z-index:200}',
    '.of-dlg{background:#c0c0c0;border:2px solid;border-color:#dfdfdf #000 #000 #dfdfdf;box-shadow:1px 1px 0 #808080,4px 4px 8px rgba(0,0,0,.4);min-width:260px;max-width:92%}',
    '.of-dlg-t{background:linear-gradient(to right,#000080,#1084d0);color:#fff;font-weight:bold;padding:2px 5px;display:flex;justify-content:space-between}',
    '.of-dlg-b{padding:10px 12px}',
    '.of-dlg-f{display:flex;justify-content:flex-end;gap:6px;padding:0 12px 10px}',
    '.of-btn{min-width:72px;padding:3px 8px;background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;font:11px Tahoma,sans-serif;color:#000;cursor:default}',
    '.of-btn:active{border-color:#404040 #fff #fff #404040}.of-btn.def{outline:1px solid #000;outline-offset:-4px}',
    '.of-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}.of-row label{min-width:70px}',
    '.of-row input[type=text],.of-row select,.of-row textarea{flex:1;font:11px Tahoma,sans-serif;border:2px inset #fff;border-color:#808080 #fff #fff #808080;background:#fff;padding:1px 3px}',
    '.of-about{display:flex;gap:14px;align-items:flex-start}',
    '.of-about-ico{width:48px;height:48px;background-size:contain;background-repeat:no-repeat;background-position:center;flex:none;cursor:default}',
    /* Word */
    '.w-wrap{flex:1;overflow:auto;background:#808080;padding:12px 0;display:flex;justify-content:center}',
    '.w-page{width:595px;min-height:780px;background:#fff;padding:60px 70px;box-shadow:2px 2px 0 #000;outline:none;font:12pt "Times New Roman",serif;color:#000;user-select:text;cursor:text;white-space:pre-wrap;word-wrap:break-word;align-self:flex-start}',
    '.w-page table{border-collapse:collapse}.w-page td{border:1px solid #000;min-width:60px;height:20px;padding:2px}',
    '.w-ruler{height:16px;flex:none;background:#c0c0c0;border-bottom:1px solid #808080;position:relative}',
    '.w-ruler i{position:absolute;top:3px;width:1px;height:9px;background:#404040}',
    /* Excel */
    '.x-top{flex:none;display:flex;align-items:center;gap:6px;padding:2px 4px;border-bottom:1px solid #808080}',
    '.x-name{width:90px;height:20px;border:2px inset #fff;border-color:#808080 #fff #fff #808080;background:#fff;padding:1px 3px}',
    '.x-fx{flex:1;height:20px;border:2px inset #fff;border-color:#808080 #fff #fff #808080;background:#fff;padding:1px 3px;font:11px Tahoma,sans-serif}',
    '.x-scroll{flex:1;overflow:auto;background:#fff;position:relative}',
    '.x-tbl{border-collapse:collapse;table-layout:fixed;font:11px Arial,sans-serif;color:#000}',
    '.x-tbl th{position:sticky;top:0;z-index:2;background:#c0c0c0;border:1px solid;border-color:#fff #808080 #808080 #fff;font-weight:normal;height:17px;padding:0}',
    '.x-tbl th.rh{position:sticky;left:0;z-index:3;width:34px;min-width:34px}',
    '.x-tbl td{width:64px;min-width:64px;height:17px;border:1px solid #d0d0d0;padding:0 3px;white-space:nowrap;overflow:hidden;text-overflow:clip;background:#fff;cursor:cell}',
    '.x-tbl td.num{text-align:right}',
    '.x-tbl td.sel{background:#b9c7ea}',
    '.x-tbl td.act{background:#fff;outline:2px solid #000;outline-offset:-2px}',
    '.x-tbl td input{width:100%;height:100%;border:0;outline:0;background:#fff;font:11px Arial,sans-serif;padding:0;margin:0;user-select:text}',
    '.x-tbl th.cs{background:#a8b6dd}',
    /* Jeux */
    '.of-game{position:absolute;inset:0;background:#000;z-index:300;display:flex;align-items:center;justify-content:center;cursor:crosshair;overflow:hidden}',
    '.of-game canvas{max-width:100%;max-height:100%;image-rendering:pixelated;background:#000}',
    '.of-game .hint{position:absolute;left:8px;bottom:6px;color:#9a9a9a;font:11px Tahoma,sans-serif}',
    '.of-credits{position:absolute;inset:0;overflow:hidden;background:#000;color:#fff;text-align:center;font:bold 18px "Courier New",monospace}',
    '.of-credits div{position:absolute;left:0;right:0;top:100%;animation:ofScroll 24s linear forwards;line-height:2}',
    '@keyframes ofScroll{to{transform:translateY(-230%)}}',
    /* PowerPoint */
    '.p-side{width:150px;flex:none;background:#808080;overflow:auto;padding:8px}',
    '.p-th{background:#fff;border:2px solid #404040;aspect-ratio:4/3;margin-bottom:8px;font-size:8px;padding:4px;overflow:hidden;color:#000;cursor:default;position:relative}',
    '.p-th.on{border-color:#ffff00}.p-th b{position:absolute;left:-1px;top:-1px;background:#c0c0c0;padding:0 3px}',
    '.p-main{flex:1;display:flex;align-items:center;justify-content:center;background:#808080;overflow:auto;padding:12px}',
    '.p-slide{width:520px;aspect-ratio:4/3;background:#fff;box-shadow:3px 3px 0 #000;padding:30px 36px;display:flex;flex-direction:column;gap:18px;color:#000}',
    '.p-title{font:bold 30px Arial,sans-serif;text-align:center;outline:1px dashed #808080;min-height:48px;user-select:text;cursor:text}',
    '.p-body{flex:1;font:20px Arial,sans-serif;outline:1px dashed #808080;user-select:text;cursor:text;white-space:pre-wrap}',
    '.p-show{position:absolute;inset:0;background:#000;z-index:300;display:flex;align-items:center;justify-content:center;color:#000;cursor:pointer}',
    '.p-show .p-slide{width:min(92%,calc((100% - 0px)*1.33));max-height:96%;box-shadow:none}',
    /* Access */
    '.a-tabs{display:flex;gap:2px;padding:6px 6px 0;border-bottom:2px solid #fff}',
    '.a-tab{padding:3px 10px;border:2px solid;border-color:#fff #404040 #404040 #fff;border-bottom:0;cursor:default;background:#c0c0c0}.a-tab.on{background:#dcdcdc;font-weight:bold}',
    '.a-list{flex:1;background:#fff;margin:6px;border:2px inset #fff;border-color:#808080 #fff #fff #808080;padding:4px;overflow:auto}',
    '.a-item{display:flex;align-items:center;gap:6px;padding:3px 5px;cursor:default}.a-item:hover,.a-item.on{background:#000080;color:#fff}',
    '.a-sheet{width:100%;border-collapse:collapse;background:#fff;font:11px Arial,sans-serif}',
    '.a-sheet th{background:#c0c0c0;border:1px solid;border-color:#fff #808080 #808080 #fff;font-weight:normal;text-align:left;padding:2px 6px}',
    '.a-sheet td{border:1px solid #c0c0c0;padding:2px 6px;min-width:80px;user-select:text}',
    /* Outlook */
    '.o-folders{width:150px;flex:none;background:#fff;border-right:2px solid #808080;padding:4px;overflow:auto;color:#000}',
    '.o-fold{padding:3px 6px;cursor:default}.o-fold.on{background:#000080;color:#fff}',
    '.o-right{flex:1;display:flex;flex-direction:column;min-width:0;background:#fff;color:#000}',
    '.o-list{height:45%;overflow:auto;border-bottom:2px solid #808080}',
    '.o-list table{width:100%;border-collapse:collapse}.o-list th{background:#c0c0c0;border:1px solid;border-color:#fff #808080 #808080 #fff;text-align:left;font-weight:normal;padding:2px 6px;position:sticky;top:0}',
    '.o-list td{padding:2px 6px;white-space:nowrap;border-bottom:1px solid #eee}.o-list tr.unread td{font-weight:bold}.o-list tr.on td{background:#000080;color:#fff}',
    '.o-prev{flex:1;overflow:auto;padding:10px;user-select:text;white-space:pre-wrap}'
  ].join('\n');

  (function injectCss() {
    if (document.getElementById('xp-office-css')) return;
    var st = document.createElement('style');
    st.id = 'xp-office-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  })();

  /* ------------------------------------------------------------------
     Utilitaires communs
     ------------------------------------------------------------------ */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function alive(node) { return node && document.body.contains(node); }

  // Squelette commun : barre de menus, zone des barres d'outils, client, barre d'état, calque
  function chrome(w, cls, menus) {
    var root = el('div', 'of ' + cls);
    root.tabIndex = 0;
    root.innerHTML = '<div class="of-menubar"></div><div class="of-tbs"></div><div class="of-client"></div><div class="of-status"></div>';
    w.body.innerHTML = '';
    w.body.appendChild(root);
    var o = {
      root: root, w: w,
      bar: root.querySelector('.of-menubar'),
      tbs: root.querySelector('.of-tbs'),
      client: root.querySelector('.of-client'),
      status: root.querySelector('.of-status')
    };
    buildMenus(o, menus);
    return o;
  }

  function buildMenus(o, menus) {
    var openMi = null;
    function closeAll() {
      if (openMi) { openMi.classList.remove('open'); var d = openMi.querySelector('.of-dd'); if (d) d.remove(); }
      openMi = null;
    }
    function openMenu(mi, m) {
      closeAll();
      var dd = el('div', 'of-dd');
      m.items.forEach(function (it) {
        if (it === '-') { dd.appendChild(el('div', 'of-sep')); return; }
        var d = el('div', 'of-di' + (it.dis ? ' dis' : ''), '<span>' + it.t + '</span>' + (it.key ? '<em>' + it.key + '</em>' : ''));
        d.addEventListener('mousedown', function (e) { e.preventDefault(); });
        d.addEventListener('click', function (e) {
          e.stopPropagation();
          closeAll();
          if (!it.dis && it.fn) it.fn();
        });
        dd.appendChild(d);
      });
      mi.appendChild(dd);
      mi.classList.add('open');
      openMi = mi;
    }
    menus.forEach(function (m) {
      var mi = el('div', 'of-mi', m.t);
      mi.addEventListener('mousedown', function (e) { e.preventDefault(); });
      mi.addEventListener('click', function (e) {
        if (e.target.closest('.of-dd')) return;
        if (openMi === mi) closeAll(); else openMenu(mi, m);
      });
      mi.addEventListener('mouseenter', function () { if (openMi && openMi !== mi) openMenu(mi, m); });
      o.bar.appendChild(mi);
    });
    var onDoc = function (e) {
      if (!alive(o.root)) { document.removeEventListener('mousedown', onDoc, true); return; }
      if (!e.target.closest || !e.target.closest('.of-menubar')) closeAll();
    };
    document.addEventListener('mousedown', onDoc, true);
    o.closeMenus = closeAll;
  }

  // Barre d'outils : items = [{t, title, fn, cls}] ou '-'
  function toolbar(o, items) {
    var tb = el('div', 'of-tb');
    items.forEach(function (it) {
      if (it === '-') { tb.appendChild(el('span', 'of-tsep')); return; }
      if (it.node) { tb.appendChild(it.node); return; }
      var b = el('button', 'of-b' + (it.cls ? ' ' + it.cls : ''), it.t);
      b.type = 'button';
      if (it.title) b.title = it.title;
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function (e) { if (it.fn) it.fn(e, b); });
      if (it.id) b.setAttribute('data-of', it.id);
      tb.appendChild(b);
    });
    o.tbs.appendChild(tb);
    return tb;
  }

  // Boîte de dialogue interne à la fenêtre
  function modal(o, title, html, buttons, opts) {
    opts = opts || {};
    var m = el('div', 'of-modal');
    var d = el('div', 'of-dlg');
    if (opts.width) d.style.width = opts.width + 'px';
    d.innerHTML = '<div class="of-dlg-t"><span>' + title + '</span></div><div class="of-dlg-b">' + html + '</div><div class="of-dlg-f"></div>';
    var f = d.querySelector('.of-dlg-f');
    function close() { m.remove(); try { o.root.focus(); } catch (e) {} }
    (buttons || [{ t: 'OK', def: true }]).forEach(function (b) {
      var bt = el('button', 'of-btn' + (b.def ? ' def' : ''), b.t);
      bt.type = 'button';
      bt.addEventListener('click', function () {
        var r = b.fn ? b.fn(d) : undefined;
        if (r !== false) close();
      });
      f.appendChild(bt);
    });
    m.appendChild(d);
    m.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    o.root.appendChild(m);
    X.playSound('ding');
    var first = d.querySelector('input,select,textarea,.of-btn.def');
    if (first) setTimeout(function () { try { first.focus(); if (first.select) first.select(); } catch (e) {} }, 0);
    return { el: m, dlg: d, close: close };
  }

  function about(o, appName, icoName, onIconClick) {
    var html = '<div class="of-about"><div class="of-about-ico" style="background-image:url(\'' + X.assetIco(icoName) + '\')"></div>' +
      '<div><b>' + appName + '</b><br>' + VERSION_TXT + ' pour Windows<br><br>Simulation réalisée pour la documentation du projet.<br>Aucun logiciel Microsoft n\'est utilisé.</div></div>';
    var m = modal(o, 'À propos de ' + appName, html, [{ t: 'OK', def: true }], { width: 360 });
    var ic = m.dlg.querySelector('.of-about-ico');
    ic.addEventListener('click', function (e) { if (onIconClick) onIconClick(e, m); });
    return m;
  }

  function menuQuit(w) { return { t: 'Quitter', key: 'Alt+F4', fn: function () { X.closeWin(w); } }; }

  function helpMenu(o, name, ico, onIconClick) {
    return { t: '?', items: [
      { t: 'Sommaire et index', dis: true },
      '-',
      { t: 'À propos de ' + name, fn: function () { about(o, name, ico, onIconClick); } }
    ] };
  }

  /* ------------------------------------------------------------------
     Crédits défilants (communs aux deux easter eggs)
     ------------------------------------------------------------------ */
  function creditsLayer(lines) {
    var c = el('div', 'of-credits');
    c.innerHTML = '<div>' + lines.map(function (l) { return esc(l) || '&nbsp;'; }).join('<br>') + '</div>';
    return c;
  }

  /* ==================================================================
     WORD 97
     ================================================================== */
  var W_FONTS = ['Times New Roman', 'Arial', 'Courier New', 'Verdana', 'Tahoma', 'Comic Sans MS'];
  var W_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
  var W_COLORS = [
    ['Automatique', '#000000'], ['Noir', '#000000'], ['Bleu', '#0000FF'], ['Turquoise', '#00FFFF'], ['Vert', '#00FF00'],
    ['Rose', '#FF00FF'], ['Rouge', '#FF0000'], ['Jaune', '#FFFF00'], ['Blanc', '#FFFFFF'], ['Bleu foncé', '#000080'],
    ['Bleu-vert', '#008080'], ['Vert foncé', '#008000'], ['Violet', '#800080'], ['Bordeaux', '#800000'],
    ['Kaki', '#808000'], ['Gris 50 %', '#808080'], ['Gris 25 %', '#C0C0C0']
  ];

  function renderWord(w) {
    var page, saved = null, docN = 1;
    var o = chrome(w, 'of-word', [
      { t: 'Fichier', items: [
        { t: 'Nouveau', key: 'Ctrl+N', fn: function () { page.innerHTML = ''; page.focus(); } },
        { t: 'Ouvrir...', key: 'Ctrl+O', dis: true },
        { t: 'Enregistrer', key: 'Ctrl+S', fn: function () { X.dialog({ title: 'Microsoft Word', icon: 'info', text: 'Cette simulation n\'enregistre pas les documents.', buttons: [{ label: 'OK' }] }); } },
        '-',
        { t: 'Imprimer...', key: 'Ctrl+P', fn: function () { X.dialog({ title: 'Microsoft Word', icon: 'error', text: 'Aucune imprimante n\'est installée.', buttons: [{ label: 'OK' }] }); } },
        '-', menuQuit(w)
      ] },
      { t: 'Edition', items: [
        { t: 'Annuler', key: 'Ctrl+Z', fn: function () { cmd('undo'); } },
        { t: 'Rétablir', key: 'Ctrl+Y', fn: function () { cmd('redo'); } },
        '-',
        { t: 'Couper', key: 'Ctrl+X', fn: function () { cmd('cut'); } },
        { t: 'Copier', key: 'Ctrl+C', fn: function () { cmd('copy'); } },
        { t: 'Coller', key: 'Ctrl+V', fn: function () { cmd('paste'); } },
        '-',
        { t: 'Sélectionner tout', key: 'Ctrl+A', fn: function () { cmd('selectAll'); } }
      ] },
      { t: 'Affichage', items: [{ t: 'Normal', dis: true }, { t: 'Mode Page', fn: function () {} }, { t: 'Plan', dis: true }] },
      { t: 'Insertion', items: [
        { t: 'Date et heure...', fn: function () { restore(); cmd('insertText', new Date().toLocaleString('fr-FR')); } },
        { t: 'Saut de page', key: 'Ctrl+Entrée', fn: function () { restore(); cmd('insertText', '\n\n— — — saut de page — — —\n\n'); } }
      ] },
      { t: 'Format', items: [
        { t: 'Police...', fn: fontDialog },
        '-',
        { t: 'Aligner à gauche', key: 'Ctrl+G', fn: function () { cmd('justifyLeft'); } },
        { t: 'Centrer', key: 'Ctrl+E', fn: function () { cmd('justifyCenter'); } },
        { t: 'Aligner à droite', key: 'Ctrl+D', fn: function () { cmd('justifyRight'); } },
        { t: 'Justifier', key: 'Ctrl+J', fn: function () { cmd('justifyFull'); } }
      ] },
      { t: 'Outils', items: [
        { t: 'Grammaire et orthographe...', key: 'F7', fn: function () { X.dialog({ title: 'Grammaire et orthographe', icon: 'info', text: 'La vérification orthographique est terminée.', buttons: [{ label: 'OK' }] }); } },
        { t: 'Nombre de mots...', fn: function () {
          var t = (page.innerText || '').trim();
          var words = t ? t.split(/\s+/).length : 0;
          modal(o, 'Nombre de mots', 'Mots : <b>' + words + '</b><br>Caractères : <b>' + t.length + '</b>', [{ t: 'Fermer', def: true }]);
        } }
      ] },
      { t: 'Tableau', items: [{ t: 'Insérer un tableau (3 x 3)', fn: function () {
        restore();
        var h = '<table>' + new Array(4).join('<tr>' + new Array(4).join('<td>&nbsp;</td>') + '</tr>') + '</table><br>';
        cmd('insertHTML', h);
      } }] },
      { t: 'Fenêtre', items: [{ t: 'Document' + 1, dis: true }] },
      helpMenu(null, 'Microsoft Word', 'word97', pinballTry)
    ]);
    // le menu "?" a besoin de o : on le reconstruit après coup
    o.bar.lastChild.remove();
    (function () {
      var tmp = chrome; // (inutile, garde la portée)
    })();
    var helpItems = helpMenu(o, 'Microsoft Word', 'word97', pinballTry);
    buildExtraMenu(o, helpItems);

    w.view = 'home';
    X.setTitle(w, 'Document1 - Microsoft Word');

    // Barres d'outils
    var fontSel = el('select', 'of-sel');
    fontSel.style.width = '140px';
    fontSel.innerHTML = W_FONTS.map(function (f) { return '<option>' + f + '</option>'; }).join('');
    var sizeSel = el('select', 'of-sel');
    sizeSel.style.width = '52px';
    sizeSel.innerHTML = W_SIZES.map(function (s) { return '<option' + (s === 12 ? ' selected' : '') + '>' + s + '</option>'; }).join('');
    fontSel.addEventListener('change', function () { restore(); cmd('fontName', fontSel.value); });
    sizeSel.addEventListener('change', function () { restore(); setSize(parseInt(sizeSel.value, 10)); });

    toolbar(o, [
      { t: '&#128196;', title: 'Nouveau', fn: function () { page.innerHTML = ''; page.focus(); } },
      { t: '&#128194;', title: 'Ouvrir', fn: function () {} },
      { t: '&#128190;', title: 'Enregistrer', fn: function () {} },
      '-',
      { t: '&#128424;', title: 'Imprimer', fn: function () {} },
      '-',
      { t: '&#9986;', title: 'Couper', fn: function () { cmd('cut'); } },
      { t: '&#128203;', title: 'Copier', fn: function () { cmd('copy'); } },
      { t: '&#128204;', title: 'Coller', fn: function () { cmd('paste'); } },
      '-',
      { t: '&#8630;', title: 'Annuler', fn: function () { cmd('undo'); } },
      { t: '&#8631;', title: 'Rétablir', fn: function () { cmd('redo'); } }
    ]);
    toolbar(o, [
      { node: fontSel }, { node: sizeSel }, '-',
      { t: '<b>G</b>', title: 'Gras', fn: function () { cmd('bold'); } },
      { t: '<i>I</i>', title: 'Italique', fn: function () { cmd('italic'); } },
      { t: '<u>S</u>', title: 'Souligné', fn: function () { cmd('underline'); } },
      '-',
      { t: '&#8676;', title: 'Aligner à gauche', fn: function () { cmd('justifyLeft'); } },
      { t: '&#8801;', title: 'Centrer', fn: function () { cmd('justifyCenter'); } },
      { t: '&#8677;', title: 'Aligner à droite', fn: function () { cmd('justifyRight'); } },
      { t: '&#9776;', title: 'Justifier', fn: function () { cmd('justifyFull'); } },
      '-',
      { t: '&#8226;', title: 'Puces', fn: function () { cmd('insertUnorderedList'); } },
      { t: '1.', title: 'Numérotation', fn: function () { cmd('insertOrderedList'); } }
    ]);

    var ruler = el('div', 'w-ruler');
    for (var i = 0; i < 40; i++) ruler.innerHTML += '<i style="left:' + (60 + i * 16) + 'px;height:' + (i % 2 ? 5 : 9) + 'px"></i>';
    o.tbs.appendChild(ruler);

    var wrap = el('div', 'w-wrap');
    page = el('div', 'w-page');
    page.contentEditable = 'true';
    page.spellcheck = false;
    wrap.appendChild(page);
    o.client.appendChild(wrap);

    o.status.innerHTML = '<span>Page 1</span><span>Sec 1</span><span>1/1</span><span>Lg 1</span><span>Col 1</span>';
    setTimeout(function () { page.focus(); }, 30);

    // Sélection sauvegardée (les listes déroulantes / boîtes de dialogue la font perdre)
    function save() {
      var s = window.getSelection();
      if (s.rangeCount && page.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange();
    }
    function restore() {
      page.focus();
      if (!saved) return;
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(saved);
    }
    ['keyup', 'mouseup', 'input'].forEach(function (ev) { page.addEventListener(ev, save); });
    page.addEventListener('blur', save);

    function cmd(c, v) {
      page.focus();
      try { document.execCommand(c, false, v == null ? null : v); } catch (e) {}
      save();
    }
    function setSize(px) {
      // execCommand ne gère que 1..7 : on marque puis on remplace par une vraie taille
      try { document.execCommand('styleWithCSS', false, false); } catch (e) {}
      cmd('fontSize', 7);
      var fonts = page.querySelectorAll('font[size="7"]');
      Array.prototype.forEach.call(fonts, function (f) {
        f.removeAttribute('size');
        f.style.fontSize = px + 'pt';
      });
    }

    function fontDialog() {
      save();
      var html =
        '<div class="of-row"><label>Police :</label><select class="d-font">' + W_FONTS.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select></div>' +
        '<div class="of-row"><label>Style :</label><select class="d-style"><option>Normal</option><option>Italique</option><option>Gras</option><option>Gras Italique</option></select></div>' +
        '<div class="of-row"><label>Taille :</label><select class="d-size">' + W_SIZES.map(function (s) { return '<option' + (s === 12 ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
        '<div class="of-row"><label>Couleur :</label><select class="d-color">' + W_COLORS.map(function (c) { return '<option value="' + c[1] + '">' + c[0] + '</option>'; }).join('') + '</select></div>';
      modal(o, 'Police', html, [
        { t: 'OK', def: true, fn: function (d) {
          var st = d.querySelector('.d-style').value;
          restore();
          cmd('fontName', d.querySelector('.d-font').value);
          setSize(parseInt(d.querySelector('.d-size').value, 10));
          var wantB = /Gras/.test(st), wantI = /Italique/.test(st);
          if (document.queryCommandState('bold') !== wantB) cmd('bold');
          if (document.queryCommandState('italic') !== wantI) cmd('italic');
          cmd('foreColor', d.querySelector('.d-color').value);
        } },
        { t: 'Annuler' }
      ], { width: 300 });
    }

    // --- Easter egg : "Blue" en gras et en bleu, suivi d'un espace, puis ? > A propos, Maj+clic sur l'icône
    function eggReady() {
      var txt = (page.textContent || '').replace(/ /g, ' ');
      if (!/Blue[ "]/.test(txt)) return false;
      var tw = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, null, false), n;
      while ((n = tw.nextNode())) {
        if (n.nodeValue.indexOf('Blue') < 0) continue;
        var cs = getComputedStyle(n.parentNode);
        var bold = (parseInt(cs.fontWeight, 10) || 400) >= 600 || cs.fontWeight === 'bold';
        var m = cs.color.match(/\d+/g) || [];
        if (bold && +m[0] < 60 && +m[1] < 60 && +m[2] > 200) return true;
      }
      return false;
    }
    function pinballTry(e, m) {
      if (!e.shiftKey) return;
      if (!eggReady()) return;
      if (m) m.close();
      startPinball(o);
    }
  }

  // Ajoute un menu construit après coup (le menu "?" a besoin de l'objet o)
  function buildExtraMenu(o, m) {
    var mi = el('div', 'of-mi', m.t);
    var dd = null;
    function close() { if (dd) { dd.remove(); dd = null; } mi.classList.remove('open'); }
    mi.addEventListener('mousedown', function (e) { e.preventDefault(); });
    mi.addEventListener('click', function (e) {
      if (e.target.closest('.of-dd')) return;
      if (dd) { close(); return; }
      if (o.closeMenus) o.closeMenus();
      dd = el('div', 'of-dd');
      m.items.forEach(function (it) {
        if (it === '-') { dd.appendChild(el('div', 'of-sep')); return; }
        var d = el('div', 'of-di' + (it.dis ? ' dis' : ''), '<span>' + it.t + '</span>');
        d.addEventListener('click', function (ev) { ev.stopPropagation(); close(); if (!it.dis && it.fn) it.fn(); });
        dd.appendChild(d);
      });
      mi.appendChild(dd);
      mi.classList.add('open');
    });
    var onDoc = function (e) {
      if (!alive(o.root)) { document.removeEventListener('mousedown', onDoc, true); return; }
      if (!e.target.closest || !e.target.closest('.of-menubar')) close();
    };
    document.addEventListener('mousedown', onDoc, true);
    o.bar.appendChild(mi);
  }

  /* ------------------------------------------------------------------
     Flipper (easter egg de Word 97) — Z / M pour les palettes, Échap pour quitter
     ------------------------------------------------------------------ */
  function startPinball(o) {
    var g = el('div', 'of-game');
    var cv = el('canvas');
    cv.width = 360; cv.height = 540;
    g.appendChild(cv);
    g.appendChild(el('div', 'hint', 'Z : palette gauche   M : palette droite   Espace : nouvelle bille   Échap : quitter'));
    o.root.appendChild(g);
    var ctx = cv.getContext('2d');

    var walls = [
      [20, 130, 60, 55], [60, 55, 115, 28], [115, 28, 180, 20], [180, 20, 245, 28], [245, 28, 300, 55], [300, 55, 340, 130],
      [20, 130, 20, 405], [340, 130, 340, 405],
      [20, 405, 108, 465], [340, 405, 252, 465]
    ];
    var bumpers = [
      { x: 125, y: 175, r: 20, c: '#e03030', f: 0 }, { x: 235, y: 175, r: 20, c: '#30a030', f: 0 },
      { x: 180, y: 255, r: 20, c: '#3060e0', f: 0 }, { x: 80, y: 290, r: 11, c: '#e0c030', f: 0 }, { x: 280, y: 290, r: 11, c: '#e0c030', f: 0 }
    ];
    var L = 58, TH = 5, RB = 7;
    var fl = [
      { px: 112, py: 472, dir: 1, th: 0.5, rest: 0.5, act: -0.5, on: false, dth: 0 },
      { px: 248, py: 472, dir: -1, th: 0.5, rest: 0.5, act: -0.5, on: false, dth: 0 }
    ];
    var ball, score = 0, lives = 3, over = false, high = 0, running = true;

    function newBall() { ball = { x: 300 + Math.random() * 20, y: 70, vx: -1.5 - Math.random(), vy: 0 }; }
    newBall();

    function flDir(f) { return { x: f.dir * Math.cos(f.th), y: Math.sin(f.th) }; }
    function flEnd(f) { var d = flDir(f); return { x: f.px + d.x * L, y: f.py + d.y * L }; }

    // collision balle / capsule [a,b] de rayon rad ; sv = vitesse de la surface
    function capsule(ax, ay, bx, by, rad, e, svfn) {
      var abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
      var t = ((ball.x - ax) * abx + (ball.y - ay) * aby) / l2;
      t = Math.max(0, Math.min(1, t));
      var cx = ax + abx * t, cy = ay + aby * t;
      var dx = ball.x - cx, dy = ball.y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d >= RB + rad || d === 0) return false;
      var nx = dx / d, ny = dy / d;
      ball.x = cx + nx * (RB + rad); ball.y = cy + ny * (RB + rad);
      var sv = svfn ? svfn(t) : { x: 0, y: 0 };
      var rvx = ball.vx - sv.x, rvy = ball.vy - sv.y;
      var vn = rvx * nx + rvy * ny;
      if (vn < 0) { rvx -= (1 + e) * vn * nx; rvy -= (1 + e) * vn * ny; ball.vx = rvx + sv.x; ball.vy = rvy + sv.y; }
      return true;
    }

    function update() {
      fl.forEach(function (f) {
        var target = f.on ? f.act : f.rest, old = f.th;
        f.th += Math.max(-0.28, Math.min(0.28, target - f.th));
        f.dth = f.th - old;
      });
      if (over) return;
      var N = 4, dt = 1 / N;
      for (var s = 0; s < N; s++) {
        ball.vy += 0.2 * dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        walls.forEach(function (w) { capsule(w[0], w[1], w[2], w[3], 2, 0.55); });
        bumpers.forEach(function (b) {
          var dx = ball.x - b.x, dy = ball.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < RB + b.r && d > 0) {
            var nx = dx / d, ny = dy / d;
            ball.x = b.x + nx * (RB + b.r); ball.y = b.y + ny * (RB + b.r);
            var vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) { ball.vx -= 2 * vn * nx; ball.vy -= 2 * vn * ny; }
            var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (sp < 6) { ball.vx = nx * 6; ball.vy = ny * 6; }
            b.f = 8; score += b.r > 15 ? 100 : 250;
          }
        });
        fl.forEach(function (f) {
          var e = flEnd(f), dd = { x: -f.dir * Math.sin(f.th), y: Math.cos(f.th) };
          capsule(f.px, f.py, e.x, e.y, TH, 0.45, function (t) { return { x: dd.x * f.dth * L * t, y: dd.y * f.dth * L * t }; });
        });
        var sp2 = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (sp2 > 13) { ball.vx *= 13 / sp2; ball.vy *= 13 / sp2; }
        if (ball.y > 570) {
          lives--;
          if (lives <= 0) { over = true; high = Math.max(high, score); } else newBall();
          break;
        }
      }
    }

    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 360, 540);
      ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      walls.forEach(function (w) { ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[2], w[3]); ctx.stroke(); });
      bumpers.forEach(function (b) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + (b.f > 0 ? 3 : 0), 0, 6.3);
        ctx.fillStyle = b.f > 0 ? '#fff' : b.c; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        if (b.f > 0) b.f--;
      });
      ctx.lineWidth = TH * 2; ctx.strokeStyle = '#ffd040';
      fl.forEach(function (f) { var e = flEnd(f); ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(e.x, e.y); ctx.stroke(); });
      if (!over) {
        ctx.beginPath(); ctx.arc(ball.x, ball.y, RB, 0, 6.3);
        var gr = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, RB);
        gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#8a8a8a'); ctx.fillStyle = gr; ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Courier New",monospace'; ctx.textAlign = 'left';
      ctx.fillText('SCORE ' + score, 28, 22); ctx.textAlign = 'right';
      ctx.fillText('BILLES ' + Math.max(lives, 0), 332, 22);
      if (over) {
        ctx.textAlign = 'center'; ctx.font = 'bold 22px "Courier New",monospace';
        ctx.fillText('FIN DE PARTIE', 180, 300);
        ctx.font = '13px "Courier New",monospace';
        ctx.fillText('Meilleur score : ' + high, 180, 325);
        ctx.fillText('Espace pour rejouer', 180, 348);
      }
    }

    function reset() { score = 0; lives = 3; over = false; newBall(); }
    function onKey(e) {
      if (!alive(g)) { cleanup(); return; }
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); exit(); return; }
      if (k === 'z' || k === 'Z') { fl[0].on = e.type === 'keydown'; e.preventDefault(); }
      else if (k === 'm' || k === 'M') { fl[1].on = e.type === 'keydown'; e.preventDefault(); }
      else if (k === ' ' && e.type === 'keydown') { e.preventDefault(); if (over) reset(); else newBall(); }
    }
    function cleanup() { running = false; document.removeEventListener('keydown', onKey, true); document.removeEventListener('keyup', onKey, true); }
    function exit() { cleanup(); g.remove(); try { o.root.focus(); } catch (e) {} }
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);

    // Crédits en filigrane au début (comme dans l'original : les noms défilent pendant la partie)
    var cr = creditsLayer(['MICROSOFT WORD 97', '', 'FLIPPER', '', 'Simulation pour la documentation du projet', '', '', 'Z / M : palettes', 'Échap : quitter']);
    cr.style.opacity = '.35'; cr.style.pointerEvents = 'none';
    g.insertBefore(cr, cv);

    (function loop() {
      if (!running || !alive(g)) { cleanup(); return; }
      update(); draw();
      requestAnimationFrame(loop);
    })();
  }

  /* ==================================================================
     EXCEL 97
     ================================================================== */
  var X_COLS = 28, X_ROWS = 200;

  function colName(i) { // 0 -> A
    var s = ''; i++;
    while (i > 0) { var r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  function colIdx(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n - 1; }
  function parseRef(r) {
    var m = /^\s*\$?([A-Za-z]{1,2})\$?(\d{1,3})\s*$/.exec(r);
    if (!m) return null;
    var c = colIdx(m[1].toUpperCase()), row = parseInt(m[2], 10) - 1;
    if (c < 0 || c >= X_COLS || row < 0 || row >= X_ROWS) return null;
    return { c: c, r: row };
  }

  function renderExcel(w) {
    var cells = {};                 // "A1" -> texte saisi
    var sel = { a: { c: 0, r: 0 }, b: { c: 0, r: 0 } };   // a = cellule active, b = autre coin
    var tabsAfterGoto = 0, gotoRange = false;
    var tbl, scroll, nameBox, fx, editing = null;
    var tdOf = {};

    var o = chrome(w, 'of-excel', [
      { t: 'Fichier', items: [
        { t: 'Nouveau', key: 'Ctrl+N', fn: function () { cells = {}; refreshAll(); select(0, 0); } },
        { t: 'Enregistrer', key: 'Ctrl+S', fn: function () { X.dialog({ title: 'Microsoft Excel', icon: 'info', text: 'Cette simulation n\'enregistre pas les classeurs.', buttons: [{ label: 'OK' }] }); } },
        '-', menuQuit(w)
      ] },
      { t: 'Edition', items: [
        { t: 'Effacer le contenu', key: 'Suppr', fn: function () { forSel(function (k) { delete cells[k]; }); refreshAll(); } },
        '-',
        { t: 'Atteindre...', key: 'F5', fn: gotoDialog }
      ] },
      { t: 'Affichage', items: [{ t: 'Normal', dis: true }, { t: 'Barre de formule', dis: true }] },
      { t: 'Insertion', items: [{ t: 'Fonction...', dis: true }, { t: 'Graphique...', fn: chartDialog }] },
      { t: 'Format', items: [{ t: 'Cellule...', dis: true }] },
      { t: 'Outils', items: [{ t: 'Orthographe...', key: 'F7', dis: true }] },
      { t: 'Données', items: [{ t: 'Trier...', dis: true }] },
      { t: 'Fenêtre', items: [{ t: 'Classeur1', dis: true }] }
    ]);
    buildExtraMenu(o, helpMenu(o, 'Microsoft Excel', 'excel97'));
    X.setTitle(w, 'Microsoft Excel - Classeur1');

    toolbar(o, [
      { t: '&#128196;', title: 'Nouveau', fn: function () { cells = {}; refreshAll(); } },
      { t: '&#128194;', title: 'Ouvrir' }, { t: '&#128190;', title: 'Enregistrer' }, '-',
      { t: '&#8630;', title: 'Annuler' }, '-',
      { t: '&#931;', title: 'Somme automatique', fn: function () { autoSum(); } }, '-',
      { t: '<span style="color:#800000;font-weight:bold;letter-spacing:-1px">&#9641;&#9643;</span>', title: 'Assistant Graphique', id: 'chart', fn: function (e) {
        if (e.shiftKey && gotoRange && tabsAfterGoto === 1) { startFlight(o); return; }
        chartDialog();
      } }
    ]);

    var top = el('div', 'x-top');
    nameBox = el('input', 'x-name'); nameBox.readOnly = true; nameBox.value = 'A1';
    fx = el('input', 'x-fx'); fx.type = 'text'; fx.spellcheck = false;
    top.appendChild(nameBox); top.appendChild(el('span', '', '<i>fx</i>')); top.appendChild(fx);
    o.tbs.appendChild(top);

    scroll = el('div', 'x-scroll');
    o.client.appendChild(scroll);
    buildTable();
    o.status.innerHTML = '<span>Prêt</span><span style="flex:0 0 120px"></span>';
    setTimeout(function () { select(0, 0); o.root.focus(); }, 0);   // après la déclaration de toutes les variables locales

    /* ---- Construction du tableau ---- */
    function buildTable() {
      var h = '<table class="x-tbl"><thead><tr><th class="rh"></th>';
      for (var c = 0; c < X_COLS; c++) h += '<th data-ch="' + c + '">' + colName(c) + '</th>';
      h += '</tr></thead><tbody>';
      for (var r = 0; r < X_ROWS; r++) {
        h += '<tr><th class="rh" data-rh="' + r + '">' + (r + 1) + '</th>';
        for (c = 0; c < X_COLS; c++) h += '<td data-k="' + colName(c) + (r + 1) + '"></td>';
        h += '</tr>';
      }
      h += '</tbody></table>';
      scroll.innerHTML = h;
      tbl = scroll.firstChild;
      Array.prototype.forEach.call(tbl.querySelectorAll('td'), function (td) { tdOf[td.getAttribute('data-k')] = td; });
      tbl.addEventListener('mousedown', function (e) {
        var td = e.target.closest('td');
        if (!td) return;
        if (editing && editing.td === td) return;
        commitEdit();
        var p = parseRef(td.getAttribute('data-k'));
        tabsAfterGoto = 0; gotoRange = false;
        if (e.shiftKey) { sel.b = p; paintSel(); } else { select(p.c, p.r); }
        var move = function (ev) {
          var t2 = document.elementFromPoint(ev.clientX, ev.clientY);
          t2 = t2 && t2.closest && t2.closest('td');
          if (t2 && tbl.contains(t2)) { sel.b = parseRef(t2.getAttribute('data-k')); paintSel(); }
        };
        var up = function () { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        o.root.focus();
        e.preventDefault();
      });
      tbl.addEventListener('dblclick', function (e) { var td = e.target.closest('td'); if (td) startEdit(td.getAttribute('data-k'), null); });
    }

    /* ---- Évaluation des formules ---- */
    function flat(args) { var out = []; args.forEach(function (a) { if (Array.isArray(a)) out = out.concat(flat(a)); else out.push(a); }); return out; }
    function nums(args) { return flat(args).filter(function (v) { return typeof v === 'number' && !isNaN(v); }); }
    var FUNCS = {
      SUM: function () { return nums(arguments).reduce(function (a, b) { return a + b; }, 0); },
      AVERAGE: function () { var n = nums(arguments); return n.length ? FUNCS.SUM(n) / n.length : NaN; },
      MIN: function () { var n = nums(arguments); return n.length ? Math.min.apply(null, n) : 0; },
      MAX: function () { var n = nums(arguments); return n.length ? Math.max.apply(null, n) : 0; },
      COUNT: function () { return nums(arguments).length; },
      ABS: Math.abs, SQRT: Math.sqrt,
      ROUND: function (v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; },
      PI: function () { return Math.PI; }
    };
    var depth = 0;
    function value(k) {
      var raw = cells[k];
      if (raw == null || raw === '') return 0;
      if (raw.charAt(0) === '=') return evalFormula(raw.slice(1));
      var n = Number(raw.replace(',', '.'));
      return raw.trim() !== '' && !isNaN(n) ? n : raw;
    }
    function range(a, b) {
      var A = parseRef(a), B = parseRef(b), out = [];
      if (!A || !B) return out;
      for (var r = Math.min(A.r, B.r); r <= Math.max(A.r, B.r); r++)
        for (var c = Math.min(A.c, B.c); c <= Math.max(A.c, B.c); c++) out.push(value(colName(c) + (r + 1)));
      return out;
    }
    function evalFormula(src) {
      if (depth > 40) return '#REF!';
      var e = src.toUpperCase().replace(/\s+/g, '')
        .replace(/([A-Z]{1,2}\d{1,3}):([A-Z]{1,2}\d{1,3})/g, 'R("$1","$2")')
        .replace(/(^|[^A-Z"])([A-Z]{1,2}\d{1,3})(?![\d"(])/g, '$1V("$2")')
        .replace(/\^/g, '**').replace(/,(?=\d)(?![^()]*\))/g, '.');
      var rest = e.replace(/V\("[A-Z]+\d+"\)|R\("[A-Z]+\d+","[A-Z]+\d+"\)|SUM|AVERAGE|MIN|MAX|COUNT|ABS|ROUND|SQRT|PI|\*\*|[0-9.]+|[-+*\/(),]/g, '');
      if (rest !== '') return '#NOM?';
      try {
        depth++;
        var f = new Function('V', 'R', 'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ABS', 'ROUND', 'SQRT', 'PI', '"use strict";return (' + e + ');');
        var r = f(value, range, FUNCS.SUM, FUNCS.AVERAGE, FUNCS.MIN, FUNCS.MAX, FUNCS.COUNT, FUNCS.ABS, FUNCS.ROUND, FUNCS.SQRT, FUNCS.PI);
        if (typeof r === 'number') return isFinite(r) ? r : '#DIV/0!';
        return r;
      } catch (err) { return '#VALEUR!'; }
      finally { depth--; }
    }
    function display(k) {
      var v = value(k);
      if (typeof v === 'number') return String(Math.round(v * 1e8) / 1e8).replace('.', ',');
      return String(v);
    }

    /* ---- Affichage ---- */
    function paintCell(k) {
      var td = tdOf[k];
      if (!td || (editing && editing.td === td)) return;
      var raw = cells[k];
      var v = raw == null || raw === '' ? '' : display(k);
      td.textContent = v;
      td.className = td.className.replace(/\bnum\b/g, '').trim();
      if (raw != null && raw !== '' && typeof value(k) === 'number') td.classList.add('num');
    }
    function refreshAll() { Object.keys(tdOf).forEach(function (k) { if (tdOf[k].textContent || cells[k] != null) paintCell(k); }); }
    var painted = [];
    function rect() {
      return { c1: Math.min(sel.a.c, sel.b.c), c2: Math.max(sel.a.c, sel.b.c), r1: Math.min(sel.a.r, sel.b.r), r2: Math.max(sel.a.r, sel.b.r) };
    }
    function forSel(fn) {
      var R = rect();
      for (var r = R.r1; r <= R.r2; r++) for (var c = R.c1; c <= R.c2; c++) fn(colName(c) + (r + 1), c, r);
    }
    function paintSel() {
      painted.forEach(function (n) { n.classList.remove('sel', 'act'); });
      painted = [];
      var ths = tbl.querySelectorAll('th.cs'); Array.prototype.forEach.call(ths, function (t) { t.classList.remove('cs'); });
      var R = rect();
      forSel(function (k) { var td = tdOf[k]; if (td) { td.classList.add('sel'); painted.push(td); } });
      var act = tdOf[colName(sel.a.c) + (sel.a.r + 1)];
      if (act) { act.classList.remove('sel'); act.classList.add('act'); painted.push(act); }
      for (var c = R.c1; c <= R.c2; c++) { var th = tbl.querySelector('th[data-ch="' + c + '"]'); if (th) th.classList.add('cs'); }
      var single = R.c1 === R.c2 && R.r1 === R.r2;
      nameBox.value = single ? colName(sel.a.c) + (sel.a.r + 1) : (R.r2 - R.r1 + 1) + 'L x ' + (R.c2 - R.c1 + 1) + 'C';
      fx.value = cells[colName(sel.a.c) + (sel.a.r + 1)] || '';
    }
    function select(c, r) {
      c = Math.max(0, Math.min(X_COLS - 1, c)); r = Math.max(0, Math.min(X_ROWS - 1, r));
      sel.a = { c: c, r: r }; sel.b = { c: c, r: r };
      paintSel(); reveal();
    }
    function reveal(center) {
      var td = tdOf[colName(sel.a.c) + (sel.a.r + 1)];
      if (!td) return;
      var s = scroll, t = td.offsetTop, l = td.offsetLeft;
      if (center) { s.scrollTop = t - s.clientHeight / 2; s.scrollLeft = l - s.clientWidth / 2; return; }
      if (t < s.scrollTop + 17) s.scrollTop = Math.max(0, t - 17);
      else if (t + td.offsetHeight > s.scrollTop + s.clientHeight) s.scrollTop = t + td.offsetHeight - s.clientHeight;
      if (l < s.scrollLeft + 34) s.scrollLeft = Math.max(0, l - 34);
      else if (l + td.offsetWidth > s.scrollLeft + s.clientWidth) s.scrollLeft = l + td.offsetWidth - s.clientWidth;
    }

    /* ---- Saisie ---- */
    function startEdit(k, first) {
      commitEdit();
      var td = tdOf[k];
      if (!td) return;
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.value = first != null ? first : (cells[k] || '');
      td.textContent = '';
      td.appendChild(inp);
      editing = { k: k, td: td, inp: inp };
      inp.addEventListener('input', function () { fx.value = inp.value; });
      inp.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); var p = parseRef(k); commitEdit(); select(p.c, p.r + 1); o.root.focus(); }
        else if (e.key === 'Tab') { e.preventDefault(); var q = parseRef(k); commitEdit(); select(q.c + (e.shiftKey ? -1 : 1), q.r); o.root.focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); o.root.focus(); }
      });
      inp.focus();
      if (first == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
    }
    function commitEdit() {
      if (!editing) return;
      var e = editing; editing = null;
      var v = e.inp.value;
      if (v === '') delete cells[e.k]; else cells[e.k] = v;
      e.td.textContent = '';
      refreshAll();
      paintCell(e.k);
      fx.value = cells[colName(sel.a.c) + (sel.a.r + 1)] || '';
    }
    function cancelEdit() {
      if (!editing) return;
      var e = editing; editing = null;
      e.td.textContent = ''; paintCell(e.k);
    }
    fx.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') {
        var k = colName(sel.a.c) + (sel.a.r + 1);
        if (fx.value === '') delete cells[k]; else cells[k] = fx.value;
        refreshAll(); select(sel.a.c, sel.a.r + 1); o.root.focus();
      } else if (e.key === 'Escape') { fx.value = cells[colName(sel.a.c) + (sel.a.r + 1)] || ''; o.root.focus(); }
    });

    function autoSum() {
      var R = rect(), k = colName(sel.a.c) + (sel.a.r + 1);
      if (sel.a.r === 0) { cells[k] = '=SUM(A1:A1)'; }
      else {
        var r = sel.a.r - 1;
        while (r > 0 && cells[colName(sel.a.c) + r] != null && typeof value(colName(sel.a.c) + r) === 'number') r--;
        var start = (cells[colName(sel.a.c) + (r + 1)] != null ? r + 1 : sel.a.r);
        cells[k] = '=SUM(' + colName(sel.a.c) + start + ':' + colName(sel.a.c) + sel.a.r + ')';
      }
      refreshAll(); paintSel();
    }

    /* ---- Atteindre (F5) ---- */
    function gotoDialog() {
      var m = modal(o, 'Atteindre', '<div class="of-row"><label>Référence :</label><input type="text" class="g-ref" autocomplete="off"></div>', [
        { t: 'OK', def: true, fn: function (d) { return doGoto(d.querySelector('.g-ref').value); } },
        { t: 'Annuler' }
      ], { width: 300 });
      m.dlg.querySelector('.g-ref').addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); if (doGoto(e.target.value) !== false) m.close(); }
        else if (e.key === 'Escape') { m.close(); }
      });
    }
    function doGoto(txt) {
      var parts = String(txt).split(':');
      var A = parseRef(parts[0]), B = parts[1] != null ? parseRef(parts[1]) : A;
      if (!A || !B) {
        X.dialog({ title: 'Microsoft Excel', icon: 'error', text: 'La référence n\'est pas valide.', buttons: [{ label: 'OK' }] });
        return false;
      }
      sel.a = A; sel.b = B;
      paintSel(); reveal(true);
      var R = rect();
      gotoRange = R.r1 === 96 && R.r2 === 96 && R.c1 === colIdx('L') && R.c2 === colIdx('X');   // séquence officielle : X97:L97
      tabsAfterGoto = 0;
      return true;
    }

    function chartDialog() {
      X.dialog({ title: 'Assistant Graphique', icon: 'info', text: 'L\'Assistant Graphique n\'est pas disponible dans cette simulation.', buttons: [{ label: 'OK' }] });
    }

    /* ---- Clavier ---- */
    o.root.addEventListener('keydown', function (e) {
      if (editing) return;
      if (e.target !== o.root) return;
      var k = e.key, R = rect(), ctrl = e.ctrlKey || e.metaKey;
      if (k === 'F5') { e.preventDefault(); gotoDialog(); return; }
      if (k === 'Tab') {
        e.preventDefault();
        var multi = !(R.c1 === R.c2 && R.r1 === R.r2);
        if (multi) {
          var c = sel.a.c + (e.shiftKey ? -1 : 1), r = sel.a.r;
          if (c > R.c2) { c = R.c1; r++; } else if (c < R.c1) { c = R.c2; r--; }
          if (r > R.r2) r = R.r1; else if (r < R.r1) r = R.r2;
          sel.a = { c: c, r: r };
          paintSel(); reveal();
          tabsAfterGoto++;                      // séquence officielle : un seul appui sur Tab
        } else { select(sel.a.c + (e.shiftKey ? -1 : 1), sel.a.r); gotoRange = false; }
        return;
      }
      var moved = true;
      if (k === 'ArrowUp') select(sel.a.c, sel.a.r - 1);
      else if (k === 'ArrowDown') select(sel.a.c, sel.a.r + 1);
      else if (k === 'ArrowLeft') select(sel.a.c - 1, sel.a.r);
      else if (k === 'ArrowRight') select(sel.a.c + 1, sel.a.r);
      else if (k === 'Enter') select(sel.a.c, sel.a.r + (e.shiftKey ? -1 : 1));
      else if (k === 'Home') select(0, sel.a.r);
      else if (k === 'PageDown') select(sel.a.c, sel.a.r + 20);
      else if (k === 'PageUp') select(sel.a.c, sel.a.r - 20);
      else if (k === 'Delete' || k === 'Backspace') { forSel(function (key) { delete cells[key]; }); refreshAll(); paintSel(); moved = false; }
      else if (k === 'F2') { startEdit(colName(sel.a.c) + (sel.a.r + 1), null); moved = false; }
      else if (!ctrl && k.length === 1) { startEdit(colName(sel.a.c) + (sel.a.r + 1), k); e.preventDefault(); moved = false; }
      else moved = false;
      if (moved) { e.preventDefault(); gotoRange = false; tabsAfterGoto = 0; }
    });
  }

  /* ------------------------------------------------------------------
     Simulateur de vol (easter egg d'Excel 97)
     Souris : direction — clic droit : accélérer — clic gauche : ralentir — Échap : quitter
     ------------------------------------------------------------------ */
  function startFlight(o) {
    var g = el('div', 'of-game');
    var W = 320, H = 200;
    var cv = el('canvas');
    cv.width = W; cv.height = H;
    cv.style.width = '100%'; cv.style.height = '100%'; cv.style.objectFit = 'contain';
    g.appendChild(cv);
    g.appendChild(el('div', 'hint', 'Souris : diriger   Clic droit : accélérer   Clic gauche : ralentir   Flèches : diriger   Échap : quitter'));
    o.root.appendChild(g);
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), px = img.data;

    // --- Terrain (bruit de valeur) + pyramide
    var N = 256, hm = new Uint8Array(N * N), col = new Uint8Array(N * N * 3);
    var seed = 1337;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var base = [], S = 32;
    for (var i = 0; i < S * S; i++) base.push(rnd());
    function noise(x, y, f) {
      var gx = x / N * f, gy = y / N * f, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
      function b(ix, iy) { return base[((iy % S + S) % S) * S + ((ix % S + S) % S)]; }
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      return (b(x0, y0) * (1 - tx) + b(x0 + 1, y0) * tx) * (1 - ty) + (b(x0, y0 + 1) * (1 - tx) + b(x0 + 1, y0 + 1) * tx) * ty;
    }
    var PC = 128, PR = 26, PH = 64;
    function pyrH(x, y) { var d = Math.max(Math.abs(x - PC), Math.abs(y - PC)); return d <= PR ? (PR - d) * (PH / PR) : 0; }
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var h = noise(x, y, 4) * 40 + noise(x, y, 8) * 18 + noise(x, y, 16) * 8 + 8;
        var dd = Math.sqrt((x - PC) * (x - PC) + (y - PC) * (y - PC));
        if (dd < 50) { var t = Math.min(1, Math.max(0, (dd - 36) / 14)); h = 14 + (h - 14) * t; }
        var ph = pyrH(x, y);
        hm[y * N + x] = Math.min(255, h + ph);
      }
    }
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        var k = y * N + x, hh = hm[k], sh = (hm[k] - hm[((y + 1) & 255) * N + ((x + 1) & 255)]) * 5;
        var inP = Math.max(Math.abs(x - PC), Math.abs(y - PC)) <= PR;
        var r, gc, bl;
        if (inP) { r = 214; gc = 178; bl = 100; }
        else if (hh > 48) { r = 150; gc = 130; bl = 100; }
        else if (hh > 30) { r = 190; gc = 160; bl = 95; }
        else { r = 226; gc = 196; bl = 120; }
        col[k * 3] = Math.max(0, Math.min(255, r + sh));
        col[k * 3 + 1] = Math.max(0, Math.min(255, gc + sh));
        col[k * 3 + 2] = Math.max(0, Math.min(255, bl + sh));
      }
    }

    var cam = { x: 128, y: 40, h: 70, phi: Math.PI / 2, horizon: 90 }, speed = 0.5;
    var mx = 0, my = 0, btnL = false, btnR = false, keys = {}, running = true, hall = false;

    function sky(yy) { var t = yy / H; return [90 + 90 * t, 140 + 80 * t, 230 + 20 * t]; }

    function render() {
      for (var yy = 0; yy < H; yy++) {
        var s = sky(yy);
        for (var xx = 0; xx < W; xx++) { var p = (yy * W + xx) * 4; px[p] = s[0]; px[p + 1] = s[1]; px[p + 2] = s[2]; px[p + 3] = 255; }
      }
      var sin = Math.sin(cam.phi), cos = Math.cos(cam.phi);
      var ybuf = new Int16Array(W);
      for (var i = 0; i < W; i++) ybuf[i] = H;
      var dz = 1, z = 1, scale = H * 1.1;
      while (z < 130) {
        var plx = cos * z + sin * z, ply = sin * z - cos * z;
        var prx = cos * z - sin * z, pry = sin * z + cos * z;
        var dx = (prx - plx) / W, dy = (pry - ply) / W;
        plx += cam.x; ply += cam.y;
        var inv = scale / z;
        var fog = Math.min(1, z / 130);
        for (i = 0; i < W; i++) {
          var mi = ((Math.floor(ply) & 255) << 8) + (Math.floor(plx) & 255);
          var top = ((cam.h - hm[mi]) * inv + cam.horizon) | 0;
          if (top < 0) top = 0;
          if (top < ybuf[i]) {
            var r = col[mi * 3], gg = col[mi * 3 + 1], b = col[mi * 3 + 2];
            r = r + (170 - r) * fog; gg = gg + (205 - gg) * fog; b = b + (240 - b) * fog;
            for (var yy2 = top; yy2 < ybuf[i]; yy2++) { var q = (yy2 * W + i) * 4; px[q] = r; px[q + 1] = gg; px[q + 2] = b; }
            ybuf[i] = top;
          }
          plx += dx; ply += dy;
        }
        z += dz; dz += 0.03;
      }
      ctx.putImageData(img, 0, 0);
      // tableau de bord
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H - 14, W, 14);
      ctx.fillStyle = '#9f9'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
      ctx.fillText('VIT ' + (speed * 100 | 0) + '   ALT ' + (cam.h | 0), 6, H - 4);
    }

    function enterHall() {
      hall = true;
      cleanupInput();
      var cr = creditsLayer([
        'HALL OF TORTURED SOULS', '', '', 'MICROSOFT EXCEL 97', '', 'SIMULATEUR DE VOL', '',
        'Simulation pour la documentation du projet', '', '', 'Merci d\'avoir volé jusqu\'ici !', '', '', 'Échap : quitter'
      ]);
      g.appendChild(cr);
    }

    function step() {
      if (hall) return;
      var dead = 0.12;
      var tx = Math.abs(mx) < dead ? 0 : mx, ty = Math.abs(my) < dead ? 0 : my;
      if (keys.ArrowLeft) tx = -0.7; if (keys.ArrowRight) tx = 0.7;
      if (keys.ArrowUp) ty = -0.6; if (keys.ArrowDown) ty = 0.6;
      cam.phi += tx * 0.035;
      cam.horizon += ((95 - ty * 70) - cam.horizon) * 0.1;
      if (btnR || keys.PageUp) speed = Math.min(2.2, speed + 0.02);
      if (btnL || keys.PageDown) speed = Math.max(-1, speed - 0.02);
      cam.x += Math.cos(cam.phi) * speed;
      cam.y += Math.sin(cam.phi) * speed;
      cam.h += (95 - cam.horizon) * 0.02 * Math.abs(speed) * (speed < 0 ? -1 : 1) * 0.5;
      var mi = ((Math.floor(cam.y) & 255) << 8) + (Math.floor(cam.x) & 255);
      var ground = hm[mi];
      var inPyr = Math.max(Math.abs((cam.x & 255) - PC), Math.abs((cam.y & 255) - PC)) <= PR - 2 && pyrH(cam.x & 255, cam.y & 255) > 0;
      if (cam.h < ground + 3) {
        if (inPyr && cam.h > 10) { enterHall(); return; }
        cam.h = ground + 3;
      }
      if (cam.h > 200) cam.h = 200;
    }

    function cleanupInput() {
      g.removeEventListener('mousemove', onMove);
      g.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    }
    function onMove(e) {
      var r = cv.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    function onDown(e) { if (e.button === 2) btnR = true; else if (e.button === 0) btnL = true; e.preventDefault(); }
    function onUp(e) { if (e.button === 2) btnR = false; else if (e.button === 0) btnL = false; }
    function onKey(e) {
      if (!alive(g)) { stop(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); exit(); return; }
      if (e.type === 'keydown') keys[e.key] = true; else keys[e.key] = false;
      if (/^Arrow|^Page/.test(e.key)) e.preventDefault();
    }
    function stop() { running = false; cleanupInput(); document.removeEventListener('keydown', onKey, true); document.removeEventListener('keyup', onKey, true); }
    function exit() { stop(); g.remove(); try { o.root.focus(); } catch (e) {} }
    g.addEventListener('mousemove', onMove);
    g.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    g.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);

    (function loop() {
      if (!running || !alive(g)) { stop(); return; }
      step();
      if (!hall) render();
      requestAnimationFrame(loop);
    })();
  }

  /* ==================================================================
     POWERPOINT 97
     ================================================================== */
  function renderPowerPoint(w) {
    var slides = [{ t: 'Titre de la présentation', b: 'Cliquez pour ajouter du texte' }], cur = 0;
    var thumbs, title, body, stat;
    var o = chrome(w, 'of-ppt', [
      { t: 'Fichier', items: [
        { t: 'Nouveau', fn: function () { slides = [{ t: '', b: '' }]; cur = 0; renderAll(); } },
        { t: 'Enregistrer', dis: true }, '-', menuQuit(w)
      ] },
      { t: 'Edition', items: [{ t: 'Supprimer la diapositive', fn: delSlide }] },
      { t: 'Affichage', items: [{ t: 'Diaporama', key: 'F5', fn: show }] },
      { t: 'Insertion', items: [{ t: 'Nouvelle diapositive...', key: 'Ctrl+M', fn: addSlide }] },
      { t: 'Format', items: [{ t: 'Police...', dis: true }] },
      { t: 'Outils', items: [{ t: 'Orthographe...', dis: true }] },
      { t: 'Diaporama', items: [{ t: 'Visionner le diaporama', key: 'F5', fn: show }] }
    ]);
    buildExtraMenu(o, helpMenu(o, 'Microsoft PowerPoint', 'powerpoint97'));
    X.setTitle(w, 'Microsoft PowerPoint - [Présentation1]');
    toolbar(o, [
      { t: 'Nouvelle diapositive', fn: addSlide }, { t: 'Supprimer', fn: delSlide }, '-',
      { t: '&#9654; Diaporama', fn: show }
    ]);
    thumbs = el('div', 'p-side');
    var main = el('div', 'p-main');
    var sl = el('div', 'p-slide');
    title = el('div', 'p-title'); title.contentEditable = 'true';
    body = el('div', 'p-body'); body.contentEditable = 'true';
    sl.appendChild(title); sl.appendChild(body); main.appendChild(sl);
    o.client.appendChild(thumbs); o.client.appendChild(main);
    o.status.innerHTML = '<span></span>';
    stat = o.status.firstChild;
    title.addEventListener('input', function () { slides[cur].t = title.innerText; paintThumbs(); });
    body.addEventListener('input', function () { slides[cur].b = body.innerText; paintThumbs(); });
    function paintThumbs() {
      thumbs.innerHTML = slides.map(function (s, i) {
        return '<div class="p-th' + (i === cur ? ' on' : '') + '" data-i="' + i + '"><b>' + (i + 1) + '</b><div style="text-align:center;font-weight:bold;margin-top:8px">' + esc(s.t) + '</div></div>';
      }).join('');
      stat.textContent = 'Diapositive ' + (cur + 1) + ' sur ' + slides.length;
    }
    thumbs.addEventListener('click', function (e) { var t = e.target.closest('.p-th'); if (t) { cur = +t.getAttribute('data-i'); renderAll(); } });
    function renderAll() { title.textContent = slides[cur].t; body.textContent = slides[cur].b; paintThumbs(); }
    function addSlide() { slides.splice(cur + 1, 0, { t: 'Nouvelle diapositive', b: '' }); cur++; renderAll(); }
    function delSlide() { if (slides.length > 1) { slides.splice(cur, 1); cur = Math.max(0, cur - 1); renderAll(); } }
    function show() {
      var i = cur;
      var layer = el('div', 'p-show');
      o.root.appendChild(layer);
      function paint() {
        if (i >= slides.length) { layer.innerHTML = '<div style="color:#fff;font:16px Arial">Fin du diaporama. Cliquez pour quitter.</div>'; return; }
        layer.innerHTML = '<div class="p-slide"><div class="p-title">' + esc(slides[i].t) + '</div><div class="p-body">' + esc(slides[i].b) + '</div></div>';
      }
      function next() { if (i >= slides.length) { quit(); return; } i++; paint(); }
      function quit() { document.removeEventListener('keydown', key, true); layer.remove(); renderAll(); o.root.focus(); }
      function key(e) {
        if (!alive(layer)) { document.removeEventListener('keydown', key, true); return; }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); quit(); }
        else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); if (i > 0) { i--; paint(); } }
      }
      layer.addEventListener('click', next);
      document.addEventListener('keydown', key, true);
      paint();
    }
    o.root.addEventListener('keydown', function (e) { if (e.key === 'F5' && e.target === o.root) { e.preventDefault(); show(); } });
    renderAll();
  }

  /* ==================================================================
     ACCESS 97
     ================================================================== */
  function renderAccess(w) {
    var DB = {
      Membres: { cols: ['N°', 'Nom', 'Rôle'], rows: [[1, 'Membre 1', 'Chef de projet'], [2, 'Membre 2', 'Conception'], [3, 'Membre 3', 'Fabrication'], [4, 'Membre 4', 'Programmation'], [5, 'Membre 5', 'Documentation']] },
      Tests: { cols: ['Essai', 'Déchet réel', 'Détection', 'Correct'], rows: [[1, 'Plastique', 'Plastique', 'Oui'], [2, 'Verre', 'Métal', 'Non']] }
    };
    var tab = 'Tables', openT = null;
    var o = chrome(w, 'of-access', [
      { t: 'Fichier', items: [{ t: 'Nouvelle base de données...', dis: true }, '-', menuQuit(w)] },
      { t: 'Edition', items: [{ t: 'Annuler', dis: true }] },
      { t: 'Affichage', items: [{ t: 'Feuille de données', dis: true }] },
      { t: 'Insertion', items: [{ t: 'Enregistrement', fn: function () { if (openT) { DB[openT].rows.push(DB[openT].cols.map(function () { return ''; })); paint(); } } }] },
      { t: 'Outils', items: [{ t: 'Relations...', dis: true }] },
      { t: 'Fenêtre', items: [{ t: 'Base de données', dis: true }] }
    ]);
    buildExtraMenu(o, helpMenu(o, 'Microsoft Access', 'access97'));
    X.setTitle(w, 'Microsoft Access - [Projet : Base de données]');
    toolbar(o, [
      { t: 'Ouvrir', fn: function () { var s = o.client.querySelector('.a-item.on'); if (s && tab === 'Tables') { openT = s.getAttribute('data-t'); paint(); } } },
      { t: 'Retour à la base', fn: function () { openT = null; paint(); } }
    ]);
    var box = el('div');
    box.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0';
    o.client.style.background = '#c0c0c0';
    o.client.appendChild(box);
    o.status.innerHTML = '<span>Prêt</span>';
    function paint() {
      if (openT) {
        var t = DB[openT];
        X.setTitle(w, 'Microsoft Access - [' + openT + ' : Table]');
        box.innerHTML = '<div class="a-list"><table class="a-sheet"><tr>' + t.cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' +
          t.rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td contenteditable="true">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
        o.status.firstChild.textContent = 'Enregistrement : ' + t.rows.length;
        return;
      }
      X.setTitle(w, 'Microsoft Access - [Projet : Base de données]');
      var tabs = ['Tables', 'Requêtes', 'Formulaires', 'États', 'Macros', 'Modules'];
      var items = tab === 'Tables' ? Object.keys(DB).map(function (n) { return '<div class="a-item" data-t="' + n + '">&#9638; ' + n + '</div>'; }).join('') : '<div style="padding:6px;color:#808080">(vide)</div>';
      box.innerHTML = '<div class="a-tabs">' + tabs.map(function (t) { return '<div class="a-tab' + (t === tab ? ' on' : '') + '" data-tab="' + t + '">' + t + '</div>'; }).join('') + '</div><div class="a-list">' + items + '</div>';
      o.status.firstChild.textContent = 'Prêt';
    }
    box.addEventListener('click', function (e) {
      var t = e.target.closest('.a-tab'); if (t) { tab = t.getAttribute('data-tab'); paint(); return; }
      var it = e.target.closest('.a-item'); if (it) { Array.prototype.forEach.call(box.querySelectorAll('.a-item'), function (x) { x.classList.remove('on'); }); it.classList.add('on'); }
    });
    box.addEventListener('dblclick', function (e) { var it = e.target.closest('.a-item'); if (it && tab === 'Tables') { openT = it.getAttribute('data-t'); paint(); } });
    paint();
  }

  /* ==================================================================
     OUTLOOK 97
     ================================================================== */
  function renderOutlook(w) {
    var folders = {
      'Boîte de réception': [
        { from: 'Équipe Makerspace', sub: 'Bienvenue dans Outlook 97', date: '01/10/1997', unread: true, body: 'Bonjour,\n\nCeci est une simulation d\'Outlook 97 réalisée pour la documentation du projet.\n\nCordialement,\nL\'équipe' },
        { from: 'Groupe 06', sub: 'Prochaine séance', date: '02/10/1997', unread: true, body: 'N\'oubliez pas de mettre à jour le journal de bord après chaque séance.' }
      ],
      'Éléments envoyés': [], 'Éléments supprimés': [], 'Brouillons': []
    };
    var cur = 'Boîte de réception', sel = -1, list, prev, fold;
    var o = chrome(w, 'of-outlook', [
      { t: 'Fichier', items: [{ t: 'Nouveau message', key: 'Ctrl+N', fn: compose }, '-', menuQuit(w)] },
      { t: 'Edition', items: [{ t: 'Supprimer', key: 'Suppr', fn: del }] },
      { t: 'Affichage', items: [{ t: 'Volet de visualisation', dis: true }] },
      { t: 'Outils', items: [{ t: 'Envoyer/Recevoir', fn: function () { X.dialog({ title: 'Microsoft Outlook', icon: 'info', text: 'Aucun nouveau message.', buttons: [{ label: 'OK' }] }); } }] },
      { t: 'Message', items: [{ t: 'Nouveau message', fn: compose }] }
    ]);
    buildExtraMenu(o, helpMenu(o, 'Microsoft Outlook', 'outlook97'));
    X.setTitle(w, 'Boîte de réception - Microsoft Outlook');
    toolbar(o, [{ t: 'Nouveau message', fn: compose }, { t: 'Supprimer', fn: del }, '-', { t: 'Envoyer/Recevoir', fn: function () {} }]);
    fold = el('div', 'o-folders');
    var right = el('div', 'o-right');
    list = el('div', 'o-list'); prev = el('div', 'o-prev');
    right.appendChild(list); right.appendChild(prev);
    o.client.appendChild(fold); o.client.appendChild(right);
    o.status.innerHTML = '<span></span>';
    function paint() {
      fold.innerHTML = Object.keys(folders).map(function (f) { return '<div class="o-fold' + (f === cur ? ' on' : '') + '" data-f="' + f + '">&#128193; ' + f + '</div>'; }).join('');
      var ms = folders[cur];
      list.innerHTML = '<table><tr><th>De</th><th>Objet</th><th>Reçu</th></tr>' + ms.map(function (m, i) {
        return '<tr class="' + (m.unread ? 'unread ' : '') + (i === sel ? 'on' : '') + '" data-i="' + i + '"><td>' + esc(m.from) + '</td><td>' + esc(m.sub) + '</td><td>' + m.date + '</td></tr>';
      }).join('') + '</table>';
      prev.textContent = sel >= 0 && ms[sel] ? ms[sel].body : '';
      o.status.firstChild.textContent = ms.length + ' élément(s)';
      X.setTitle(w, cur + ' - Microsoft Outlook');
    }
    fold.addEventListener('click', function (e) { var f = e.target.closest('.o-fold'); if (f) { cur = f.getAttribute('data-f'); sel = -1; paint(); } });
    list.addEventListener('click', function (e) { var r = e.target.closest('tr[data-i]'); if (r) { sel = +r.getAttribute('data-i'); folders[cur][sel].unread = false; paint(); } });
    function del() { if (sel >= 0) { var m = folders[cur].splice(sel, 1)[0]; if (cur !== 'Éléments supprimés') folders['Éléments supprimés'].push(m); sel = -1; paint(); } }
    function compose() {
      modal(o, 'Message sans titre', '<div class="of-row"><label>À :</label><input type="text" class="m-to"></div><div class="of-row"><label>Objet :</label><input type="text" class="m-sub"></div><div class="of-row"><textarea class="m-body" rows="7"></textarea></div>', [
        { t: 'Envoyer', def: true, fn: function (d) {
          folders['Éléments envoyés'].push({ from: 'Moi', sub: d.querySelector('.m-sub').value || '(sans objet)', date: new Date().toLocaleDateString('fr-FR'), body: d.querySelector('.m-body').value });
          paint();
          X.playSound('ding');
        } },
        { t: 'Annuler' }
      ], { width: 420 });
    }
    paint();
  }

  /* ------------------------------------------------------------------
     Enregistrement des applications auprès d'xp-mode.js
     ------------------------------------------------------------------ */
  X.APPS.word = { title: 'Document1 - Microsoft Word', render: renderWord };
  X.APPS.excel = { title: 'Microsoft Excel - Classeur1', render: renderExcel };
  X.APPS.powerpoint = { title: 'Microsoft PowerPoint - [Présentation1]', render: renderPowerPoint };
  X.APPS.access = { title: 'Microsoft Access', render: renderAccess };
  X.APPS.outlook = { title: 'Boîte de réception - Microsoft Outlook', render: renderOutlook };

  window.XPOffice = true;
})();
