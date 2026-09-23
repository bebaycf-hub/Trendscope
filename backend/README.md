# TrendScope Trends API

Backend không phụ thuộc thư viện ngoài. Khi `SERPAPI_API_KEY` được cấu hình, backend sử dụng SerpApi Google Trends; nếu không, nó dùng adapter Google Trends trực tiếp làm phương án phát triển cục bộ.

## Chạy cục bộ

```powershell
$env:ALLOWED_ORIGINS="http://127.0.0.1:4173"
$env:SERPAPI_API_KEY="your_private_key"
npm start
```

Kiểm tra:

```text
GET /health
POST /api/trends/analyze
```

Payload mẫu:

```json
{
  "keywords": ["AI agent", "video AI"],
  "geo": "VN",
  "timeframe": "today 12-m",
  "property": "youtube"
}
```

## Triển khai

Có thể triển khai thư mục `backend` lên Cloud Run, Railway hoặc Render. Lệnh khởi động là `npm start`. Thiết lập `ALLOWED_ORIGINS` bằng URL frontend chính thức.

API Google Trends được sử dụng ở đây không phải API chính thức dành cho production. Hãy chuyển adapter sang Google Trends API chính thức khi tài khoản được duyệt chương trình alpha.
