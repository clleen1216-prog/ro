# Ro multiplayer server

Zero dependencies, one file. Needs Node 18+.

    node server/server.mjs        # listens on PORT (default 8787)

Health check: `GET /health`.

## Deploy (free)

**Render**: New → Web Service → this repo → Root directory `server`, Build command empty,
Start command `node server.mjs`. Your address is `wss://<name>.onrender.com`.
(Free instances sleep when idle; the first connect can take ~30 s.)

**Fly.io / Railway**: same, start command `node server/server.mjs`, expose the PORT it gives you.

## Play together

1. Everyone opens the game and presses the **Online** (people) button.
2. Paste the server address (`wss://…`, or `ws://localhost:8787` for local) → Connect.
3. Meet on the same map, press **Invite** next to a player, they press **Join**.

You can also bake the address in with the Vercel env var `VITE_WS_URL`.

How it works: one player per map (the first to arrive) simulates that map's monsters and the
server relays everything. If they leave, the next player takes over. Kills give the killer the
drops and party mates on the map 80% EXP.
