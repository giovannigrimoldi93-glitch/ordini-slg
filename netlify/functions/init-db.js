import { neon } from "@netlify/neon";

export default async function handler(req, context) {
  // Solo POST e solo da admin (protetto da Identity)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sql = neon(); // usa automaticamente NETLIFY_DATABASE_URL

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#004aad',
        "order" INTEGER DEFAULT 0
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        stock INTEGER,
        category TEXT,
        active BOOLEAN DEFAULT true
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number INTEGER,
        day_key TEXT,
        total NUMERIC(10,2),
        items JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `;

    await sql`
      INSERT INTO config (key, value)
      VALUES ('bar_name', 'San Luigi'), ('order_seq', '0')
      ON CONFLICT (key) DO NOTHING
    `;

    return new Response(JSON.stringify({ ok: true, message: "Tabelle create con successo" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export const config = { path: "/api/init-db" };
