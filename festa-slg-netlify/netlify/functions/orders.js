import { neon } from "@netlify/neon";

function cors(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return cors({});

  const sql = neon();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");

  try {
    // GET — storico per range date
    if (req.method === "GET" && from && to) {
      const rows = await sql`
        SELECT * FROM orders
        WHERE day_key >= ${from} AND day_key <= ${to}
        ORDER BY created_at ASC
      `;
      return cors(rows);
    }

    // POST — salva nuovo ordine + incrementa contatore
    if (req.method === "POST") {
      const { items, total, dayKey } = await req.json();

      // Incrementa contatore ordini in modo atomico
      await sql`
        INSERT INTO config (key, value) VALUES ('order_seq', '1')
        ON CONFLICT (key) DO UPDATE SET value = (CAST(config.value AS INTEGER) + 1)::TEXT
      `;
      const seqRows = await sql`SELECT value FROM config WHERE key = 'order_seq'`;
      const orderNumber = parseInt(seqRows[0].value, 10);

      const newId = crypto.randomUUID();
      const rows = await sql`
        INSERT INTO orders (id, order_number, day_key, total, items, created_at)
        VALUES (${newId}, ${orderNumber}, ${dayKey}, ${total}, ${JSON.stringify(items)}, NOW())
        RETURNING *
      `;
      return cors({ ...rows[0], orderNumber }, 201);
    }

    return cors({ error: "Not found" }, 404);
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}

export const config = { path: "/api/orders" };
