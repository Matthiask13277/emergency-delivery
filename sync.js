/* Emergency Delivery – Offline Sync */

const ED_QUEUE_KEY = "ed_v11_queue";

function edQueue() {
  return JSON.parse(localStorage.getItem(ED_QUEUE_KEY) || "[]");
}

function edEnqueue(action) {
  const q = edQueue();

  q.push({
    ...action,
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random())
  });

  localStorage.setItem(ED_QUEUE_KEY, JSON.stringify(q));
}

async function edSync() {
  if (!navigator.onLine) return;

  const q = edQueue();

  const token = localStorage.edv10 || "";
if (!q.length || !token) return;

  try {
    const r = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        actions: q
      })
    });

    if (r.ok) {
      const out = await r.json();

      const done = new Set(
        (out.results || [])
          .filter(x => x.ok)
          .map(x => x.id)
      );

      localStorage.setItem(
        ED_QUEUE_KEY,
        JSON.stringify(q.filter(x => !done.has(x.id)))
      );
    }
  } catch (e) {
    // Offline oder Server momentan nicht erreichbar.
    // Die Aktionen bleiben in der Warteschlange.
  }
}

window.addEventListener("online", edSync);

setInterval(edSync, 10000);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .catch(() => {});
}

window.edQueue = edQueue;
window.edEnqueue = edEnqueue;
window.edSync = edSync;
