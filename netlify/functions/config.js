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
      const rows = await sql`SELECT key, value FROM config WHERE key IN ('bar_name', 'pin')`;
      const data = Object.fromEntries(rows.map(r => [r.key, r.value]));
      return cors({
        name: data.bar_name || "San Luigi",
        pin:  data.pin      || "1234"
      });
    }

    if (req.method === "POST") {
      const body = await req.json();

      if (body.name !== undefined) {
        await sql`
          INSERT INTO config (key, value) VALUES ('bar_name', ${body.name})
          ON CONFLICT (key) DO UPDATE SET value = ${body.name}
        `;
      }

      if (body.pin !== undefined) {
        await sql`
          INSERT INTO config (key, value) VALUES ('pin', ${body.pin})
          ON CONFLICT (key) DO UPDATE SET value = ${body.pin}
        `;
      }

      return cors({ ok: true });
    }

    return cors({ error: "Not found" }, 404);
  } catch (err) {
    return cors({ error: err.message }, 500);
  }
}

export const config = { path: "/api/config" };
