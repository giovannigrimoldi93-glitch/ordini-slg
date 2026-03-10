import { neon } from "@netlify/neon";

function cors(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return cors({});

  const sql = neon();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  try {
    // GET — lista tutte le categorie
    if (req.method === "GET") {
      const rows = await sql`SELECT * FROM categories ORDER BY "order" ASC`;
      return cors(rows);
    }

    // POST — crea nuova categoria
    if (req.method === "POST") {
      const { name, color, order } = await req.json();
      const newId = crypto.randomUUID();
      const rows = await sql`
        INSERT INTO categories (id, name, color, "order")
        VALUES (${newId}, ${name}, ${color}, ${order ?? 0})
        RETURNING *
      `;
      return cors(rows[0], 201);
    }

    // PUT — modifica categoria
    if (req.method === "PUT" && id) {
      const { name, color, order } = await req.json();
      const rows = await sql`
        UPDATE categories
        SET name = ${name}, color = ${color}, "order" = ${order ?? 0}
        WHERE id = ${id}
        RETURNING *
      `;
      return cors(rows[0]);
    }

    // DELETE — elimina categoria
    if (req.method === "DELETE" && id) {
      await sql`DELETE FROM categories WHERE id = ${id}`;
      return cors({ ok: true });
    }

    return cors({ error: "Not found" }, 404);
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}

export const config = { path: "/api/categories" };
