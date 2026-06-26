import { useState, useEffect, useCallback } from "preact/hooks";

const PRIORITY_LABELS = {
  urgent: "דחוף",
  high: "גבוה",
  normal: "רגיל",
};

const STATUS_LABELS = {
  new: "חדשה",
  in_progress: "בהכנה",
  completed: "הושלמה",
};

const STATUS_NEXT = {
  new: "in_progress",
  in_progress: "completed",
};

const STATUS_ACTION_LABELS = {
  new: "התחל הכנה",
  in_progress: "סמן כהושלמה",
};

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getElapsedMinutes(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / 60000);
}

function OrderCard({ order, onStatusChange }) {
  const elapsed = getElapsedMinutes(order.createdAt);
  const isUrgent = order.priority === "urgent" || elapsed > 15;

  return (
    <div
      class={`order-card order-${order.status} priority-${order.priority} ${
        isUrgent && order.status !== "completed" ? "order-urgent-flash" : ""
      }`}
    >
      <div class="order-header">
        <div class="order-id-row">
          <span class="order-id">{order.id}</span>
          <span class={`priority-badge priority-${order.priority}`}>
            {PRIORITY_LABELS[order.priority]}
          </span>
        </div>
        <div class="order-meta">
          <span class="order-table">שולחן {order.table}</span>
          <span class="order-time">{formatTime(order.createdAt)}</span>
          <span class={`order-elapsed ${elapsed > 15 ? "elapsed-warning" : ""}`}>
            {elapsed} דק'
          </span>
        </div>
      </div>

      <div class="order-items">
        {order.items.map((item, i) => (
          <div class="order-item" key={i}>
            <span class="item-qty">{item.quantity}x</span>
            <span class="item-name">{item.name}</span>
            {item.notes && <span class="item-notes">{item.notes}</span>}
          </div>
        ))}
      </div>

      <div class="order-footer">
        <span class={`status-badge status-${order.status}`}>
          {STATUS_LABELS[order.status]}
        </span>
        {order.status !== "completed" && (
          <button
            class={`action-btn action-${STATUS_NEXT[order.status]}`}
            onClick={() => onStatusChange(order.id, STATUS_NEXT[order.status])}
          >
            {STATUS_ACTION_LABELS[order.status]}
          </button>
        )}
      </div>

      <div class="order-source">
        <span class="source-badge">iPlan</span>
      </div>
    </div>
  );
}

const DEMO_ORDERS = [
  {
    id: "ORD-1001",
    table: 5,
    items: [
      { name: "המבורגר קלאסי", quantity: 2, notes: "ללא בצל" },
      { name: "צ'יפס", quantity: 2, notes: "" },
      { name: "סלט קיסר", quantity: 1, notes: "רוטב בצד" },
    ],
    status: "new",
    priority: "normal",
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    source: "iPlan",
  },
  {
    id: "ORD-1002",
    table: 12,
    items: [
      { name: "פיצה מרגריטה", quantity: 1, notes: "" },
      { name: "פסטה בולונז", quantity: 2, notes: "חריף" },
    ],
    status: "in_progress",
    priority: "high",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    source: "iPlan",
  },
  {
    id: "ORD-1003",
    table: 3,
    items: [
      { name: "שניצל", quantity: 3, notes: "" },
      { name: "אורז", quantity: 3, notes: "" },
      { name: "חומוס", quantity: 2, notes: "" },
    ],
    status: "new",
    priority: "urgent",
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(),
    source: "iPlan",
  },
  {
    id: "ORD-1004",
    table: 8,
    items: [
      { name: "סטייק אנטריקוט", quantity: 1, notes: "מדיום ריר" },
      { name: "תפוחי אדמה אפויים", quantity: 1, notes: "" },
      { name: "יין אדום", quantity: 2, notes: "" },
    ],
    status: "new",
    priority: "normal",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    source: "iPlan",
  },
  {
    id: "ORD-1005",
    table: 1,
    items: [
      { name: "שקשוקה", quantity: 2, notes: "" },
      { name: "לחם טאבון", quantity: 2, notes: "" },
    ],
    status: "completed",
    priority: "normal",
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    source: "iPlan",
  },
];

export default function KitchenOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [filter, setFilter] = useState("active");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setLastSync(data.syncedAt);
        setError(null);
        setDemoMode(false);
      } else {
        throw new Error(data.error || "Failed to fetch orders");
      }
    } catch (err) {
      if (!demoMode && orders.length === 0) {
        setOrders(DEMO_ORDERS);
        setDemoMode(true);
        setLastSync(new Date().toISOString());
      }
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [demoMode, orders.length]);

  const updateOrderStatus = async (orderId, status) => {
    if (demoMode) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      return;
    }
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(`שגיאה בעדכון הזמנה: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 15000); // Sync every 15 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  const filteredOrders =
    filter === "all"
      ? orders
      : filter === "active"
      ? orders.filter((o) => o.status !== "completed")
      : orders.filter((o) => o.status === filter);

  const counts = {
    new: orders.filter((o) => o.status === "new").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  if (loading) {
    return (
      <div class="kitchen-loading">
        <div class="spinner" />
        <p>מסנכרן הזמנות מ-iPlan...</p>
      </div>
    );
  }

  return (
    <div class="kitchen-container" dir="rtl">
      {/* Status Bar */}
      <div class="kitchen-status-bar">
        <div class="sync-info">
          <span class={`sync-dot ${error ? "sync-error" : "sync-ok"}`} />
          <span class="sync-text">
            {error
              ? "מנותק"
              : demoMode
              ? `מצב הדגמה | iPlan ${lastSync ? formatTime(lastSync) : ""}`
              : `מסונכרן עם iPlan ${
                  lastSync
                    ? "| " + formatTime(lastSync)
                    : ""
                }`}
          </span>
        </div>
        <div class="status-bar-actions">
          <label class="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            רענון אוטומטי
          </label>
          <button class="refresh-btn" onClick={fetchOrders}>
            סנכרן עכשיו
          </button>
        </div>
      </div>

      {error && <div class="kitchen-error">{error}</div>}

      {/* Stats Summary */}
      <div class="kitchen-stats">
        <div class="stat stat-new">
          <span class="stat-count">{counts.new}</span>
          <span class="stat-label">חדשות</span>
        </div>
        <div class="stat stat-progress">
          <span class="stat-count">{counts.in_progress}</span>
          <span class="stat-label">בהכנה</span>
        </div>
        <div class="stat stat-done">
          <span class="stat-count">{counts.completed}</span>
          <span class="stat-label">הושלמו</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div class="kitchen-filters">
        {[
          { key: "active", label: "פעילות" },
          { key: "new", label: "חדשות" },
          { key: "in_progress", label: "בהכנה" },
          { key: "completed", label: "הושלמו" },
          { key: "all", label: "הכל" },
        ].map((f) => (
          <button
            key={f.key}
            class={`filter-tab ${filter === f.key ? "filter-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div class="orders-grid">
        {filteredOrders.length === 0 ? (
          <div class="no-orders">
            <p>אין הזמנות להצגה</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={updateOrderStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}
