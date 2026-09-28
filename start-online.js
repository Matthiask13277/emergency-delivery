const bootstrap = require("./bootstrap-db.js");

async function start() {
  // Start HTTP immediately so blitz.cloud can see the service on PORT.
  // Database migrations may take time and must not block the listener.
  require("./server.js");

  console.log("Emergency Delivery: Server gestartet, Datenbank-Initialisierung läuft im Hintergrund...");

  try {
    await bootstrap();
    console.log("Emergency Delivery: Datenbank bereit.");
  } catch (err) {
    // Keep the HTTP service alive so blitz.cloud does not roll the version back.
    // The server-side schema helpers log their own database errors as well.
    console.error("Emergency Delivery: Datenbank-Initialisierung fehlgeschlagen:", err);
  }
}

start().catch(err => {
  console.error("Online-Start fehlgeschlagen:", err);
  process.exit(1);
});
