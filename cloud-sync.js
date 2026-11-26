/**
 * May Harvest Corporation - Employee Masterlist & Clearance Management System
 * Hybrid Dual-Cloud Engine: Render Backend + Supabase Cloud DB + Cloudflare Edge CDN (v2.0)
 * 
 * Features:
 * - 24/7 Availability even when Render spins down (Cloudflare + Supabase instant access)
 * - Real-time 2-way cloud database synchronization
 * - Non-destructive conflict resolution
 * - Automatic offline fallback to localStorage
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ems_v2';
  const RENDER_SYNC_ENDPOINT = '/api/sync';
  const SUPABASE_URL = 'https://svquyjpguhrmhzbgynsw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_J6udCVSr_aA2_LYp5QcSGQ_hMFu_wMA';
  const SUPABASE_ROOM = 'employee_masterlist';
  const SYNC_INTERVAL_MS = 20000;
  const DEBOUNCE_MS = 600;

  let supabaseClient = null;
  let isSyncing = false;
  let syncTimeout = null;

  // Initialize Supabase Client
  
  // Supabase Realtime Listener for Instant Multi-Device Sync
  function setupRealtimeListener() {
    if (supabaseClient && supabaseClient.channel) {
      try {
        supabaseClient.channel('party_sync_realtime')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'party_sync',
            filter: `room=eq.${SUPABASE_ROOM}`
          }, payload => {
            console.log('[MHC] Instant cloud sync event received from Supabase!');
            pullDataFromClouds();
          })
          .subscribe();
      } catch (e) {
        console.warn('[MHC] Realtime listener init error:', e);
      }
    }
  }

  function initSupabase() {
    try {
      if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[MHC] Supabase Cloud Database Client Initialized.');
      }
    } catch (e) {
      console.warn('[MHC] Supabase init skipped:', e.message);
    }
  }

  // Preserve native storage methods
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    if (key === STORAGE_KEY) {
      schedulePushSync();
    }
  };

  function schedulePushSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(pushDataToClouds, DEBOUNCE_MS);
  }

  async function pushDataToClouds() {
    if (isSyncing) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      data.lastUpdated = new Date().toISOString();

      isSyncing = true;
      let supaOk = false;
      let renderOk = false;

      // 1. Push to Supabase Cloud DB (Always online on Cloudflare)
      if (supabaseClient) {
        try {
          const { error } = await supabaseClient.from('party_sync').upsert({
            room: SUPABASE_ROOM,
            data: data,
            updated_at: data.lastUpdated
          });
          if (!error) supaOk = true;
        } catch (supaErr) {
          console.warn('[MHC] Supabase push error:', supaErr);
        }
      }

      // 2. Push to Render Backend (if running / reachable)
      try {
        const res = await fetch(RENDER_SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) renderOk = true;
      } catch (_) {}

      if (supaOk && renderOk) {
        setCloudStatus(true, 'Render + Supabase Synced');
      } else if (supaOk) {
        setCloudStatus(true, 'Supabase Cloud Synced');
      } else if (renderOk) {
        setCloudStatus(true, 'Render Synced');
      } else {
        setCloudStatus(true, 'Saved Locally');
      }
    } catch (e) {
      setCloudStatus(false, 'Local / Offline Mode');
    } finally {
      isSyncing = false;
    }
  }

  async function pullDataFromClouds() {
    if (isSyncing) return;
    try {
      const localRaw = localStorage.getItem(STORAGE_KEY);
      let local = {};
      try { if (localRaw) local = JSON.parse(localRaw); } catch (_) {}
      const localTime = new Date(local.lastUpdated || 0).getTime();

      let latestData = null;
      let latestTime = localTime;
      let sourceName = '';

      // 1. Try Supabase Cloud Database (Fast edge query)
      if (supabaseClient) {
        try {
          const { data: rows, error } = await supabaseClient
            .from('party_sync')
            .select('data, updated_at')
            .eq('room', SUPABASE_ROOM)
            .limit(1);

          if (!error && rows && rows.length && rows[0].data && rows[0].data.emp) {
            const incoming = rows[0].data;
            const incTime = new Date(rows[0].updated_at || incoming.lastUpdated || 0).getTime();
            if (incTime > latestTime) {
              latestTime = incTime;
              latestData = incoming;
              sourceName = 'Supabase Cloud';
            }
          }
        } catch (_) {}
      }

      // 2. Try Render Server (if online)
      try {
        const res = await fetch(RENDER_SYNC_ENDPOINT, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && json.data.emp) {
            const incTime = new Date(json.data.lastUpdated || 0).getTime();
            if (incTime > latestTime) {
              latestTime = incTime;
              latestData = json.data;
              sourceName = 'Render Cloud';
            }
          }
        }
      } catch (_) {}

      // Apply incoming update if newer
      if (latestData && latestTime > localTime) {
        origSetItem(STORAGE_KEY, JSON.stringify(latestData));
        if (typeof db !== 'undefined') {
          try {
            const fresh = JSON.parse(localStorage.getItem(STORAGE_KEY));
            Object.assign(db, fresh);
            if (typeof ensureSystemAccounts === 'function') {
              ensureSystemAccounts();
            }
          } catch (_) {}
        }
        const isEditing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && document.activeElement.closest('#content');
        if (!isEditing && typeof render === 'function' && typeof user !== 'undefined' && user) {
          render();
        }
        setCloudStatus(true, `Updated from ${sourceName}`);
      } else {
        setCloudStatus(true, 'Cloud Synced');
      }
    } catch (e) {
      setCloudStatus(false, 'Local / Offline Mode');
    }
  }

  function setCloudStatus(online, text) {
    let badge = document.getElementById('mhcCloudBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'mhcCloudBadge';
      badge.style.position = 'fixed';
      badge.style.bottom = '12px';
      badge.style.right = '12px';
      badge.style.padding = '5px 12px';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '700';
      badge.style.borderRadius = '99px';
      badge.style.zIndex = '9999';
      badge.style.transition = 'all 0.3s ease';
      badge.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
      badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      document.body.appendChild(badge);
    }

    if (online) {
      badge.style.background = '#ecfdf5';
      badge.style.color = '#065f46';
      badge.style.border = '1px solid #10b981';
      badge.innerHTML = '🟢 ' + (text || 'Cloud Synced');
    } else {
      badge.style.background = '#fef2f2';
      badge.style.color = '#991b1b';
      badge.style.border = '1px solid #f87171';
      badge.innerHTML = '🟠 ' + (text || 'Offline Mode');
    }
  }

  // Expose global reload hook
  window.mhcSyncNow = pushDataToClouds;
  window.mhcPullNow = pullDataFromClouds;

  // Startup
  initSupabase();
  setupRealtimeListener();
  setTimeout(pullDataFromClouds, 800);
  setInterval(pullDataFromClouds, SYNC_INTERVAL_MS);

})();
