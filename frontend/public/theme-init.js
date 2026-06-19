// Theme bootstrap — runs before paint to avoid a flash of the wrong theme.
// Kept as an external same-origin file so the Content-Security-Policy can use a
// strict script-src ('self') with no 'unsafe-inline'.
(function () {
  var stored = null;
  try { stored = localStorage.getItem('loopsy-theme'); } catch { /* private mode */ }
  var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();
