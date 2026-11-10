# ASL_AI

Luồng web hiện tại nhận dạng **ký tự ASL bằng SVM** từ 63 tọa độ bàn tay MediaPipe, ghép văn bản và dịch sang tiếng Việt. Trình duyệt xử lý webcam; server không truyền video giữa ứng viên và HR.

## Chạy API local

1. Tạo môi trường Python và cài `pip install -r requirements-api.txt`.
2. Sao chép `.env.example` thành `.env` trong thư mục `ASL_AI`.
3. Điền `ASL_TOKEN_SECRET` giống hệt biến cùng tên của backend Express. Giá trị phải là chuỗi ngẫu nhiên tối thiểu 32 byte.
4. Chạy backend, frontend và `python api/server.py` từ thư mục `ASL_AI`.

API đọc `PORT` (mặc định 5001), `FRONTEND_URL` và `.env` theo vị trí file, nên đường dẫn model không phụ thuộc thư mục chạy Gunicorn.

## Xác thực và endpoints

- `GET /health`: kiểm tra API và model đã tải.
- `POST /recognize/landmark`: JSON `{"landmarks": [63 số hữu hạn]}`; cần header `Authorization: Bearer <ticket>`.
- Socket.IO: gửi ticket trong `auth.token` khi kết nối, sau đó phát `join_room` với `room_id`.

Frontend lấy ticket từ Express qua `POST /api/v1/application/interview-access/:id`, sử dụng cookie đăng nhập. Backend kiểm tra quyền sở hữu đơn, hình thức ASL, phản hồi xác nhận và thời hạn phòng. Python kiểm tra chữ ký HS256, issuer, audience, subject, room, vai trò và thời hạn; từng sự kiện tiếp tục kiểm tra quyền thao tác. Client tự gửi `role` không làm thay đổi quyền.

HR được gửi câu hỏi và kết thúc phỏng vấn. Ứng viên được gửi landmarks, sửa và nộp câu trả lời. Mỗi câu trả lời chỉ được lưu một lần; frontend hiển thị nút thử lại nếu lưu bản ghi vào MongoDB thất bại.

## Render

```text
Root Directory: ASL_AI
Build Command: pip install -r requirements-api.txt
Start Command: gunicorn -c gunicorn.conf.py api.server:app
Health Check Path: /health
```

Giữ **một worker, một instance** vì phòng được lưu trong RAM. Các handler có khóa cho chế độ threaded. Phòng ngắt kết nối được giữ 30 phút và dọn khi có lượt vào phòng tiếp theo. Restart/deploy làm mất phiên chưa lưu. Xem [hướng dẫn deploy](../DEPLOYMENT.md) và `render.yaml` ở gốc repository.

## Model và desktop

Các file cần cho API nằm trong `models/letter/`: `svm_model.pkl`, `scaler.pkl`, `label_encoder.pkl`. Chúng được lưu bằng scikit-learn **1.7.2**; `requirements-api.txt` đã khóa đúng phiên bản.

`app.py` và `interview_app.py` là ứng dụng desktop, cần cài `requirements.txt` cùng môi trường webcam tương thích MediaPipe. Chúng tự dùng chế độ LETTER nếu thiếu phần I3D. Repository hiện **chưa có** kiến trúc `word_i3d_recognizer.py`, model từ I3D và danh sách nhãn tương ứng. API không cung cấp endpoint `/recognize/video`.

## Kiểm thử

Từ thư mục `ASL_AI`, chạy:

```text
python -m unittest discover -s tests -v
```

Kiểm thử sử dụng SVM thật; lời gọi dịch ra mạng được thay thế bằng kết quả giả lập. Kiểm thử API không truy cập webcam vật lý.
