// ==========================================================
// AC38 harness prototype — network guard preload (every fixture process, before anything else)
// ==========================================================
// Node's permission model does not gate sockets on this version, so sockets are denied here.
// The pinned runtime only ever "fetches" two local JSON files through the shim's stub.
// ==========================================================
import dgram from 'node:dgram';
import dns from 'node:dns';
import net from 'node:net';

let attempts = 0;
const deny = (name) => function denied() { attempts++; throw new Error(`AC38 network guard: ${name} is denied`); };
net.Socket.prototype.connect = deny('net.Socket.connect');
net.Server.prototype.listen = deny('net.Server.listen');
dgram.createSocket = deny('dgram.createSocket');
dns.lookup = deny('dns.lookup');
globalThis.fetch = deny('fetch');
globalThis.WebSocket = class { constructor() { deny('WebSocket')(); } };
Object.defineProperty(globalThis, '__AC38_NET__', { value: Object.freeze({ attempts: () => attempts }) });
