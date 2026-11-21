/**
 * May Harvest Corporation - Employee Masterlist & Clearance Management System
 * Real-Time 2-Way Cloud Sync & Offline Engine (v1.0)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ems_v2';
  const SYNC_ENDPOINT = '/api/sync';
  const HEALTH_ENDPOINT = '/api/health';
  const SYNC_INTERVAL_MS = 25000;
  const DEBOUNCE_MS = 800;

  let isSyncing = false;
  let syncTimeout = null;
  let isServerOnline = false;

  // Intercept localStorage.setItem
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    if (key === STORAGE_KEY) {
      schedulePushSync();
    }
  };

  function schedulePushSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(pushLocalChangesToServer, DEBOUNCE_MS);
  }

  async function pushLocalChangesToServer() {
    if (isSyncing) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      isSyncing = true;
      const res = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setCloudStatus(true, 'Cloud synchronized');
      }
    } catch (e) {
      setCloudStatus(false, 'Offline / local mode');
    } finally {
      isSyncing = false;
    }
  }

  async function pullServerChangesToLocal() {
    if (isSyncing) return;
    try {
      const res = await fetch(SYNC_ENDPOINT, { method: 'GET' });
      if (!res.ok) throw new Error('Sync endpoint failed');
      const json = await res.json();
      if (!json || !json.data) return;

      const incoming = json.data;
      const localRaw = localStorage.getItem(STORAGE_KEY);
      let local = {};
      try { if (localRaw) local = JSON.parse(localRaw); } catch (_) {}

      // Compare update timestamp
      const incomingTime = new Date(incoming.lastUpdated || 0).getTime();
      const localTime = new Date(local.lastUpdated || 0).getTime();

      if (incomingTime > localTime) {
        origSetItem(STORAGE_KEY, JSON.stringify(incoming));
        setCloudStatus(true, 'Updated from cloud');
        if (typeof window.mhcReloadAll === 'function') {
          window.mhcReloadAll();
        } else if (typeof render === 'function' && typeof user !== 'undefined' && user) {
          render();
        }
      } else {
        setCloudStatus(true, 'Cloud synchronized');
      }
    } catch (e) {
      setCloudStatus(false, 'Offline / local mode');
    }
  }

  function setCloudStatus(online, text) {
    isServerOnline = online;
    let badge = document.getElementById('mhcCloudBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'mhcCloudBadge';
      badge.style.position = 'fixed';
      badge.style.bottom = '12px';
      badge.style.right = '12px';
      badge.style.padding = '4px 10px';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '600';
      badge.style.borderRadius = '99px';
      badge.style.zIndex = '9999';
      badge.style.transition = 'all 0.3s ease';
      badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      document.body.appendChild(badge);
    }

    if (online) {
      badge.style.background = '#ecfdf5';
      badge.style.color = '#065f46';
      badge.style.border = '1px solid #10b981';
      badge.innerHTML = '🟢 ' + (text || 'Cloud Connected');
    } else {
      badge.style.background = '#fef2f2';
      badge.style.color = '#991b1b';
      badge.style.border = '1px solid #f87171';
      badge.innerHTML = '🟠 ' + (text || 'Offline Mode');
    }
  }

  // Initial pull and periodic poll
  setTimeout(pullServerChangesToLocal, 1000);
  setInterval(pullServerChangesToLocal, SYNC_INTERVAL_MS);

})();
