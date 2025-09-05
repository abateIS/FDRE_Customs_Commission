// api/submit.js
// Vercel serverless function that proxies form POSTs to your Google Apps Script
export default async function handler(req, res) {
    // Allow OPTIONS preflight (useful for some clients)
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).end();
    }
  
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS");
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
    }
  
    try {
      // get body (Vercel parses JSON body automatically)
      const body = req.body && Object.keys(req.body).length ? req.body : await (async () => {
        // fallback: read raw body if not parsed
        const buf = [];
        for await (const chunk of req) buf.push(chunk);
        const raw = Buffer.concat(buf).toString();
        return raw ? JSON.parse(raw) : {};
      })();
  
      // validate minimal fields (optional)
      if (!body.fullname || !body.department || !body.type) {
        return res.status(400).json({ status: "error", message: "Missing required fields" });
      }
  
      // *** REPLACE THIS WITH YOUR ACTUAL APPS SCRIPT WEB APP URL ***
      const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjEMcOuD-SpcY9IXgGKusi4IVM3MWba0Nv38epkHEc6rrPfc9fxC0hjIGtq-D-pf81/exec";
  
      // Forward the request server->server (no CORS problem)
      const gsRes = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // no 'mode' here
      });
  
      const text = await gsRes.text();
      // try parse JSON response from the script; fallback to raw text
      let parsed;
      try { parsed = JSON.parse(text); } catch (err) { parsed = { raw: text }; }
  
      if (!gsRes.ok) {
        return res.status(500).json({
          status: "error",
          message: `Google script returned ${gsRes.status}`,
          details: parsed
        });
      }
  
      // success
      res.setHeader("Access-Control-Allow-Origin", "*"); // optional
      return res.status(200).json({
        status: "success",
        message: parsed.message || "ጥያቄው ለ IT ባለሙያ ተልኳል",
        details: parsed
      });
  
    } catch (error) {
      console.error("Proxy error:", error);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(500).json({ status: "error", message: error.message || String(error) });
    }
  }
  