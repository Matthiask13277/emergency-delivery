/* Emergency Delivery – Offline Sync */
const ED_QUEUE_KEY = "ed_v11_queue";

function edQueue() {
  try { return JSON.parse(localStorage.getItem(ED_QUEUE_KEY) || "[]"); }
  catch (_) { return []; }
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
  return q[q.length - 1];
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
      body: JSON.stringify({ actions: q })
    });

    if (!r.ok) return;

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
  } catch (_) {
    // Netzwerkfehler: Aktionen bleiben lokal gespeichert.
  }
}

window.addEventListener("online", edSync);
setInterval(edSync, 10000);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .catch(() => {});
}

window.edQueue = edQueue;
window.edEnqueue = edEnqueue;
window.edSync = edSync;
