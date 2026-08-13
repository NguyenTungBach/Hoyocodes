# Hoyocodes

Hệ thống quản lý **redeem code** (mã đổi quà): thu thập code theo lịch, lưu database, và gửi thông báo Slack / email đúng giờ.

## Kiến trúc

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| **Backend** | Express.js (`backend-express`) | API, auth, mail/Slack, scheduler worker |
| **Frontend** | Next.js (`frontend-nextjs`) | Màn quản lý redeem code |
| **Database** | MySQL **hoặc** Supabase (Postgres) | Lưu code đã tích + dữ liệu sync từ lịch |

### Database

- **Local:** MySQL qua XAMPP (`127.0.0.1:3306`, cấu hình trong `backend-express/.env`).
- **Deploy / cloud:** có thể dùng MySQL hoặc Supabase; BE hỗ trợ chuyển qua biến môi trường (`DB_CONNECTION`, `DB_HOST`, … / connection string).

### Luồng chính

1. **Màn quản lý redeem code (FE)** — xem / quản lý code đã lưu trong DB.
2. **Database** — lưu thông tin code đã tích và dữ liệu được cập nhật từ job lập lịch.
3. **Schedule (GitHub Actions)** — mỗi ngày gọi API miễn phí, lấy dữ liệu mới, ghi vào database qua API BE.
4. **Schedule (BE)** — đến giờ quy định gọi API BE để gửi thông báo **Slack** và **email**.

```
GitHub Actions (daily)
        │  gọi free API → đồng bộ DB
        ▼
   Backend Express  ←→  MySQL / Supabase
        ▲
        │  Slack / Email khi đến giờ
   Scheduler (BE)
        ▲
   Frontend Next.js (quản lý redeem code)
```

## Yêu cầu

- Node.js `>= 20`
- MySQL local (XAMPP) khi chạy local
- Copy env mẫu:
  - `backend-express/.env.example` → `.env`
  - `frontend-nextjs/.env.example` → `.env`

## Chạy Backend

```bash
cd backend-express
npm install
# Cấu hình .env (DB MySQL XAMPP local)
npm run db:migrate
npm run dev
```

- API mặc định: `http://localhost:3400`
- Scheduler riêng (nếu cần chạy job Slack/email):

```bash
npm run schedule:worker
```

- Production (PM2: API + queue + schedule):

```bash
npm run pm2:start
```

## Chạy Frontend

```bash
cd frontend-nextjs
npm install
# Cấu hình .env (NEXT_PUBLIC_API_URL trỏ về BE)
npm run dev
```

- FE mặc định: `http://localhost:3000`

## Thư mục dự án

```
Hoyocodes/
├── READ_ME.md
├── backend-express/     # Express API
└── frontend-nextjs/     # Next.js UI quản lý redeem code
```
