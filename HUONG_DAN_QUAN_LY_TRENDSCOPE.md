# Hướng dẫn quản lý TrendScope

Tài liệu này lưu quy trình duy trì, chỉnh sửa và xuất bản TrendScope. Không ghi hoặc gửi khóa API vào tài liệu, mã nguồn, ảnh chụp màn hình hay Git.

## 1. Thông tin hiện tại

- Trang đang hoạt động: https://trendscope-vn-studio.anhtuyet-spa1103.chatgpt.site
- Trạng thái truy cập: công khai.
- Thư mục mã nguồn trên máy: `C:\Users\pc\Documents\ChatGPT\New project\trendscope-site`
- Giao diện tĩnh chính: `dist/index.html`
- Cấu hình xuất bản: `.openai/hosting.json`

URL hiện tại có thể tiếp tục sử dụng bình thường. Tên miền tùy chỉnh `md.trendscope.vn` chỉ hoạt động sau khi chủ sở hữu tên miền thêm các bản ghi DNS xác minh; việc chưa cấu hình DNS không ảnh hưởng URL hiện tại.

## 2. Cách yêu cầu chỉnh sửa nhanh

Không cần tự sửa mã. Chỉ cần mở một cuộc trò chuyện Codex và nêu rõ thay đổi mong muốn, ví dụ:

- “Thêm bộ lọc quốc gia vào Studio”.
- “Sửa lỗi nút Làm mới bằng Apify”.
- “Đổi tên cột trong báo cáo”.
- “Thêm nguồn dữ liệu mới”.

Khi yêu cầu, nên gửi ảnh màn hình, mô tả kết quả mong muốn và bước tái hiện lỗi nếu có. Sau khi chỉnh sửa, cần xuất bản lại trang để thay đổi có hiệu lực.

## 3. Kiến trúc và các phần quan trọng

| Phần | Vai trò |
|---|---|
| Studio phân tích | Nhập từ khóa, quốc gia, thời gian và loại tìm kiếm; tạo dữ liệu Google Trends. |
| Radar xu hướng | Tổng hợp chỉ số và tín hiệu từ kết quả Studio. |
| Khu vực | Hiển thị dữ liệu vùng; có thể gọi Apify khi người dùng chủ động làm mới. |
| Báo cáo đã lưu | Lưu/tạo/xóa báo cáo trong trình duyệt. |
| Kết nối API | Người dùng tự nhập Gemini, Apify hoặc Thordata API token trên máy của họ. |
| `dist/index.html` | Chứa HTML, CSS và JavaScript của giao diện. |

## 4. Quy tắc bảo mật API

1. Mỗi người dùng tự nhập token tại tab **Kết nối API**.
2. Token được lưu trong `localStorage` của trình duyệt đó; người khác và thiết bị khác không dùng được.
3. Token luôn hiển thị dạng ẩn. Chỉ bấm **Hiện** khi thực sự cần kiểm tra.
4. Không gửi token qua chat, email, Git, ảnh chụp màn hình hoặc tài liệu này.
5. Nếu token đã bị lộ, vào trang quản lý của nhà cung cấp để thu hồi (revoke) và tạo token mới.
6. Người dùng tự chịu quota/chi phí API bằng token cá nhân của mình.

## 5. Quy trình chỉnh sửa giao diện

Chỉ dành cho người biết sử dụng terminal và Git.

1. Mở thư mục dự án:

   ```powershell
   cd 'C:\Users\pc\Documents\ChatGPT\New project\trendscope-site'
   ```

2. Sao lưu hoặc kiểm tra thay đổi hiện có:

   ```powershell
   git status
   ```

3. Chỉnh sửa `dist/index.html` bằng trình soạn thảo mã.

4. Kiểm tra cú pháp JavaScript trong HTML:

   ```powershell
   node -e 'const fs=require("fs"),vm=require("vm"); const h=fs.readFileSync("dist/index.html","utf8"); const scripts=h.split("<script>").slice(1).map(s=>s.split("</script>")[0]); scripts.forEach((s,i)=>new vm.Script(s,{filename:"inline-"+i+".js"})); console.log("Inline JavaScript syntax OK");'
   ```

5. Ghi lại thay đổi vào Git:

   ```powershell
   git add -- dist/index.html
   git commit -m "Mô tả thay đổi ngắn gọn"
   ```

Không dùng `git reset --hard` hoặc xóa các tệp triển khai nếu không chắc chắn.

## 6. Quy trình xuất bản sau khi sửa

Trang dùng dịch vụ Sites. Việc xuất bản cần một mã xác thực ngắn hạn, không được ghi vào file hoặc đưa vào lệnh đã lưu.

Quy trình an toàn:

1. Lấy quyền ghi kho mã ngắn hạn qua công cụ Sites.
2. Đẩy đúng commit vừa tạo lên nhánh `main` của kho Sites.
3. Đóng gói hai thư mục `.openai` và `dist` thành file `.tar.gz`.
4. Lưu phiên bản và triển khai bằng công cụ Sites.
5. Chờ trạng thái triển khai thành công, rồi tải lại trang bằng `Ctrl+F5`.

Khi dùng Codex, chỉ cần nói “hãy xuất bản thay đổi TrendScope”; Codex sẽ thực hiện quy trình này. Không cần tự chia sẻ token Git hay token dịch vụ.

## 7. Google Trends, Apify và Thordata

- **Google Trends:** chỉ số 0–100 là chỉ số tương đối trong phạm vi quốc gia, thời gian, danh mục và loại tìm kiếm đã chọn.
- **Apify:** bản đồ vùng chỉ chạy khi bấm **Làm mới bằng Apify**, dùng token của chính người bấm. Chọn quốc gia Hàn Quốc, Việt Nam hoặc Nhật Bản sẽ thay đổi phạm vi vùng được trả về.
- **Thordata:** token cá nhân được lưu trong tab Kết nối API để dùng riêng khi tính năng Thordata được bật/cấu hình. Không dùng chung token giữa người dùng.
- Nếu không có dữ liệu thực trong phạm vi đã chọn, giao diện cần báo không có dữ liệu thay vì tạo biểu đồ giả.

## 8. Tên miền tùy chỉnh (tùy chọn)

Tên miền `md.trendscope.vn` đã được đăng ký chờ xác minh tại dịch vụ xuất bản. Để kích hoạt, cần sở hữu/quản lý DNS của `trendscope.vn` và tạo:

| Loại | Host | Giá trị |
|---|---|---|
| CNAME | `md` | `custom-domains.chatgpt.site` |
| TXT | `_openai-site-verification.md` | Lấy giá trị xác minh mới nhất từ cấu hình tên miền của Sites. |
| TXT | `_cf-custom-hostname.md` | Lấy giá trị xác minh mới nhất từ cấu hình tên miền của Sites. |

Không đưa giá trị TXT xác minh vào nơi công khai nếu không cần thiết. Sau khi DNS cập nhật, kiểm tra trạng thái tên miền trong Sites. Nếu không có tên miền riêng, tiếp tục dùng URL `trendscope-vn-studio.anhtuyet-spa1103.chatgpt.site`.

## 9. Danh sách kiểm tra khi có lỗi

1. Tải lại cứng bằng `Ctrl+F5`.
2. Kiểm tra đúng quốc gia, thời gian, loại tìm kiếm và danh mục trong Studio.
3. Chạy lại Studio trước khi mở Radar/Khu vực/Báo cáo.
4. Với Gemini/Apify/Thordata: kiểm tra token đã lưu trên đúng trình duyệt, quota còn đủ và không bị thu hồi.
5. Không gửi token khi xin hỗ trợ. Chỉ gửi thông báo lỗi, thời điểm xảy ra và ảnh màn hình đã che token.

