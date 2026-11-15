'use strict';

const retry = document.getElementById('retry');
if (retry && location.pathname !== '/pwa-offline.html') {
  retry.addEventListener('click', () => location.reload());
  retry.hidden = false;
}
