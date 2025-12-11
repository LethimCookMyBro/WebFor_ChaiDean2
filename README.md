# 🛡️ Border Safety

ระบบเตือนภัยพลเรือนชายแดนไทย-กัมพูชา สำหรับประชาชน จ.ตราด

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E?logo=railway)
![Version](https://img.shields.io/badge/Version-2.5-blue)

🔗 **Live Demo**: [https://webforchaidean2-production.up.railway.app](https://webforchaidean2-production.up.railway.app)

---

## 🎯 เกี่ยวกับโปรเจกต์

ระบบช่วยให้ประชาชนในพื้นที่ชายแดน จ.ตราด สามารถ:

- 📍 **ตรวจสอบระยะจากชายแดน** ผ่าน GPS หรือเลือกตำบล
- 🗺️ **แผนที่จำลอง** แสดงเส้นชายแดนและรัศมีอาวุธ (BM-21, PHL-03)
- 📢 **แจ้งเหตุการณ์** เช่น เสียงระเบิด เสียงปืน พร้อมระบุตำแหน่ง
- 📚 **คู่มือเตรียมพร้อม** 72 ชม. และปฐมพยาบาลเบื้องต้น
- 👮 **Admin Dashboard** จัดการรายงาน, ประกาศ, บล็อก IP

> ⚠️ ระยะที่คำนวณเป็นการประมาณการ กรุณาติดตามข่าวจากหน่วยงานราชการ

---

## ✨ ฟีเจอร์หลัก

### 📍 ระดับระยะจากชายแดน

| ระดับ         | ระยะ        | สี  | รายละเอียด        |
| ------------- | ----------- | --- | ----------------- |
| 🚨 วิกฤต      | < 10 กม.    | 🔴  | อพยพทันที!        |
| ⚠️ อันตรายสูง | 10-20 กม.   | 🔴  | เตรียมอพยพ        |
| ระยะ BM-21    | 20-52 กม.   | 🟠  | ในระยะ BM-21 Grad |
| ระยะ PHL-03   | 52-130 กม.  | 🟡  | ในระยะ PHL-03     |
| ระยะขยาย      | 130-160 กม. | 🟢  | ความเสี่ยงต่ำ     |
| ✅ ปลอดภัย    | > 160 กม.   | ✅  | นอกระยะอาวุธ      |

### 🔐 ระบบความปลอดภัย

- ✅ JWT Authentication + Refresh Tokens
- ✅ bcrypt Password Hashing (ADMIN_PASSWORD_HASH)
- ✅ CSRF Protection
- ✅ Rate Limiting (Auth: 5/15min, API: 100/15min)
- ✅ XSS/SQLi Attack Detection
- ✅ IP Blocking (Manual + Auto)
- ✅ Request Audit Logging

### 💾 Database

- SQLite (Persistent storage)
- Auto cleanup expired tokens/logs
- WAL mode for better concurrency

---

## 🚀 Railway Deployment

### Environment Variables (Required)

```env
# Authentication
JWT_SECRET=<64-char-hex-secret>
JWT_REFRESH_SECRET=<64-char-hex-secret>
ADMIN_PASSWORD_HASH=<bcrypt-hash>

# Server
NODE_ENV=production
DATABASE_PATH=/data/database.sqlite

# CORS
FRONTEND_URL=https://your-app.up.railway.app
CORS_ORIGINS=https://your-app.up.railway.app
```

### Generate Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Admin Password Hash
node -e "require('bcryptjs').hash('YourPassword', 12).then(console.log)"
```

### Railway Volume Mount

สร้าง Volume Mount:

- **Mount Path**: `/data`
- **Name**: `border-safety-data`

---

## 💻 Local Development

### Prerequisites

- Node.js 18+
- npm

### Quick Start

```bash
# Clone
git clone https://github.com/LethimCookMyBro/WebFor_ChaiDean2.git
cd KuyHunsen

# Backend
cd backend
npm install
cp .env.example .env  # แก้ไข config
npm start

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Local URLs

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | https://localhost:5174       |
| Backend  | http://localhost:3001        |
| Admin    | https://localhost:5174/admin |

---

## 📁 โครงสร้างโปรเจกต์

```
KuyHunsen/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomeTab.jsx        # หน้าแรก + สถานะ
│       │   ├── CheckTab.jsx       # เช็คระยะจากชายแดน
│       │   ├── MapTab.jsx         # แผนที่จำลอง + Simulation
│       │   ├── GuideTab.jsx       # คู่มือเตรียมพร้อม
│       │   ├── AdminDashboard.jsx # จัดการระบบ
│       │   └── AdminLoginPage.jsx # เข้าสู่ระบบ Admin
│       ├── components/
│       │   ├── ReportForm.jsx     # ฟอร์มแจ้งเหตุ
│       │   └── LiveReports.jsx    # รายงาน Real-time
│       └── config/
│           └── api.js             # API Config
├── backend/
│   ├── server.js                  # Express Server
│   ├── db/
│   │   └── schema.sql             # Database Schema
│   ├── services/
│   │   ├── database.js            # SQLite Operations
│   │   ├── cache.js               # In-memory Cache
│   │   └── autoBlocker.js         # Auto IP Blocking
│   ├── routes/v1/
│   │   ├── auth.js                # Login/Logout
│   │   ├── reports.js             # รายงานเหตุการณ์
│   │   ├── status.js              # Threat Level + Broadcasts
│   │   ├── admin.js               # Logs + IP Blocking
│   │   ├── locate.js              # Distance Calculation
│   │   └── geo.js                 # GeoJSON Data
│   └── middleware/
│       ├── auth.js                # JWT Verification
│       ├── security.js            # Rate Limit + Sanitize
│       ├── csrf.js                # CSRF Protection
│       └── audit.js               # Activity Logging
├── Dockerfile                     # Production Build
├── railway.json                   # Railway Config
└── docker-compose.yml             # Local Docker
```

---

## 📡 API Endpoints

### Public

| Method | Endpoint                        | Description         |
| ------ | ------------------------------- | ------------------- |
| GET    | `/health`                       | Health check        |
| GET    | `/api/v1/status`                | System status       |
| GET    | `/api/v1/status/threat-level`   | ระดับภัยคุกคาม      |
| GET    | `/api/v1/status/broadcasts`     | ประกาศ              |
| GET    | `/api/v1/reports?verified=true` | รายงานที่ยืนยันแล้ว |
| POST   | `/api/v1/reports`               | ส่งรายงานใหม่       |
| POST   | `/api/v1/locate/check`          | เช็คระยะจากชายแดน   |
| GET    | `/api/v1/geo/districts`         | ข้อมูลอำเภอ/ตำบล    |

### Admin (Requires Auth)

| Method | Endpoint                        | Description     |
| ------ | ------------------------------- | --------------- |
| POST   | `/api/v1/auth/admin/login`      | Admin Login     |
| POST   | `/api/v1/auth/logout`           | Logout          |
| PUT    | `/api/v1/status/threat-level`   | เปลี่ยนระดับภัย |
| GET    | `/api/v1/admin/logs`            | System Logs     |
| DELETE | `/api/v1/admin/logs`            | Clear Logs      |
| GET    | `/api/v1/admin/blocked-ips`     | ดู IP ที่บล็อก  |
| POST   | `/api/v1/admin/blocked-ips`     | บล็อก IP        |
| DELETE | `/api/v1/admin/blocked-ips/:ip` | ปลด IP          |
| PUT    | `/api/v1/reports/:id/verify`    | ยืนยันรายงาน    |
| PUT    | `/api/v1/reports/:id`           | แก้ไขรายงาน     |
| DELETE | `/api/v1/reports/:id`           | ลบรายงาน        |

---

## 🐳 Docker

### Docker Compose

```bash
docker-compose up -d
```

### Build Manually

```bash
docker build -t border-safety .
docker run -p 8080:8080 -v ./data:/data border-safety
```

---

## 🆘 เบอร์ฉุกเฉิน จ.ตราด

| บริการ          | หมายเลข     |
| --------------- | ----------- |
| แจ้งเหตุฉุกเฉิน | 191         |
| รถพยาบาล        | 1669        |
| ดับเพลิง        | 199         |
| ปภ.             | 1784        |
| ศูนย์ ปภ.ตราด   | 039-511-603 |

---

## 📜 License

MIT License

---

> ⚠️ **ข้อควรระวัง**: ข้อมูลในระบบนี้เป็นการประมาณการเบื้องต้น ไม่ใช่ข้อมูลทางการ กรุณาติดตามประกาศจากกรมป้องกันและบรรเทาสาธารณภัย (ปภ.)
