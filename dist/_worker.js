const CACHE_TTL_SECONDS = 900;
const MAX_KEYWORDS = 100;

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const propertyMap = { web: "", youtube: "youtube", news: "news", images: "images", shopping: "froogle" };

async function serpTimeline(keywords, options, apiKey) {
  const endpoint = new URL("https://serpapi.com/search.json");
  endpoint.searchParams.set("engine", "google_trends");
  endpoint.searchParams.set("q", keywords.join(","));
  endpoint.searchParams.set("geo", options.geo);
  endpoint.searchParams.set("date", options.timeframe);
  endpoint.searchParams.set("hl", "vi");
  endpoint.searchParams.set("tz", "-420");
  endpoint.searchParams.set("data_type", "TIMESERIES");
  endpoint.searchParams.set("api_key", apiKey);
  const gprop = propertyMap[options.property] ?? "";
  if (gprop) endpoint.searchParams.set("gprop", gprop);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(25_000) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `SERPAPI_${response.status}`);
  return (data.interest_over_time?.timeline_data || []).map((point) => ({
    timestamp: Number(point.timestamp),
    date: point.date,
    values: Object.fromEntries(keywords.map((keyword, index) => [keyword, Number(point.values?.[index]?.extracted_value ?? 0)])),
  }));
}

async function analyze(request, env) {
  if (!env.SERPAPI_API_KEY) return json({ status: "error", code: "MISSING_API_KEY", message: "SerpApi chưa được cấu hình." }, 503);
  const body = await request.json();
  const keywords = [...new Set((body.keywords || []).map((item) => String(item).trim()).filter(Boolean))];
  if (!keywords.length || keywords.length > MAX_KEYWORDS) return json({ status: "error", code: "INVALID_KEYWORDS", message: "Cần từ 1 đến 100 từ khóa." }, 400);
  const options = { geo: String(body.geo || "VN").toUpperCase(), timeframe: String(body.timeframe || "today 12-m"), property: String(body.property || "web").toLowerCase() };
  const cacheKey = new Request(`https://trendscope-cache.local/${encodeURIComponent(JSON.stringify({ keywords, ...options }))}`);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const batches = [];
  for (let index = 0; index < keywords.length; index += 5) batches.push(keywords.slice(index, index + 5));
  const series = [];
  for (const batch of batches) series.push({ keywords: batch, timeline: await serpTimeline(batch, options, env.SERPAPI_API_KEY) });
  const response = json({ status: "success", source: "serpapi-google-trends", generatedAt: new Date().toISOString(), cached: false, query: { keywords, ...options }, series });
  response.headers.set("cache-control", `public, max-age=${CACHE_TTL_SECONDS}`);
  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ status: "ok", service: "trendscope-serpapi" });
    if (url.pathname === "/api/trends/analyze" && request.method === "POST") {
      try { return await analyze(request, env); }
      catch (error) { return json({ status: "error", code: "UPSTREAM_ERROR", message: error.message || "Không thể lấy dữ liệu Google Trends." }, 502); }
    }
    return env.ASSETS.fetch(request);
  },
};
