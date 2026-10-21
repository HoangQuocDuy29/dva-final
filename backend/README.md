# DVA Volleyball Club - Backend Architecture & Deployment Guide

This backend is built with **NestJS**, **Prisma ORM**, and **PostgreSQL**, optimized for deployment on **Render**, **Railway**, or **Fly.io** with managed PostgreSQL on **Neon.tech** or **Supabase**.

## 1. Features
- **Prisma Schema (`prisma/schema.prisma`)**: Full relational models for Users, Players, Courts, Bookings, Training, News, and Member Applications.
- **RBAC**: Multi-role security (`SUPERADMIN`, `ADMIN`, `PLAYER`).
- **Google Sheets Integration (`googleapis`)**: Real-time appending to Google Spreadsheet across 3 tabs:
  - `Member_Registrations`
  - `Court_Bookings`
  - `Training_Registrations`
- **Dynamic VietQR Integration**:
  - Bank: MB Bank
  - Account Number: `0002090671521`
  - Account Name: `HOANG QUOC DUY`
  - Syntax: `DVA-TT-YYYYMMDD-XXXX`
- **Cloudinary Integration**: Signed pre-upload URLs for player avatars & news thumbnails.

## 2. Quickstart Locally
```bash
npm install
npx prisma generate
npm run start:dev
```

## 3. Deployment to Render / Railway
1. Create a free PostgreSQL instance on **Neon.tech** or **Supabase**.
2. Copy the connection string to `DATABASE_URL`.
3. In Render/Railway:
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run prisma:migrate && npm run start:prod`
   - Add environment variables from `.env.example`.
