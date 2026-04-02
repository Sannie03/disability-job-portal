# ASL_AI - Unified Sign Language Recognition System

Hệ thống nhận dạng ngôn ngữ ký hiệu Mỹ (ASL) kết hợp:
- **Nhận dạng chữ cái** (A-Z) bằng SVM + MediaPipe — accuracy 99.42%
- **Nhận dạng từ** (100 từ ASL) bằng I3D 3D-CNN — accuracy 65.89% top-1
- **Dịch tự động** sang tiếng Việt qua Google Translate

## Cài đặt

```bash
cd ASL_AI
pip install -r requirements.txt
```

## Sử dụng

### Desktop App (real-time webcam)

```bash
python app.py
```

**Phím điều khiển:**
| Phím | Chức năng |
|------|-----------|
| Q | Thoát |
| C | Xóa hết text |
| Backspace | Xóa ký tự cuối |
| SPACE | Thêm khoảng trắng / Nhận dạng từ (khi đang record) |
| M | Chuyển mode: AUTO → LETTER → WORD |

**Chế độ hoạt động:**
- **AUTO**: Tự động phát hiện tay tĩnh (chữ cái) hay tay động (từ)
- **LETTER**: Chỉ nhận dạng chữ cái A-Z
- **WORD**: Chỉ nhận dạng từ bằng I3D

### Flask API

```bash
python api/server.py
```

**Endpoints:**
- `GET /health` — Kiểm tra trạng thái
- `POST /recognize/video` — Nhận dạng từ qua video (multipart/form-data, key: `video`)
- `POST /recognize/landmark` — Nhận dạng chữ cái qua landmarks (JSON: `{"landmarks": [63 values]}`)

## Cấu trúc project

```
ASL_AI/
├── models/               # Trained models
│   ├── letter/           # SVM letter recognition (A-Z)
│   └── word_i3d/         # I3D word recognition (100 words)
├── i3d/                  # I3D model architecture
├── engine/               # Core recognition modules
│   ├── letter_recognizer.py
│   ├── word_i3d_recognizer.py
│   ├── motion_detector.py
│   ├── stabilizer.py
│   ├── text_buffer.py
│   └── translator.py
├── api/                  # Flask REST API
│   └── server.py
├── app.py                # Desktop app (OpenCV)
└── requirements.txt
```

## Models

| Model | Task | Accuracy | Input |
|-------|------|----------|-------|
| SVM (RBF) | Chữ cái A-Z | 99.42% | MediaPipe landmarks (63-dim) |
| I3D (Inception 3D) | 100 từ ASL | 65.89% top-1 | Video frames (64×224×224) |
