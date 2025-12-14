# 📋 Prompt.md - เอกสารภาพรวมโปรเจกต์ Border Safety

> **วัตถุประสงค์**: เอกสารนี้อธิบายภาพรวม, โครงสร้างโค้ด, และฟีเจอร์ต่างๆ ของโปรเจกต์ เพื่อให้นักพัฒนารุ่นต่อไปสามารถสานต่อได้

---

## 🎯 โปรเจกต์นี้คืออะไร?

**Border Safety** เป็นระบบเตือนภัยพลเรือนสำหรับประชาชนบริเวณชายแดนไทย-กัมพูชา โดยเฉพาะพื้นที่ จ.ตราด

### ฟีเจอร์หลัก:

- 📍 ตรวจสอบระยะห่างจากชายแดนผ่าน GPS หรือเลือกตำบล
- 🗺️ แผนที่จำลองแสดงเส้นชายแดนและรัศมีอาวุธ (BM-21, PHL-03)
- 📢 ระบบแจ้งเหตุการณ์ (Live Reports) - เสียงระเบิด, เสียงปืน, ฯลฯ
- 📚 คู่มือเตรียมพร้อม 72 ชม. และปฐมพยาบาล
- 👮 Admin Dashboard จัดการรายงาน, ประกาศ, บล็อก IP

� **Live Demo**: https://webforchaidean2-production.up.railway.app

---

## 📁 โครงสร้างโปรเจกต์

```
KuyHunsen/
├── frontend/                     # React Frontend (Vite)
│   └── src/
│       ├── pages/                # หน้าหลัก
│       │   ├── HomeTab.jsx       # หน้าแรก + สถานะระบบ
│       │   ├── CheckTab.jsx      # เช็คระยะจากชายแดน
│       │   ├── MapTab.jsx        # แผนที่จำลอง + Simulation
│       │   ├── GuideTab.jsx      # คู่มือเตรียมพร้อม
│       │   ├── FeedbackPage.jsx  # หน้า Feedback
│       │   ├── AdminDashboard.jsx # จัดการระบบ
│       │   └── AdminLoginPage.jsx # Login Admin
│       │
│       ├── components/           # Components ย่อย
│       │   ├── ThreatBanner.jsx      # แบนเนอร์ระดับภัยคุกคาม
│       │   ├── AutoLocationBanner.jsx # GPS + Location
│       │   ├── ReportForm.jsx        # ฟอร์มแจ้งเหตุ
│       │   ├── LiveReports.jsx       # รายงาน Real-time
│       │   ├── EmergencyPanel.jsx    # ปุ่มฉุกเฉิน
│       │   ├── FirstAidGuide.jsx     # คู่มือปฐมพยาบาล
│       │   ├── SelfDefenseGuide.jsx  # คู่มือป้องกันตัว
│       │   └── BottomNav.jsx         # Navigation Bar
│       │
│       ├── config/api.js         # API_BASE configuration
│       └── data/tambons.js       # ข้อมูลตำบล จ.ตราด
│
├── backend/                      # Express.js Backend
│   ├── server.js                 # Main Express server
│   │
│   ├── routes/v1/                # API endpoints
│   │   ├── auth.js               # Login/Logout
│   │   ├── reports.js            # CRUD รายงาน
│   │   ├── status.js             # Threat Level, Broadcasts
│   │   ├── admin.js              # Logs, IP Blocking
│   │   ├── locate.js             # Distance Calculation
│   │   ├── geo.js                # Districts/Tambons
│   │   └── feedback.js           # Feedback
│   │
│   ├── services/                 # Business logic
│   │   ├── database.js           # SQLite CRUD
│   │   ├── cache.js              # In-memory cache
│   │   ├── autoBlocker.js        # Auto IP blocking
│   │   └── geoEngine.js          # Geographic calculations
│   │
│   ├── middleware/               # Express middleware
│   │   ├── auth.js               # JWT verification
│   │   ├── security.js           # Rate limit, XSS/SQLi
│   │   ├── csrf.js               # CSRF protection
│   │   └── audit.js              # Activity logging
│   │
│   └── db/schema.sql             # Database schema
│
├── Dockerfile                    # Production build
├── docker-compose.yml            # Local Docker
├── railway.json                  # Railway config
├── README.md                     # Project docs
└── SECURITY.md                   # Security docs
```

---

## 🔧 Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Frontend   | React 18 + Vite         |
| Styling    | TailwindCSS             |
| Map        | Leaflet.js              |
| Backend    | Express.js 4            |
| Database   | SQLite (better-sqlite3) |
| Auth       | JWT + bcryptjs          |
| Deployment | Railway + Docker        |

---

## 🔐 ระบบความปลอดภัย

| Feature       | รายละเอียด                                 |
| ------------- | ------------------------------------------ |
| JWT Auth      | Access Token (15min) + Refresh (7d)        |
| Rate Limiting | Auth: 5/15min, API: 100/15min              |
| CSRF          | Double-submit cookie pattern               |
| XSS/SQLi      | Input sanitization + parameterized queries |
| IP Blocking   | Manual + Auto-block                        |
| Audit Logging | Log security events                        |

---

## 📊 Database Tables

```sql
reports        -- รายงานเหตุการณ์ (type, location, GPS, verified)
system_status  -- สถานะระบบ (threat_level, etc.)
broadcasts     -- ประกาศ (message, priority, active)
blocked_ips    -- IP ที่บล็อก
audit_logs     -- Logs การใช้งาน
```

---

## 🚀 วิธี Run

### Development

```bash
# Backend (Port 3001)
cd backend && npm install && npm start

# Frontend (Port 5174)
cd frontend && npm install && npm run dev
```

### Production (Docker)

```bash
docker-compose up -d
```

---

## 📡 API Endpoints หลัก

| Method | Endpoint                      | Description       |
| ------ | ----------------------------- | ----------------- |
| GET    | `/api/v1/status/threat-level` | ระดับภัยคุกคาม    |
| GET    | `/api/v1/reports`             | รายงานทั้งหมด     |
| POST   | `/api/v1/reports`             | ส่งรายงานใหม่     |
| POST   | `/api/v1/locate/check`        | เช็คระยะจากชายแดน |
| POST   | `/api/v1/auth/admin/login`    | Admin Login       |

---

## � สิ่งที่ควรพัฒนาต่อ

1. Push Notifications
2. Offline Mode
3. SMS Alerts
4. Mobile App (React Native)
5. Automated Testing

---

_Last Updated: December 12, 2024_
