// Ro multiplayer relay. Zero dependencies: plain Node (>=18).
//   node server/server.mjs            (PORT env, default 8787)
//
// The server is a relay + rooms + parties. For every map the server picks one connected
// player as the "host": that device simulates the monsters and streams snapshots, everyone
// else renders them and sends their hits to the host. If the host leaves, another player
// takes over from the last snapshot.
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const MAX_PER_ROOM = 24;

// ─────────── minimal RFC6455 websocket (text frames) ───────────
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function encode(str) {
  const data = Buffer.from(str);
  const n = data.length;
  let head;
  if (n < 126) head = Buffer.from([0x81, n]);
  else if (n < 65536) head = Buffer.from([0x81, 126, n >> 8, n & 255]);
  else {
    head = Buffer.alloc(10);
    head[0] = 0x81;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(n), 2);
  }
  return Buffer.concat([head, data]);
}

function attach(socket, onMessage, onClose) {
  let buf = Buffer.alloc(0);
  let frags = [];
  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const op = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      if (len > 1 << 20) return socket.destroy();
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) {
        const mask = buf.subarray(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      buf = buf.subarray(need);
      if (op === 0x8) return socket.end();
      if (op === 0x9) {
        const pong = Buffer.concat([Buffer.from([0x8a, payload.length]), payload]);
        socket.write(pong);
        continue;
      }
      if (op === 0x1 || op === 0x0) {
        frags.push(payload);
        if (fin) {
          const text = Buffer.concat(frags).toString("utf8");
          frags = [];
          onMessage(text);
        }
      }
    }
  });
  socket.on("close", onClose);
  socket.on("error", () => socket.destroy());
}

// ─────────── game state ───────────
/** @type {Map<string, any>} */
const clients = new Map();
/** @type {Map<string, {id:string,host:string|null,snap:any,members:Set<string>}>} */
const rooms = new Map();
/** @type {Map<string, {id:string,leader:string,members:string[]}>} */
const parties = new Map();
let nextId = 1;

const send = (c, msg) => {
  if (c && !c.socket.destroyed) c.socket.write(encode(JSON.stringify(msg)));
};
const sendId = (id, msg) => send(clients.get(id), msg);
const cleanName = (s) => String(s ?? "Hero").replace(/[^\w \-.]/g, "").slice(0, 14) || "Hero";

function roomOf(mapId) {
  let r = rooms.get(mapId);
  if (!r) {
    r = { id: mapId, host: null, snap: null, members: new Set() };
    rooms.set(mapId, r);
  }
  return r;
}

function pub(c) {
  return { id: c.id, name: c.name, look: c.look, party: c.party };
}

function toRoom(room, msg, except) {
  for (const id of room.members) if (id !== except) sendId(id, msg);
}

function leaveRoom(c) {
  if (!c.map) return;
  const room = rooms.get(c.map);
  c.map = null;
  if (!room) return;
  room.members.delete(c.id);
  toRoom(room, { t: "left", id: c.id });
  if (room.host === c.id) {
    room.host = [...room.members][0] ?? null;
    if (room.host) sendId(room.host, { t: "host", map: room.id, snap: room.snap });
    if (!room.host) rooms.delete(room.id);
    else toRoom(room, { t: "hostis", id: room.host });
  } else if (room.members.size === 0) rooms.delete(room.id);
}

function enterRoom(c, mapId) {
  leaveRoom(c);
  const room = roomOf(String(mapId));
  if (room.members.size >= MAX_PER_ROOM) {
    send(c, { t: "full" });
    return;
  }
  c.map = room.id;
  room.members.add(c.id);
  if (!room.host) {
    room.host = c.id;
    room.snap = null;
  }
  send(c, {
    t: "room",
    map: room.id,
    host: room.host,
    snap: room.host === c.id ? room.snap : null,
    players: [...room.members].filter((id) => id !== c.id).map((id) => ({ ...pub(clients.get(id)), pos: clients.get(id).pos })),
  });
  toRoom(room, { t: "joined", p: { ...pub(c), pos: c.pos } }, c.id);
}

function partyState(p) {
  return {
    t: "party",
    id: p.id,
    leader: p.leader,
    members: p.members.map((id) => {
      const m = clients.get(id);
      return { id, name: m?.name ?? "?", hp: m?.stat?.hp ?? 0, maxHp: m?.stat?.maxHp ?? 1, sp: m?.stat?.sp ?? 0, maxSp: m?.stat?.maxSp ?? 1, lv: m?.stat?.lv ?? 1, map: m?.map ?? null };
    }),
  };
}

function pushParty(p) {
  const s = partyState(p);
  for (const id of p.members) sendId(id, s);
}

function leaveParty(c) {
  const p = c.party ? parties.get(c.party) : null;
  c.party = null;
  send(c, { t: "party", id: null });
  if (!p) return;
  p.members = p.members.filter((id) => id !== c.id);
  if (p.members.length <= 1) {
    for (const id of p.members) {
      const m = clients.get(id);
      if (m) m.party = null;
      sendId(id, { t: "party", id: null });
    }
    parties.delete(p.id);
    return;
  }
  if (p.leader === c.id) p.leader = p.members[0];
  pushParty(p);
}

function joinParty(c, p) {
  if (c.party) leaveParty(c);
  if (p.members.length >= 6) return send(c, { t: "note", text: "Party is full (6)." });
  p.members.push(c.id);
  c.party = p.id;
  pushParty(p);
}

function handle(c, m) {
  switch (m.t) {
    case "hello":
      c.name = cleanName(m.name);
      c.look = m.look ?? null;
      send(c, { t: "welcome", id: c.id, name: c.name });
      break;
    case "look":
      c.look = m.look ?? c.look;
      if (c.map) toRoom(rooms.get(c.map), { t: "look", id: c.id, look: c.look }, c.id);
      break;
    case "map":
      c.pos = null;
      enterRoom(c, m.map);
      break;
    case "pos": {
      c.pos = m.p;
      if (c.map) toRoom(rooms.get(c.map), { t: "pos", id: c.id, p: m.p }, c.id);
      break;
    }
    case "stat": {
      c.stat = m.s;
      if (c.party) {
        const p = parties.get(c.party);
        if (p) pushParty(p);
      }
      break;
    }
    case "mons": {
      const room = c.map ? rooms.get(c.map) : null;
      if (!room || room.host !== c.id) break;
      room.snap = m.s;
      toRoom(room, { t: "mons", s: m.s }, c.id);
      break;
    }
    case "hit": {
      const room = c.map ? rooms.get(c.map) : null;
      if (room?.host && room.host !== c.id) sendId(room.host, { t: "hit", from: c.id, mid: m.mid, dmg: m.dmg, col: m.col });
      break;
    }
    case "mhit": // host -> victim
      sendId(m.to, { t: "mhit", raw: m.raw, lvl: m.lvl });
      break;
    case "kill": {
      const room = c.map ? rooms.get(c.map) : null;
      if (!room || room.host !== c.id) break;
      const killer = clients.get(m.killer);
      const party = killer?.party ?? null;
      const msg = { t: "kill", kind: m.kind, x: m.x, y: m.y, killer: m.killer, party };
      toRoom(room, msg, c.id);
      break;
    }
    case "fx":
      if (c.map) toRoom(rooms.get(c.map), { t: "fx", id: c.id, ...m.f }, c.id);
      break;
    case "invite": {
      const target = [...clients.values()].find((x) => x.id === m.to || x.name.toLowerCase() === String(m.name ?? "").toLowerCase());
      if (!target || target.id === c.id) return send(c, { t: "note", text: "Player not found." });
      if (!c.party) {
        const p = { id: `P${nextId++}`, leader: c.id, members: [c.id] };
        parties.set(p.id, p);
        c.party = p.id;
        pushParty(p);
      }
      const p = parties.get(c.party);
      if (p.leader !== c.id) return send(c, { t: "note", text: "Only the leader can invite." });
      send(target, { t: "invite", from: c.id, name: c.name, party: p.id });
      send(c, { t: "note", text: `Invited ${target.name}.` });
      break;
    }
    case "accept": {
      const p = parties.get(m.party);
      if (p) joinParty(c, p);
      else send(c, { t: "note", text: "That party no longer exists." });
      break;
    }
    case "leave":
      leaveParty(c);
      break;
    case "kick": {
      const p = c.party ? parties.get(c.party) : null;
      if (p && p.leader === c.id && m.id !== c.id) {
        const v = clients.get(m.id);
        if (v) leaveParty(v);
      }
      break;
    }
    default:
      break;
  }
}

// ─────────── http + upgrade ───────────
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ ok: true, players: clients.size, rooms: rooms.size }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Ro multiplayer server\n");
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  const c = { id: `u${nextId++}`, socket, name: "Hero", look: null, map: null, party: null, pos: null, stat: null, last: Date.now(), rate: 0 };
  clients.set(c.id, c);
  attach(
    socket,
    (text) => {
      c.last = Date.now();
      let m;
      try {
        m = JSON.parse(text);
      } catch {
        return;
      }
      if (m && typeof m.t === "string") handle(c, m);
    },
    () => {
      leaveRoom(c);
      leaveParty(c);
      clients.delete(c.id);
    },
  );
});

// drop dead connections
setInterval(() => {
  const now = Date.now();
  for (const c of clients.values()) if (now - c.last > 30000) c.socket.destroy();
}, 10000);

server.listen(PORT, () => console.log(`Ro server on :${PORT}`));
