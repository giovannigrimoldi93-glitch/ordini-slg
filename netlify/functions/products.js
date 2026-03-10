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
  const action = url.searchParams.get("action");

  try {
    // GET — lista tutti i prodotti
    if (req.method === "GET") {
      const rows = await sql`SELECT * FROM products ORDER BY name ASC`;
      return cors(rows);
    }

    // POST — crea nuovo prodotto
    if (req.method === "POST") {
      const { name, price, stock, category, active } = await req.json();
      const newId = crypto.randomUUID();
      const rows = await sql`
        INSERT INTO products (id, name, price, stock, category, active)
        VALUES (${newId}, ${name}, ${price}, ${stock ?? null}, ${category}, ${active ?? true})
        RETURNING *
      `;
      return cors(rows[0], 201);
    }

    // PUT — modifica prodotto o aggiorna stock
    if (req.method === "PUT" && id) {
      // Aggiornamento stock (add/remove da carrello)
      if (action === "stock-decrement") {
        // Transazione sicura: scala stock solo se disponibile
        const rows = await sql`
          UPDATE products
          SET stock = stock - 1
          WHERE id = ${id} AND stock > 0
          RETURNING *
        `;
        if (rows.length === 0) return cors({ error: "Prodotto esaurito" }, 409);
        return cors(rows[0]);
      }

      if (action === "stock-increment") {
        const rows = await sql`
          UPDATE products
          SET stock = stock + 1
          WHERE id = ${id}
          RETURNING *
        `;
        return cors(rows[0]);
      }

      if (action === "stock-increment-bulk") {
        const { qty } = await req.json();
        const rows = await sql`
          UPDATE products
          SET stock = stock + ${qty}
          WHERE id = ${id}
          RETURNING *
        `;
        return cors(rows[0]);
      }

      // Modifica completa prodotto
      const { name, price, stock, category, active } = await req.json();
      const rows = await sql`
        UPDATE products
        SET name = ${name}, price = ${price}, stock = ${stock ?? null},
            category = ${category}, active = ${active}
        WHERE id = ${id}
        RETURNING *
      `;
      return cors(rows[0]);
    }

    // DELETE — elimina prodotto
    if (req.method === "DELETE" && id) {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return cors({ ok: true });
    }

    return cors({ error: "Not found" }, 404);
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}

export const config = { path: "/api/products" };
