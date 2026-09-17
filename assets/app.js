'use strict';
document.getElementById('version')?.addEventListener('change', event => {
  const target = new URL(event.target.value, location.href);
  target.hash = location.hash;
  location.assign(target.href);
});
document.getElementById('print')?.addEventListener('click', () => window.print());
