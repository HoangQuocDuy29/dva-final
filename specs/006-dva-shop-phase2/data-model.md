# Phase 1 Data Model: DVA Shop Module (Phase 2.1)

**Branch**: `006-dva-shop-phase2`  
**Updated**: 2026-11-11  
**Database**: Neon PostgreSQL (Additive-only via `npx prisma db push` & `npx prisma generate`)

---

## 1. Prisma Schema (`prisma/schema.prisma`)

```prisma
enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  COMPLETED
  CANCELLED
}

enum DeliveryMethod {
  COURT_PICKUP
  HOME_DELIVERY
}

/// Sản phẩm chính hãng tại DVA Store (Áo đấu, Bó gối, Tất, Phụ kiện)
model Product {
  id            String      @id @default(uuid())
  sku           String      @unique // VD: 'DVA-JSY-SLV-01'
  slug          String?     // URL slug cho route '/shop/[category]/[product-slug]' (VD: 'dva-pro-jersey-2026')
  name          String
  category      String      // 'SLEEVELESS' | 'SHORT_SLEEVE' | 'WOMEN' | 'KNEE_PADS' | 'SOCKS' | 'JERSEYS' | 'VOLLEYBALLS' | 'TRAINING_GEAR' | 'ACCESSORIES'
  originalPrice Int?        // Giá gốc trước giảm (VNĐ) - nếu > price sẽ gạch ngang và hiện % giảm
  price         Int         // Giá bán thực tế sau giảm (VNĐ)
  stock         Int         @default(50)
  frontImage    String      // URL ảnh mặt trước (Cloudinary / local)
  backImage     String?     // URL ảnh mặt sau (hiển thị khi hover / zoom)
  sizes         String[]    @default(["S", "M", "L", "XL", "2XL"])
  colors        String[]    @default([])
  description   String?     @db.Text
  isPaused      Boolean     @default(false) // Tạm dừng bán (Temporarily Out of Stock / Coming Back Soon)
  isActive      Boolean     @default(true)

  // Relations
  orderItems    OrderItem[]

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([isActive, category])
  @@index([category, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("products")
}

/// Đơn đặt hàng DVA Shop & theo dõi thanh toán VietQR / vận chuyển
model Order {
  id                  String         @id @default(uuid())
  orderCode           String         @unique // VD: 'DVA-SHOP-20261110-849201'
  customerName        String
  customerPhone       String
  customerEmail       String?
  socialLink          String?        // Instagram / Facebook link hoặc handle
  deliveryMethod      DeliveryMethod @default(COURT_PICKUP)
  shippingAddress     String?        @db.Text
  quantity            Int            @default(1) // Tổng số lượng đặt mua
  totalAmount         Int            // Tổng thanh toán (VNĐ) = price * quantity
  status              OrderStatus    @default(PENDING)
  transferContent     String         // Cú pháp VietQR: 'DVA [CAT_CODE] [ORDER_CODE_SUFFIX]'
  notes               String?        @db.Text

  customerConfirmedAt DateTime?      // Thời điểm khách bấm 'I Have Transferred / Confirm Order'
  shippingEmailSentAt DateTime?      // Thời điểm Admin bấm 'Send Shipping Update' (Email chặng 2)

  // Relations
  items               OrderItem[]

  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  @@index([status, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@index([customerPhone])
  @@index([customerEmail])
  @@map("orders")
}

/// Chi tiết từng mặt hàng trong đơn hàng DVA Shop (kèm thông số in áo cá nhân hóa)
model OrderItem {
  id           String   @id @default(uuid())
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Restrict)

  productName  String
  category     String
  sku          String
  size         String?  // 'S' | 'M' | 'L' | 'XL' | '2XL' | 'Free Size' (Không dùng XS)
  color        String?
  quantity     Int      @default(1)
  unitPrice    Int      // Giá bán thực tế tại thời điểm đặt (VNĐ)

  // Thông số cá nhân hóa dành cho danh mục Áo (Jerseys)
  height       Float?   // Chiều cao khách (cm)
  weight       Float?   // Cân nặng khách (kg)
  customName   String?  // PLAYER NAME - Tên thi đấu in sau lưng áo
  customNumber String?  // Giữ cột optional dưới DB để bảo toàn schema, không hiển thị trên form

  createdAt    DateTime @default(now())

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```
