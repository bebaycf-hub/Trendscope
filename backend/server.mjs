import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:4173,http://localhost:4173")
    .split(",").map((value) => value.trim()).filter(Boolean)
);
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_KEYWORDS = 100;

const json = (res, status, payload, origin = "") => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["access-control-allow-origin"] = origin;
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw new Error("PAYLOAD_TOO_LARGE");
  }
  return JSON.parse(body || "{}");
};

const cleanGoogleJson = (text) => JSON.parse(text.replace(/^\)\]\}',?\s*/, ""));

async function googleFetch(url, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "accept-language": "vi-VN,vi;q=0.9,en;q=0.8",
          "user-agent": "Mozilla/5.0 TrendScope/1.0",
        },
        signal: AbortSignal.timeout(18_000),
      });
      if (response.status === 429) throw new Error("RATE_LIMITED");
      if (!response.ok) throw new Error(`GOOGLE_${response.status}`);
      return cleanGoogleJson(await response.text());
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

const propertyMap = {
  web: "",
  youtube: "youtube",
  news: "news",
  images: "images",
  shopping: "froogle",
};

async function fetchTimeline(keywords, { geo, timeframe, property }) {
  const request = {
    comparisonItem: keywords.map((keyword) => ({ keyword, geo, time: timeframe })),
    category: 0,
    property: propertyMap[property] ?? "",
  };
  const explore = new URL("https://trends.google.com/trends/api/explore");
  explore.searchParams.set("hl", "vi");
  explore.searchParams.set("tz", "-420");
  explore.searchParams.set("req", JSON.stringify(request));
  const metadata = await googleFetch(explore);
  const widget = metadata.widgets?.find((item) => item.id === "TIMESERIES");
  if (!widget) throw new Error("NO_TIMELINE_WIDGET");

  const timeline = new URL("https://trends.google.com/trends/api/widgetdata/multiline");
  timeline.searchParams.set("hl", "vi");
  timeline.searchParams.set("tz", "-420");
  timeline.searchParams.set("req", JSON.stringify(widget.request));
  timeline.searchParams.set("token", widget.token);
  const data = await googleFetch(timeline);
  const points = data.default?.timelineData || [];
  return points.map((point) => ({
    timestamp: Number(point.time),
    date: point.formattedTime,
    values: Object.fromEntries(keywords.map((keyword, index) => [keyword, point.value?.[index] ?? 0])),
  }));
}

async function analyze(payload) {
  const keywords = [...new Set((payload.keywords || []).map((item) => String(item).trim()).filter(Boolean))];
  if (!keywords.length || keywords.length > MAX_KEYWORDS) {
    const error = new Error("INVALID_KEYWORDS");
    error.status = 400;
    throw error;
  }
  const options = {
    geo: String(payload.geo || "VN").toUpperCase(),
    timeframe: String(payload.timeframe || "today 12-m"),
    property: String(payload.property || "web").toLowerCase(),
  };
  const key = JSON.stringify({ keywords, ...options });
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return { ...cached.data, cached: true };

  const batches = [];
  for (let index = 0; index < keywords.length; index += 5) batches.push(keywords.slice(index, index + 5));
  const series = [];
  for (const batch of batches) series.push({ keywords: batch, timeline: await fetchTimeline(batch, options) });
  const result = { status: "success", source: "google-trends", generatedAt: new Date().toISOString(), cached: false, query: { keywords, ...options }, series };
  cache.set(key, { createdAt: Date.now(), data: result });
  return result;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  if (req.method === "OPTIONS") return json(res, 204, {}, origin);
  if (req.method === "GET" && req.url === "/health") return json(res, 200, { status: "ok", service: "trendscope-trends-api" }, origin);
  if (req.method === "POST" && req.url === "/api/trends/analyze") {
    try {
      return json(res, 200, await analyze(await readBody(req)), origin);
    } catch (error) {
      const status = error.status || (error.message === "RATE_LIMITED" ? 429 : 502);
      return json(res, status, {
        status: "error",
        code: error.message,
        message: status === 429 ? "Google Trends đang giới hạn yêu cầu. Vui lòng thử lại sau." : "Không thể lấy dữ liệu Google Trends lúc này.",
      }, origin);
    }
  }
  return json(res, 404, { status: "error", message: "Không tìm thấy endpoint." }, origin);
});

server.listen(PORT, "0.0.0.0", () => console.log(`TrendScope API listening on http://0.0.0.0:${PORT}`));

