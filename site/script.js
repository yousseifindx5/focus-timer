(function () {
  var REPO = 'yousseifindx5/focus-timer';
  var root = document.documentElement;

  // dark / light mode
  var themeBtn = document.getElementById('theme');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ft-theme', next); } catch (e) {}
  });

  // mobile menu
  var menu = document.getElementById('menu');
  var links = document.getElementById('links');
  if (menu && links) menu.addEventListener('click', function () { links.classList.toggle('open'); });
  if (links) links.addEventListener('click', function () { links.classList.remove('open'); });

  // screenshot tabs
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('on'); });
      document.querySelectorAll('.pane').forEach(function (p) { p.classList.remove('on'); });
      tab.classList.add('on');
      document.getElementById('pane-' + tab.dataset.tab).classList.add('on');
    });
  });

  // GitHub data (cached for 10 minutes to stay under the API rate limit)
  function getJSON(url, key) {
    try {
      var c = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (c && Date.now() - c.t < 600000) return Promise.resolve(c.d);
    } catch (e) {}
    return fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
        return d;
      });
  }

  getJSON('https://api.github.com/repos/' + REPO, 'ft-repo').then(function (r) {
    var el = document.getElementById('stars');
    if (el && typeof r.stargazers_count === 'number') el.textContent = r.stargazers_count;
  }).catch(function () {
    var el = document.getElementById('stars');
    if (el) el.style.display = 'none';
  });

  // the Download buttons point straight to the installer (not the portable build)
  getJSON('https://api.github.com/repos/' + REPO + '/releases/latest', 'ft-release').then(function (rel) {
    var assets = rel.assets || [];
    var setup = assets.filter(function (a) { return /setup.*\.exe$/i.test(a.name); })[0];
    var portable = assets.filter(function (a) { return /portable.*\.exe$/i.test(a.name); })[0];
    if (setup) document.querySelectorAll('[data-dl]').forEach(function (a) { a.href = setup.browser_download_url; });
    if (portable) document.querySelectorAll('[data-portable]').forEach(function (a) { a.href = portable.browser_download_url; });
    document.querySelectorAll('[data-version]').forEach(function (e) { e.textContent = 'Version ' + String(rel.tag_name).replace(/^v/, ''); });
    if (setup) document.querySelectorAll('[data-size]').forEach(function (e) { e.textContent = ' (' + Math.round(setup.size / 1048576) + ' MB)'; });
  }).catch(function () {});
})();
