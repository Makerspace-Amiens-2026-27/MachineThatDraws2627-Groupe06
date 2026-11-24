/* À placer dans : assets/js/screensaver.js
   Écrans de veille Windows : « Tuyaux 3D » et « Labyrinthe 3D ».
   Chargé à la demande par xp-mode.js. Utilise three.js (chargé depuis cdnjs, avec repli sur jsDelivr).
   API : XPSaver.start('pipes' | 'maze', onExit) ; XPSaver.stop() ; XPSaver.running() */
(function () {
  'use strict';
  if (window.XPSaver) return;

  var THREE_SRC = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ];
  var threeQueue = null;
  function loadThree(cb, fail) {
    if (window.THREE) { cb(); return; }
    if (threeQueue) { threeQueue.push([cb, fail]); return; }
    threeQueue = [[cb, fail]];
    var i = 0;
    (function next() {
      if (i >= THREE_SRC.length) { var q = threeQueue; threeQueue = null; q.forEach(function (p) { if (p[1]) p[1](); }); return; }
      var s = document.createElement('script');
      s.src = THREE_SRC[i++];
      s.onload = function () { var q = threeQueue; threeQueue = null; q.forEach(function (p) { p[0](); }); };
      s.onerror = next;
      document.head.appendChild(s);
    })();
  }

  var cur = null;     // économiseur en cours

  function stop() {
    if (!cur) return;
    var c = cur; cur = null;
    c.dead = true;
    cancelAnimationFrame(c.raf);
    ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'contextmenu'].forEach(function (ev) { window.removeEventListener(ev, c.onInput, true); });
    window.removeEventListener('resize', c.onResize);
    try { if (c.scene) c.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); } catch (e) {}
    try { c.renderer.dispose(); } catch (e) {}
    if (c.root.parentNode) c.root.parentNode.removeChild(c.root);
    if (c.onExit) { try { c.onExit(); } catch (e) {} }
  }

  function start(type, onExit) {
    if (cur) return;
    var c = cur = { dead: false, onExit: onExit, t0: Date.now(), mx: null, my: null };

    var root = c.root = document.createElement('div');
    root.id = 'xp-saver';
    root.style.cssText = 'position:fixed;inset:0;z-index:90000000;background:#000;cursor:none;overflow:hidden;';
    (document.getElementById('xp-desktop-environment') || document.body).appendChild(root);   // dans l'environnement XP (le reste du site est masqué)

    c.onInput = function (e) {
      if (Date.now() - c.t0 < 500) return;           // on laisse passer les événements qui ont déclenché le lancement
      if (e.type === 'mousemove') {
        if (c.mx === null) { c.mx = e.clientX; c.my = e.clientY; return; }
        if (Math.abs(e.clientX - c.mx) + Math.abs(e.clientY - c.my) < 6) return;
      }
      e.stopPropagation();
      if (e.type !== 'mousemove') e.preventDefault();
      stop();
    };
    ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'contextmenu'].forEach(function (ev) { window.addEventListener(ev, c.onInput, true); });

    loadThree(function () {
      if (c.dead) return;
      try { build(c, type); } catch (err) { console.error(err); stop(); }
    }, function () { stop(); });
  }

  function build(c, type) {
    var T = window.THREE;
    var W = window.innerWidth, H = window.innerHeight;
    var renderer = c.renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 1);
    c.root.appendChild(renderer.domElement);
    var scene = c.scene = new T.Scene();
    var camera = new T.PerspectiveCamera(60, W / H, 0.05, 200);
    c.onResize = function () {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', c.onResize);

    var tick = (type === 'maze' ? mazeScene : pipesScene)(T, scene, camera);
    var last = performance.now();
    (function loop(now) {
      if (c.dead) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      tick(dt);
      renderer.render(scene, camera);
      c.raf = requestAnimationFrame(loop);
    })(last);
  }

  /* ============================== TUYAUX 3D ============================== */
  function pipesScene(T, scene, camera) {
    var N = 9, S = 1.5, R = 0.2, RJ = 0.3, GROW = 0.18;       // grille N³, pas S, rayon du tuyau / de la rotule, durée de pousse (s)
    scene.add(new T.AmbientLight(0xffffff, 0.35));
    var l1 = new T.DirectionalLight(0xffffff, 0.9); l1.position.set(5, 8, 6); scene.add(l1);
    var l2 = new T.DirectionalLight(0xffffff, 0.35); l2.position.set(-6, -3, -5); scene.add(l2);

    var group = new T.Group(); scene.add(group);
    var DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    var cylGeo = new T.CylinderGeometry(R, R, S, 16, 1, true), sphGeo = new T.SphereGeometry(RJ, 20, 14);
    var up = new T.Vector3(0, 1, 0);
    var occ, pipe, pipes, anim;

    function key(x, y, z) { return x + ',' + y + ',' + z; }
    function world(g) { return new T.Vector3((g[0] - (N - 1) / 2) * S, (g[1] - (N - 1) / 2) * S, (g[2] - (N - 1) / 2) * S); }
    function clearAll() {
      for (var i = group.children.length - 1; i >= 0; i--) {
        var o = group.children[i]; group.remove(o); if (o.material && o.material.dispose) o.material.dispose();
      }
      occ = {}; pipes = 0; pipe = null; anim = null;
    }
    function newPipe() {
      var tries = 0, g;
      do { g = [rnd(N), rnd(N), rnd(N)]; } while (occ[key(g[0], g[1], g[2])] && ++tries < 40);
      if (occ[key(g[0], g[1], g[2])]) { clearAll(); g = [rnd(N), rnd(N), rnd(N)]; }
      occ[key(g[0], g[1], g[2])] = 1;
      var col = new T.Color().setHSL(Math.random(), 0.85, 0.5);
      pipe = { g: g, dir: DIRS[rnd(6)], len: 0, max: 25 + rnd(45),
        mat: new T.MeshPhongMaterial({ color: col, specular: 0xffffff, shininess: 90, side: T.DoubleSide }) };
      addSphere(world(g));
      pipes++;
    }
    function addSphere(p) {
      var m = new T.Mesh(sphGeo, pipe.mat); m.position.copy(p); group.add(m);
    }
    function nextDir() {
      var opts = [], i, d;
      if (Math.random() < 0.6) opts.push(pipe.dir);
      for (i = 0; i < 6; i++) opts.push(DIRS[i]);
      for (i = 0; i < opts.length; i++) {
        d = opts[i];
        var x = pipe.g[0] + d[0], y = pipe.g[1] + d[1], z = pipe.g[2] + d[2];
        if (x < 0 || y < 0 || z < 0 || x >= N || y >= N || z >= N || occ[key(x, y, z)]) continue;
        if (d[0] === -pipe.dir[0] && d[1] === -pipe.dir[1] && d[2] === -pipe.dir[2] && pipe.len > 0) continue;
        return d;
      }
      return null;
    }
    function startSegment() {
      var d = nextDir();
      if (!d) { addSphere(world(pipe.g)); pipe = null; return false; }
      if (d !== pipe.dir && pipe.len > 0) addSphere(world(pipe.g));       // rotule à chaque coude
      pipe.dir = d;
      var a = world(pipe.g);
      pipe.g = [pipe.g[0] + d[0], pipe.g[1] + d[1], pipe.g[2] + d[2]];
      occ[key(pipe.g[0], pipe.g[1], pipe.g[2])] = 1;
      var m = new T.Mesh(cylGeo, pipe.mat);
      m.quaternion.setFromUnitVectors(up, new T.Vector3(d[0], d[1], d[2]));
      m.scale.y = 0.001; group.add(m);
      anim = { mesh: m, from: a, d: new T.Vector3(d[0], d[1], d[2]), t: 0 };
      pipe.len++;
      return true;
    }

    clearAll();
    var ang = Math.random() * 6.28, wait = 0;
    return function (dt) {
      ang += dt * 0.12;
      camera.position.set(Math.cos(ang) * 13, 5 + Math.sin(ang * 0.7) * 3, Math.sin(ang) * 13);
      camera.lookAt(0, 0, 0);
      if (wait > 0) { wait -= dt; return; }
      if (anim) {
        anim.t += dt / GROW;
        var g = Math.min(1, anim.t);
        anim.mesh.scale.y = Math.max(0.001, g);
        anim.mesh.position.copy(anim.from).addScaledVector(anim.d, S * g / 2);
        if (g >= 1) anim = null;
        return;
      }
      if (!pipe) {
        if (pipes >= 7) { wait = 1.2; clearAll(); return; }
        newPipe();
      }
      if (pipe.len >= pipe.max) { addSphere(world(pipe.g)); pipe = null; return; }
      startSegment();
    };
  }
  function rnd(n) { return Math.floor(Math.random() * n); }

  /* ============================== LABYRINTHE 3D ============================== */
  function canvasTex(T, w, h, draw, rx, ry) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    var t = new T.CanvasTexture(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    if (t.anisotropy !== undefined) t.anisotropy = 4;
    return t;
  }
  function noise(ctx, w, h, amt) {
    var id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (var i = 0; i < d.length; i += 4) { var n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(id, 0, 0);
  }

  function mazeScene(T, scene, camera) {
    var CW = 12, CH = 12, GW = CW * 2 + 1, GH = CH * 2 + 1;   // cellules / grille (murs inclus)
    var grid = [], x, y;
    for (y = 0; y < GH; y++) { grid.push([]); for (x = 0; x < GW; x++) grid[y].push(1); }
    // Génération (parcours en profondeur)
    var st = [[1, 1]]; grid[1][1] = 0;
    while (st.length) {
      var p = st[st.length - 1], nb = [];
      [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(function (d) {
        var nx = p[0] + d[0], ny = p[1] + d[1];
        if (nx > 0 && ny > 0 && nx < GW - 1 && ny < GH - 1 && grid[ny][nx]) nb.push([nx, ny, d]);
      });
      if (!nb.length) { st.pop(); continue; }
      var q = nb[rnd(nb.length)];
      grid[p[1] + q[2][1] / 2][p[0] + q[2][0] / 2] = 0; grid[q[1]][q[0]] = 0;
      st.push([q[0], q[1]]);
    }
    // quelques passages supplémentaires pour avoir des boucles (comme l'original)
    for (var k = 0; k < 14; k++) { var rx = 2 + rnd(GW - 4), ry = 2 + rnd(GH - 4); if (grid[ry][rx] && ((rx & 1) !== (ry & 1))) grid[ry][rx] = 0; }

    var brick = canvasTex(T, 128, 128, function (ctx, w, h) {
      ctx.fillStyle = '#4a2a1c'; ctx.fillRect(0, 0, w, h);
      var rows = 8, bh = h / rows, bw = w / 2;
      for (var r = 0; r < rows; r++) for (var cx = -1; cx < 3; cx++) {
        var ox = (r % 2) * (bw / 2), bx = cx * bw - ox;
        var sh = 120 + rnd(60);
        ctx.fillStyle = 'rgb(' + sh + ',' + (sh * 0.42 | 0) + ',' + (sh * 0.3 | 0) + ')';
        ctx.fillRect(bx + 2, r * bh + 2, bw - 4, bh - 4);
      }
      noise(ctx, w, h, 30);
    });
    var floor = canvasTex(T, 128, 128, function (ctx, w, h) {
      ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#6a6a6a'; ctx.fillRect(0, 0, w / 2, h / 2); ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
      ctx.strokeStyle = '#555'; ctx.strokeRect(0, 0, w, h);
      noise(ctx, w, h, 26);
    }, GW, GH);
    var ceil = canvasTex(T, 64, 64, function (ctx, w, h) {
      ctx.fillStyle = '#243a6b'; ctx.fillRect(0, 0, w, h); noise(ctx, w, h, 20);
    }, GW / 2, GH / 2);

    var wallMat = new T.MeshPhongMaterial({ map: brick, shininess: 5 });
    var geo = new T.BoxGeometry(1, 1, 1);
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) if (grid[y][x]) {
      var m = new T.Mesh(geo, wallMat); m.position.set(x + 0.5, 0.5, y + 0.5); scene.add(m);
    }
    var fl = new T.Mesh(new T.PlaneGeometry(GW, GH), new T.MeshPhongMaterial({ map: floor }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(GW / 2, 0, GH / 2); scene.add(fl);
    var ce = new T.Mesh(new T.PlaneGeometry(GW, GH), new T.MeshPhongMaterial({ map: ceil }));
    ce.rotation.x = Math.PI / 2; ce.position.set(GW / 2, 1, GH / 2); scene.add(ce);

    scene.fog = new T.Fog(0x000000, 1.5, 9);
    scene.add(new T.AmbientLight(0xffffff, 0.35));
    var lamp = new T.PointLight(0xfff2cc, 1.1, 8); scene.add(lamp);
    camera.fov = 70; camera.near = 0.03; camera.updateProjectionMatrix();

    // Navigation automatique
    var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];                // N E S O ; yaw = -dir * 90°
    var cx = 1, cy = 1, dir = 1, state = 'turn', prog = 0, yaw = 0, yawFrom = 0, yawTo = 0, bob = 0;
    // départ : une cellule libre aléatoire
    do { cx = 1 + 2 * rnd(CW); cy = 1 + 2 * rnd(CH); } while (grid[cy][cx]);
    dir = rnd(4); yaw = yawFrom = yawTo = -dir * Math.PI / 2;
    var nx0 = 0, ny0 = 0;
    function open(x2, y2) { return grid[y2] && grid[y2][x2] === 0; }
    function choose() {
      var opts = [], i;
      for (i = 0; i < 4; i++) {
        if (i === (dir + 2) % 4) continue;
        if (open(cx + DIRS[i][0], cy + DIRS[i][1])) opts.push(i);
      }
      if (!opts.length) return (dir + 2) % 4;                      // cul-de-sac : demi-tour
      if (opts.indexOf(dir) >= 0 && Math.random() < 0.6) return dir;
      return opts[rnd(opts.length)];
    }
    function beginTurn(nd) {
      yawFrom = yaw;
      var diff = (-nd * Math.PI / 2) - yaw;
      while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
      yawTo = yaw + diff; dir = nd; prog = 0; state = 'turn';
    }
    beginTurn(choose());

    return function (dt) {
      var px = cx + 0.5, pz = cy + 0.5;
      if (state === 'turn') {
        prog += dt / 0.55;
        var e = Math.min(1, prog); e = e * e * (3 - 2 * e);
        yaw = yawFrom + (yawTo - yawFrom) * e;
        if (prog >= 1) { yaw = yawTo; state = 'move'; prog = 0; nx0 = cx; ny0 = cy; }
      } else {
        prog += dt * 1.5;                                         // 1,5 case par seconde
        bob += dt * 7;
        var fx = DIRS[dir][0], fy = DIRS[dir][1], t = Math.min(1, prog);
        px = nx0 + 0.5 + fx * t; pz = ny0 + 0.5 + fy * t;
        if (prog >= 1) { cx = nx0 + fx; cy = ny0 + fy; beginTurn(choose()); px = cx + 0.5; pz = cy + 0.5; }
      }
      camera.position.set(px, 0.5 + Math.sin(bob) * 0.012, pz);
      camera.rotation.set(0, yaw, 0, 'YXZ');
      lamp.position.copy(camera.position);
    };
  }

  window.XPSaver = { start: start, stop: stop, running: function () { return !!cur; } };
})();
