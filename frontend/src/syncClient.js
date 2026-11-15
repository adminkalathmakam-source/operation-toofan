// Real-Time Cross-Device Synchronization Client for TOOFAN Shield
// Connects Phone, PC, Laptop, and Tablets over WebSockets with HTTP polling fallback.

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

function getWebSocketUrl() {
  if (API_BASE && (API_BASE.startsWith("http://") || API_BASE.startsWith("https://"))) {
    const wsProto = API_BASE.startsWith("https") ? "wss:" : "ws:";
    const host = API_BASE.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `${wsProto}//${host}/ws/sync`;
  }
  if (typeof window !== "undefined") {
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    if (host.includes(":5173") || host.includes(":3000")) {
      return "ws://localhost:8000/ws/sync";
    }
    return `${wsProto}//${host}/ws/sync`;
  }
  return "ws://localhost:8000/ws/sync";
}

class SyncClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.connectedDevices = 1;
    this.lastVersion = 0;
    this.subscribers = new Set();
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.pollTimer = null;
    this.deviceId = "dev_" + Math.random().toString(36).substring(2, 9);
    this.isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }

  // Subscribe to real-time events (INIT_STATE, TX_UPDATE, RESET, SAMPLE_LOADED, DEVICE_COUNT)
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event, payload) {
    this.subscribers.forEach((cb) => {
      try {
        cb(event, payload);
      } catch (err) {
        console.error("[SyncClient] Subscriber error:", err);
      }
    });

    // Also dispatch to window for external standalone components (e.g. PayDemo)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("toofan-sync-event", {
          detail: { event, payload },
        })
      );
    }
  }

  // Connect WebSocket with resilient auto-reconnect
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notify("SYNC_STATUS", { connected: true, devices: this.connectedDevices });

        // Heartbeat keep-alive every 20 seconds
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 20000);
      };

      this.ws.onmessage = (msgEvent) => {
        try {
          const data = JSON.parse(msgEvent.data);
          this.handleIncomingMessage(data);
        } catch {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notify("SYNC_STATUS", { connected: false, devices: this.connectedDevices });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        try {
          this.ws.close();
        } catch {}
      };
    } catch {
      this.scheduleReconnect();
    }

    // Start fallback polling if not already running
    if (!this.pollTimer) {
      this.startPollingFallback();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  // Fallback HTTP polling every 4 seconds to guarantee sync even on mobile sleep wakeups
  startPollingFallback() {
    this.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sync/state`);
        if (res.ok) {
          const state = await res.json();
          if (state.connected_devices !== undefined) {
            this.connectedDevices = state.connected_devices;
          }
          if (state.version && state.version > this.lastVersion) {
            this.lastVersion = state.version;
            this.notify("TX_UPDATE", {
              transactions: state.transactions,
              trace: state.trace,
              is_reset: state.is_reset,
              source: "cloud-poll",
              connected_devices: state.connected_devices,
            });
          }
        }
      } catch {}
    }, 4000);
  }

  handleIncomingMessage(data) {
    if (!data || typeof data !== "object") return;

    if (data.connected_devices !== undefined) {
      this.connectedDevices = data.connected_devices;
    }
    if (data.version !== undefined) {
      this.lastVersion = data.version;
    }

    switch (data.type) {
      case "INIT_STATE":
        this.notify("INIT_STATE", data);
        break;
      case "TX_UPDATE":
        this.notify("TX_UPDATE", data);
        break;
      case "RESET":
        this.notify("RESET", data);
        break;
      case "SAMPLE_LOADED":
        this.notify("SAMPLE_LOADED", data);
        break;
      case "DEVICE_COUNT":
        this.notify("DEVICE_COUNT", { connected_devices: data.connected_devices });
        break;
      case "PONG":
        // Keep-alive acknowledge
        break;
      default:
        break;
    }
  }

  // Broadcast new transactions (from phone GPay or Cash Laundering Desk)
  async sendTransactions(transactions, source = "mobile") {
    const payload = {
      transactions: Array.isArray(transactions) ? transactions : [transactions],
      source: source || (this.isMobile ? "mobile" : "pc"),
    };

    // 1. Try sending over open WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "ADD_TX", ...payload }));
      } catch {}
    }

    // 2. Also send over HTTP POST to guarantee delivery & database state update
    try {
      const res = await fetch(`${API_BASE}/api/sync/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        return result;
      }
    } catch (err) {
      console.warn("[SyncClient] HTTP sync fallback error:", err);
    }
    return null;
  }

  // Broadcast Reset All across all devices
  async sendReset() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: "RESET" }));
      } catch {}
    }
    try {
      await fetch(`${API_BASE}/api/sync/reset`, { method: "POST" });
    } catch {}
  }

  // Broadcast Load Sample Demo scenario across all devices
  async sendLoadSample(scenario = "burst") {
    try {
      const res = await fetch(`${API_BASE}/api/sync/load-sample`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  // Fetch initial state once
  async fetchInitialState() {
    try {
      const res = await fetch(`${API_BASE}/api/sync/state`);
      if (res.ok) {
        const state = await res.json();
        if (state.connected_devices !== undefined) {
          this.connectedDevices = state.connected_devices;
        }
        if (state.version !== undefined) {
          this.lastVersion = state.version;
        }
        return state;
      }
    } catch {}
    return null;
  }
}

export const syncClient = new SyncClient();
