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

  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT key, value FROM config WHERE key = 'bar_name'`;
      return cors({ name: rows[0]?.value || "San Luigi" });
    }

    if (req.method === "POST") {
      const { name } = await req.json();
      await sql`
        INSERT INTO config (key, value) VALUES ('bar_name', ${name})
        ON CONFLICT (key) DO UPDATE SET value = ${name}
      `;
      return cors({ ok: true });
    }

    return cors({ error: "Not found" }, 404);
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}

export const config = { path: "/api/config" };
