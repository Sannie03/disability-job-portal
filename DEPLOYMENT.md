# Deploy CareerConnect với MongoDB Atlas, Render và Vercel

| Thành phần | Nơi chạy | Địa chỉ |
| --- | --- | --- |
| React/Vite | Vercel | `https://52hzconnect.site` |
| Express API | Render | `https://api.52hzconnect.site` |
| Flask/Socket.IO ASL | Render | `https://asl.52hzconnect.site` |
| MongoDB | Atlas | Backend kết nối riêng qua `DB_URL` |

Các file cấu hình đã có trong repo. Chúng chưa tự tạo dịch vụ, đổi DNS hoặc đưa website lên mạng.

## 1. MongoDB Atlas

1. Tạo Project và Cluster, ưu tiên khu vực Singapore để gần hai service Render.
2. Trong **Database Access**, tạo database user có quyền `readWrite` trên database **`Job_Portal`**. Đây là tài khoản khác với tài khoản đăng nhập Atlas.
3. Chọn **Connect > Drivers > Node.js**, sao chép connection string, thay username/password thật và điền vào `DB_URL` trên backend. Mã hóa ký tự đặc biệt của mật khẩu khi đưa vào URI.
4. Sau khi tạo backend Render, mở **Connect > Outbound**, sao chép tất cả dải IP. Thêm từng dải vào Atlas **Network Access**.
5. Nếu muốn giữ dữ liệu ở MongoDB local hoặc cluster khác, chuyển dữ liệu đó riêng trước khi đưa website vào sử dụng. Cluster mới không tự chứa dữ liệu cũ.

Backend chọn database `Job_Portal` và chờ kết nối MongoDB trước khi mở cổng. `/health` trả 200 khi MongoDB đang kết nối, 503 nếu mất kết nối.

## 2. Hai service Render

Push code lên repository Git. Trong Render tạo **Blueprint** từ `render.yaml` ở gốc repo. File này cấu hình hai service Free tại Singapore:

| Thiết lập | Backend | ASL |
| --- | --- | --- |
| Root Directory | `backend` | `ASL_AI` |
| Build | `npm ci` | `pip install -r requirements-api.txt` |
| Start | `npm start` | `gunicorn -c gunicorn.conf.py api.server:app` |
| Health Check Path | `/health` | `/health` |

Điền các giá trị backend được Render yêu cầu:

```dotenv
DB_URL=<connection string Atlas>
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
```

Blueprint tự tạo `JWT_SECRET_KEY` và **một `ASL_TOKEN_SECRET` dùng chung** trong environment group `careerconnect-common`. Cả backend và ASL phải nhận đúng cùng một giá trị. Không đưa các secret này vào biến `VITE_*`.

Nếu tạo service thủ công, đặt các biến sau trên **cả hai service**:

```dotenv
NODE_ENV=production
FRONTEND_URL=https://52hzconnect.site,https://www.52hzconnect.site
ASL_TOKEN_SECRET=<cùng chuỗi ngẫu nhiên tối thiểu 32 byte>
TZ=Asia/Ho_Chi_Minh
```

Đặt thêm trên backend:

```dotenv
JWT_SECRET_KEY=<chuỗi ngẫu nhiên khác, tối thiểu 32 byte>
JWT_EXPIRE=7d
COOKIE_EXPIRE=7
COOKIE_SAME_SITE=lax
TRUST_PROXY_HOPS=1
```

Tên cũ `VITE_GOOGLE_CLIENT_ID` trên backend vẫn được hỗ trợ; nên dùng `GOOGLE_CLIENT_ID`. Render cung cấp `PORT`; cả hai server đã đọc biến này. Kiểm tra `req.ip` phản ánh đúng IP client với cấu hình proxy thực tế, nhất là nếu thêm Cloudflare proxy.

ASL phải có ba file `svm_model.pkl`, `scaler.pkl`, `label_encoder.pkl` trong `models/letter/`. Requirements API đã khóa scikit-learn 1.7.2 theo phiên bản lưu model và bỏ dependency chỉ dùng cho desktop.

Giữ ASL **một instance, một Gunicorn worker**. Phòng ở RAM, được bảo vệ bằng khóa khi chạy nhiều thread; phòng ngắt kết nối được giữ 30 phút và dọn khi có lượt vào phòng sau. Restart/deploy làm mất phỏng vấn chưa lưu. Bản ghi hoàn tất được frontend gửi sang Express để lưu MongoDB; lỗi lưu có nút thử lại. Service Free có thể ngủ khi không có lưu lượng, nên dùng instance luôn hoạt động khi phỏng vấn thực tế.

## 3. Frontend Vercel

Import cùng repository:

| Thiết lập | Giá trị |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Node.js | 22.x hoặc 24.x |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Đặt biến **Production**:

```dotenv
VITE_API_URL=https://api.52hzconnect.site/api/v1
VITE_ASL_SERVER_URL=https://asl.52hzconnect.site
VITE_GOOGLE_CLIENT_ID=<cùng OAuth client ID với backend>
```

Redeploy khi đổi biến `VITE_*` vì giá trị được đưa vào bundle lúc build. Không đặt thông tin database hoặc secret của backend tại đây.

`frontend/vercel.json` hỗ trợ truy cập trực tiếp và F5 trên trang con. Frontend chờ khôi phục phiên đăng nhập trước khi dựng các trang bảo vệ.

## 4. Tên miền và cookie

Thêm `52hzconnect.site` và `www.52hzconnect.site` trong Vercel **Settings > Domains**, chuyển hướng `www` về miền chính. Thêm `api.52hzconnect.site` và `asl.52hzconnect.site` vào **Settings > Custom Domains** của từng service Render.

Tại nhà cung cấp DNS đang quản lý miền:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | Giá trị chính xác Vercel hiển thị |
| CNAME | `www` | Giá trị chính xác Vercel hiển thị |
| CNAME | `api` | Hostname `onrender.com` của backend |
| CNAME | `asl` | Hostname `onrender.com` của ASL |

Không thêm `https://` hoặc đường dẫn vào giá trị DNS. Giữ các bản ghi email không liên quan. Chờ domain được xác nhận và có HTTPS trước khi kiểm tra đăng nhập.

`SameSite=Lax` phù hợp khi frontend và API cùng dùng HTTPS dưới miền `52hzconnect.site`. Cookie đăng nhập thuộc riêng host API, có `HttpOnly`, và `Secure` khi production; Axios đã bật `withCredentials`.

Nếu dùng frontend `vercel.app` và backend `onrender.com`, chúng khác site: cần `SameSite=None`, `Secure`, CORS đúng và trình duyệt vẫn có thể chặn cookie bên thứ ba. Ưu tiên kiểm tra qua custom domain. Nếu hỗ trợ một preview cụ thể, thêm origin đó vào `FRONTEND_URL` trên các service liên quan.

## 5. Google Login và quyền Admin

Trong OAuth Web Client của Google, thêm vào **Authorized JavaScript origins**:

```text
https://52hzconnect.site
https://www.52hzconnect.site
```

Local có thể thêm `http://localhost:5173`. Luồng hiện tại dùng JavaScript callback.

Tài khoản Admin nội bộ hiện có vẫn đăng nhập bằng mật khẩu. Đăng ký công khai và Google Login không được tạo Admin; việc cấp quyền Admin cần thực hiện qua quy trình quản trị nội bộ.

## 6. Chạy local và kiểm tra

Sao chép từng `.env.example` thành `.env` trong `backend`, `frontend`, `ASL_AI`, rồi điền thông tin thật. File mẫu không chứa secret.

Tạo secret bằng lệnh sau, chạy riêng cho JWT và ASL:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sao chép **cùng giá trị ASL** vào `.env` backend và ASL.

Từ thư mục `backend`:

```text
npm ci
npm test
npm run dev
```

Từ thư mục `frontend`:

```text
npm ci
npm run build
npm run dev
```

Từ thư mục `ASL_AI`, trong môi trường Python riêng:

```text
pip install -r requirements-api.txt
python -m unittest discover -s tests -v
python api/server.py
```

Backend kiểm tra người dùng sở hữu đơn ứng tuyển, lịch ASL đã xác nhận và thời hạn phòng rồi cấp vé. Vé có hạn tối đa hai giờ và không vượt quá cuối ngày sau ngày phỏng vấn, theo giờ Việt Nam. Nếu hết hạn, vào lại phòng để xin vé mới. Server ASL kiểm tra chữ ký, phòng, vai trò và thời hạn trên từng thao tác.

Kiểm thử Python chạy SVM thật và giả lập dịch ra mạng; kiểm thử backend giả lập thao tác database. Chúng không kết nối Atlas, Google OAuth, Cloudinary hoặc webcam thật. Desktop cần thêm `requirements.txt`; khi thiếu kiến trúc và model I3D, app tự dùng chế độ LETTER thay vì lỗi import.

Sau deploy, kiểm tra `/health` của hai service, danh sách tin, đăng ký/đăng nhập, F5 ở trang bảo vệ, upload CV, xác nhận lịch và phỏng vấn ASL bằng hai tài khoản trên trình duyệt HTTPS. Kiểm tra bản ghi hoàn tất đã lưu MongoDB.

## Tài liệu đối chiếu

- [Atlas với Render](https://render.com/docs/connect-to-mongodb-atlas)
- [Outbound IP của Render](https://render.com/docs/outbound-ip-addresses)
- [Render Blueprint](https://render.com/docs/blueprint-spec)
- [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Triển khai Flask-SocketIO](https://flask-socketio.readthedocs.io/en/latest/deployment.html)
