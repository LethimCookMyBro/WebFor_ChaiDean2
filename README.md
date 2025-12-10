# 📍 Border Safety

ระบบเช็คระยะจากชายแดนสำหรับประชาชน จ.ตราด

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Version](https://img.shields.io/badge/Version-2.4-blue)

---

## 🎯 เกี่ยวกับโปรเจกต์

- 📍 **ตรวจสอบระยะจากชายแดน** ผ่าน GPS หรือเลือกตำบล
- 🗺️ **แผนที่จำลอง** แสดงเส้นชายแดน
- 📢 **แจ้งเหตุการณ์** พร้อมระบุตำแหน่ง
- 📚 **คู่มือเตรียมพร้อม** และปฐมพยาบาล
- 👮 **Admin Dashboard** จัดการระบบ

> ⚠️ ระยะที่คำนวณเป็นการประมาณการ กรุณาติดตามข่าวจากหน่วยงานราชการ

---

## ✨ ฟีเจอร์

### 📍 ระดับระยะจากชายแดน

| ระดับ            | ระยะ      |
| ---------------- | --------- |
| 🔴 ใกล้ชายแดนมาก | < 10 กม.  |
| 🟠 ใกล้ชายแดน    | 10-20 กม. |
| 🟡 ระยะปานกลาง   | 20-50 กม. |
| 🟢 ค่อนข้างไกล   | 50-90 กม. |
| ✅ ไกลจากชายแดน  | > 90 กม.  |

### 🔐 Security

- JWT Authentication + Refresh Tokens
- bcrypt Password Hashing
- CSRF Protection
- Rate Limiting
- XSS/SQLi Detection
- IP Blocking

### 💾 Storage

- SQLite Database (ข้อมูลไม่หายเมื่อ restart)

---

## 🚀 การติดตั้ง

### Prerequisites

- Node.js 18+

### Quick Start

```bash
# Clone
git clone https://github.com/LethimCookMyBro/WebFor_ChaiDean.git
cd KuyHunsen

# Backend
cd backend
cp .env.example .env
node server.js

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### URLs

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:5174 |
| Backend  | http://localhost:3001 |

---

## 📁 โครงสร้าง

```
KuyHunsen/
├── frontend/src/
│   ├── pages/
│   │   ├── HomeTab.jsx         # หน้าแรก + ข่าวสาร
│   │   ├── CheckTab.jsx        # เช็คระยะจากชายแดน
│   │   ├── MapTab.jsx          # แผนที่จำลอง
│   │   ├── GuideTab.jsx        # คู่มือเตรียมพร้อม
│   │   ├── AdminDashboard.jsx  # Admin Dashboard
│   │   └── AdminLoginPage.jsx  # Admin Login
│   ├── components/
│   │   ├── BottomNav.jsx       # เมนูล่าง
│   │   ├── ReportForm.jsx      # ฟอร์มแจ้งเหตุ
│   │   ├── LiveReports.jsx     # รายงานแบบ Real-time
│   │   ├── FirstAidGuide.jsx   # คู่มือปฐมพยาบาล
│   │   ├── SelfDefenseGuide.jsx
│   │   └── EmergencyChecklist.jsx
│   └── data/
│       ├── borderLine.js       # จุดชายแดน
│       └── tratTambons.js      # ข้อมูลตำบล
├── backend/
│   ├── server.js
│   ├── db/
│   │   ├── schema.sql
│   │   └── database.sqlite
│   ├── services/
│   │   ├── database.js
│   │   └── logger.js
│   ├── routes/v1/
│   │   ├── reports.js
│   │   ├── status.js
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── geo.js
│   │   └── locate.js
│   └── middleware/
│       ├── auth.js
│       ├── security.js
│       └── csrf.js
└── docker-compose.yml
```

---

## 📡 API Endpoints

| Method | Endpoint                      | Description       |
| ------ | ----------------------------- | ----------------- |
| GET    | `/api/health`                 | Health check      |
| POST   | `/api/v1/auth/admin/login`    | Admin login       |
| POST   | `/api/v1/auth/logout`         | Logout            |
| GET    | `/api/v1/reports`             | ดึงรายงาน         |
| POST   | `/api/v1/reports`             | ส่งรายงาน         |
| GET    | `/api/v1/status/threat-level` | ระดับภัยคุกคาม    |
| PUT    | `/api/v1/status/threat-level` | อัปเดตระดับภัย    |
| GET    | `/api/v1/status/broadcasts`   | ดึงประกาศ         |
| POST   | `/api/v1/status/broadcasts`   | สร้างประกาศ       |
| GET    | `/api/v1/admin/logs`          | ดึง logs          |
| GET    | `/api/v1/admin/blocked-ips`   | ดู IP ที่ถูกบล็อก |
| POST   | `/api/v1/admin/blocked-ips`   | บล็อก IP          |
| POST   | `/api/v1/locate/check`        | เช็คระยะ          |
| GET    | `/api/v1/geo/districts`       | ดึงอำเภอ          |

---

## 🔧 Environment Variables

ไฟล์ `backend/.env`:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
ADMIN_PASSWORD_HASH=<bcrypt hash>
```

สร้าง password hash:

```bash
node -e "require('bcryptjs').hash('your-password', 12).then(console.log)"
```

---

## 🐳 Docker

```bash
docker-compose up -d
```

---

## ⚠️ Deployment

### Vercel (ไม่รองรับ SQLite)

ต้องเปลี่ยนเป็น Turso, Supabase หรือ PlanetScale

### VPS / Docker

รองรับ SQLite ได้เลย

---

## 🆘 เบอร์ฉุกเฉิน

| บริการ          | หมายเลข     |
| --------------- | ----------- |
| แจ้งเหตุฉุกเฉิน | 191         |
| รถพยาบาล        | 1669        |
| ดับเพลิง        | 199         |
| ปภ.             | 1784        |
| ศูนย์ปภ.ตราด    | 039-511-603 |

---

## 📜 License

MIT License

---

> ⚠️ ข้อมูลในระบบนี้เป็นการประมาณการ กรุณาติดตามประกาศจากหน่วยงานป้องกันและบรรเทาสาธารณภัย
