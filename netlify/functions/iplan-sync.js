// Netlify serverless function - iPlan order sync API
// Simulates syncing kitchen orders with iPlan restaurant management system

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

// In-memory store (resets on cold start - in production use a database)
let orders = [...DEMO_ORDERS];

export default async (req) => {
  const url = new URL(req.url);
  const method = req.method;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // GET /api/orders - Fetch all orders (simulates iPlan sync)
  if (method === "GET") {
    const statusFilter = url.searchParams.get("status");
    let filtered = orders;

    if (statusFilter) {
      filtered = orders.filter((o) => o.status === statusFilter);
    }

    // Sort: urgent first, then by creation time (newest first)
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return new Response(
      JSON.stringify({
        success: true,
        orders: filtered,
        syncedAt: new Date().toISOString(),
        source: "iPlan",
      }),
      { status: 200, headers }
    );
  }

  // PUT /api/orders - Update order status
  if (method === "PUT") {
    try {
      const body = await req.json();
      const { orderId, status } = body;

      if (!orderId || !status) {
        return new Response(
          JSON.stringify({ success: false, error: "orderId and status are required" }),
          { status: 400, headers }
        );
      }

      const validStatuses = ["new", "in_progress", "completed"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers }
        );
      }

      const orderIndex = orders.findIndex((o) => o.id === orderId);
      if (orderIndex === -1) {
        return new Response(
          JSON.stringify({ success: false, error: "Order not found" }),
          { status: 404, headers }
        );
      }

      orders[orderIndex].status = status;

      return new Response(
        JSON.stringify({
          success: true,
          order: orders[orderIndex],
          syncedAt: new Date().toISOString(),
        }),
        { status: 200, headers }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 400, headers }
      );
    }
  }

  // POST /api/orders - Add new order (simulates new iPlan order)
  if (method === "POST") {
    try {
      const body = await req.json();
      const newOrder = {
        id: `ORD-${1000 + orders.length + 1}`,
        table: body.table || 1,
        items: body.items || [],
        status: "new",
        priority: body.priority || "normal",
        createdAt: new Date().toISOString(),
        source: "iPlan",
      };

      orders.unshift(newOrder);

      return new Response(
        JSON.stringify({
          success: true,
          order: newOrder,
          syncedAt: new Date().toISOString(),
        }),
        { status: 201, headers }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body" }),
        { status: 400, headers }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: false, error: "Method not allowed" }),
    { status: 405, headers }
  );
};

export const config = {
  path: "/api/orders",
};
