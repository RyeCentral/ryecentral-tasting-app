/**
 * WebSocket Service — connects to the tasting event WS server.
 * Server expects connection at: /ws?eventId=xxx&role=admin|guest&guestId=xxx
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this._params = null;
    this._queue = []; // messages sent while the socket was down (phone locked, tunnel, etc.)
  }

  connect({ eventId, role, guestId }) {
    const prev = this._params;
    if (!prev || prev.eventId !== eventId || prev.role !== role || prev.guestId !== guestId) {
      this._queue = []; // never replay one event's messages into another
    }
    this._params = { eventId, role, guestId };

    // Close existing connection if any (without triggering reconnect)
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    // In dev the WS runs on 3001 (server port), not 3000 (CRA).
    // In production (hosted), use window.location.port (may be empty for 80/443).
    const port = process.env.NODE_ENV === 'development' ? '3001' : window.location.port;
    const hostPort = port ? `${host}:${port}` : host;

    let url = `${protocol}://${hostPort}/ws?eventId=${eventId}&role=${role}`;
    if (guestId) url += `&guestId=${guestId}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._flush();
      this._emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._emit(message.type, message);
        this._emit('*', message);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    this.ws.onclose = () => {
      this._emit('disconnected', {});
      this._tryReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WS error:', error);
    };
  }

  /**
   * Force reconnect — closes existing connection and opens a fresh one.
   * Used for visibility change recovery (tab coming back to focus).
   */
  reconnect() {
    if (!this._params) return;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.connect(this._params);
  }

  disconnect() {
    this.maxReconnectAttempts = 0;
    this._queue = [];
    this._params = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  /**
   * Send a message. If the socket isn't open (common on phones after the
   * screen locks), queue it and deliver on reconnect instead of dropping it.
   * Returns true if it went out immediately.
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch { /* fall through to queue */ }
    }
    this._queue.push(data);
    if (this._queue.length > 50) this._queue.shift();
    // Socket is dead and no retry is pending — kick a reconnect
    if (this._params && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      this.reconnect();
    }
    return false;
  }

  _flush() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const pending = this._queue;
    this._queue = [];
    pending.forEach((msg) => {
      try { this.ws.send(JSON.stringify(msg)); } catch { this._queue.push(msg); }
    });
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
    return () => {
      const cbs = this.listeners.get(type);
      if (cbs) {
        this.listeners.set(type, cbs.filter((cb) => cb !== callback));
      }
    };
  }

  _emit(type, data) {
    const cbs = this.listeners.get(type) || [];
    cbs.forEach((cb) => cb(data));
  }

  _tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this._params) return;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    setTimeout(() => {
      if (this._params) this.connect(this._params);
    }, delay);
  }
}

const wsService = new WebSocketService();
export default wsService;
