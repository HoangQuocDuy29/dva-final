import crypto from 'crypto';
import { env } from '../../config/env';
import { prisma, toOrderDto, toProductDto } from '../../config/prisma';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';
import {
  buildBookingVietQrUrl,
  removeVietnameseTones,
  sendAdminNotification,
  sendShopOrderConfirmationEmail,
  sendShopOrderShippingEmail,
} from '../../utils/email.service';
import {
  getShopCategoryCode,
  isJerseyCategory,
  slugifyProductName,
  StoreOrder,
} from '../../../src/types';
import {
  buildShopOrderSheetPayload,
  dispatchGoogleSheetsWebhookAsync,
} from '../integrations/sheets.service';

const NON_DELETABLE_ORDER_STATUSES = new Set(['PAID', 'SHIPPED', 'COMPLETED']);

function toShopOrderEmailPayload(
  order: StoreOrder,
  shippingExtra?: { trackingCode?: string | null; carrier?: string | null; shippingNotes?: string | null }
) {
  return {
    orderCode: order.orderCode,
    customerName: order.customerName,
    customerPhone: order.customerPhone || order.phone || '',
    customerEmail: order.customerEmail || order.email || null,
    socialLink: order.socialLink || null,
    deliveryMethod: order.deliveryMethod,
    shippingAddress: order.shippingAddress || null,
    totalAmount: order.totalAmount,
    status: order.status,
    transferContent: order.transferContent,
    notes: order.notes || null,
    trackingCode: shippingExtra?.trackingCode || null,
    carrier: shippingExtra?.carrier || null,
    shippingNotes: shippingExtra?.shippingNotes || null,
    items: order.items.map((it) => ({
      productName: it.productName,
      category: it.category,
      sku: it.sku,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice ?? it.price) || 0,
      height: it.height ?? undefined,
      weight: it.weight ?? undefined,
      customName: it.customName ?? undefined,
      customNumber: it.customNumber ?? undefined,
    })),
  };
}

export async function listProducts(opts: {
  isStaffUser: boolean;
  activeOnlyRequested: boolean;
  category?: string;
}) {
  const { isStaffUser, activeOnlyRequested, category } = opts;
  const cleanCat = category && category !== 'ALL' ? category : undefined;

  const loader = async () => {
    const where: Record<string, any> = {};
    if (!isStaffUser || activeOnlyRequested) {
      where.isActive = true;
      where.isPaused = false;
    }
    if (cleanCat) {
      where.category = cleanCat;
    }
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'desc' }, { createdAt: 'desc' }],
    });
    return products.map(toProductDto);
  };

  if (!isStaffUser || activeOnlyRequested) {
    return getOrSetCache(`store:products:public:${cleanCat || 'ALL'}`, 90_000, loader);
  }
  return loader();
}

export async function getProductByIdOrSlug(idOrSlug: string, isStaffUser: boolean) {
  const loader = async () => {
    const where: Record<string, any> = {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }, { sku: idOrSlug }],
    };
    if (!isStaffUser) {
      where.isActive = true;
      where.isPaused = false;
    }
    const product = await prisma.product.findFirst({ where });
    if (!product) throw new HttpError(404, 'Product not found or currently unavailable');
    return toProductDto(product);
  };

  if (!isStaffUser) {
    return getOrSetCache(`store:product:public:${idOrSlug}`, 90_000, loader);
  }
  return loader();
}

export async function createProduct(data: Record<string, any>) {
  const frontImage = (data.frontImage || data.imageUrl || '/courts/btl.png').trim();
  const backImage = (data.backImage || frontImage).trim();
  const defaultSizes = isJerseyCategory(data.category)
    ? ['S', 'M', 'L', 'XL', '2XL']
    : data.category === 'KNEE_PADS'
      ? ['S/M', 'L/XL']
      : ['M (36-40)', 'L (41-45)'];

  const catCode = getShopCategoryCode(data.category);
  let uniqueSku = data.sku
    ? String(data.sku).trim().toUpperCase()
    : `DVA-${catCode}-${crypto.randomInt(100, 999)}`;
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.product.findUnique({ where: { sku: uniqueSku }, select: { id: true } });
    if (!exists) break;
    uniqueSku = `DVA-${catCode}-${crypto.randomInt(1000, 9999)}`;
  }

  const generatedSlug = data.slug ? String(data.slug).trim() : slugifyProductName(data.name);

  const created = await prisma.product.create({
    data: {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      sku: uniqueSku,
      slug: generatedSlug,
      name: data.name,
      category: data.category,
      originalPrice: data.originalPrice !== undefined ? Math.round(Number(data.originalPrice)) : null,
      price: Math.round(Number(data.price)),
      frontImage,
      backImage,
      description: data.description || '',
      sizes: Array.isArray(data.sizes) && data.sizes.length > 0 ? data.sizes : defaultSizes,
      colors: Array.isArray(data.colors) ? data.colors : [],
      stock: data.stock !== undefined ? Math.round(Number(data.stock)) : 50,
      badge: data.badge ? String(data.badge).trim() : null,
      allowCustomPrint: data.allowCustomPrint !== undefined ? Boolean(data.allowCustomPrint) : true,
      sortOrder: data.sortOrder !== undefined ? Math.round(Number(data.sortOrder)) : 0,
      isPaused: data.isPaused !== undefined ? Boolean(data.isPaused) : false,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });
  invalidateCache('store');
  return toProductDto(created);
}

export async function updateProduct(id: string, data: Record<string, any>) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Product not found');

  const { imageUrl, ...rest } = data;
  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      ...(rest.badge !== undefined ? { badge: rest.badge ? String(rest.badge).trim() : null } : {}),
      ...(rest.allowCustomPrint !== undefined ? { allowCustomPrint: Boolean(rest.allowCustomPrint) } : {}),
      ...(rest.sortOrder !== undefined ? { sortOrder: Math.round(Number(rest.sortOrder)) } : {}),
      ...(rest.originalPrice !== undefined ? { originalPrice: Math.round(Number(rest.originalPrice)) } : {}),
      ...(rest.price !== undefined ? { price: Math.round(Number(rest.price)) } : {}),
      ...(rest.stock !== undefined ? { stock: Math.round(Number(rest.stock)) } : {}),
      ...(rest.isPaused !== undefined ? { isPaused: Boolean(rest.isPaused) } : {}),
      ...(rest.frontImage !== undefined ? { frontImage: rest.frontImage } : imageUrl ? { frontImage: imageUrl } : {}),
    },
  });
  invalidateCache('store');
  return toProductDto(updated);
}

export async function toggleProductActive(id: string, isActive?: boolean) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, isActive: true } });
  if (!existing) throw new HttpError(404, 'Product not found');
  const nextActive = typeof isActive === 'boolean' ? isActive : !existing.isActive;
  const updated = await prisma.product.update({ where: { id }, data: { isActive: nextActive } });
  invalidateCache('store');
  return toProductDto(updated);
}

export async function toggleProductPaused(id: string, isPaused?: boolean) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, isPaused: true } });
  if (!existing) throw new HttpError(404, 'Product not found');
  const nextPaused = typeof isPaused === 'boolean' ? isPaused : !existing.isPaused;
  const updated = await prisma.product.update({ where: { id }, data: { isPaused: nextPaused } });
  invalidateCache('store');
  return toProductDto(updated);
}

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Product not found');
  const linkedOrdersCount = await prisma.orderItem.count({ where: { productId: id } });
  if (linkedOrdersCount > 0) {
    const archived = await prisma.product.update({ where: { id }, data: { isActive: false } });
    invalidateCache('store');
    return {
      success: true,
      softDeleted: true,
      message: 'Product has linked orders and was archived (isActive = false).',
      product: toProductDto(archived),
    };
  }
  await prisma.product.delete({ where: { id } });
  invalidateCache('store');
  return {
    success: true,
    softDeleted: false,
    message: 'Product permanently deleted.',
  };
}

// ----------------------------------------------------------------------------
// Orders
// ----------------------------------------------------------------------------
export async function listOrders(statusFilter?: string) {
  const where: Record<string, any> = {};
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter;
  }
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(toOrderDto);
}

export async function createOrder(data: Record<string, any>) {
  const resolvedPhone = String(data.customerPhone || data.phone || '').trim();
  const resolvedEmail = String(data.customerEmail || data.email || '').trim().toLowerCase();
  if (!resolvedPhone || resolvedPhone.replace(/\D/g, '').length < 8) {
    throw new HttpError(400, 'A valid phone number is required.');
  }
  if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
    throw new HttpError(400, 'A valid email address is required.');
  }

  const rawItemsInput =
    Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : data.productId
        ? [
            {
              productId: data.productId,
              quantity: data.quantity || 1,
              size: data.size,
              color: data.color,
              height: data.height,
              weight: data.weight,
              customName: data.customName,
              customNumber: data.customNumber,
            },
          ]
        : [];

  if (rawItemsInput.length === 0) {
    throw new HttpError(400, 'Order must contain at least one item.');
  }

  if (data.deliveryMethod === 'HOME_DELIVERY') {
    const addr = String(data.shippingAddress || '').trim();
    if (addr.length < 5) {
      throw new HttpError(400, 'Shipping address is required for Home Delivery (minimum 5 characters).');
    }
  }

  const productIds = Array.from(new Set(rawItemsInput.map((it: any) => String(it.productId))));
  const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const normalizedItems = rawItemsInput.map((rawItem: any) => {
    const dbProd = productMap.get(String(rawItem.productId));
    if (!dbProd) throw new HttpError(404, `Product not found: ${rawItem.productId}`);
    if (!dbProd.isActive) throw new HttpError(400, `Product "${dbProd.name}" is currently unavailable.`);
    if (dbProd.isPaused) throw new HttpError(400, `Product "${dbProd.name}" is temporarily paused / out of stock.`);

    const category = dbProd.category;
    const isJersey = isJerseyCategory(category);
    const quantity = Math.max(1, Math.min(50, Math.round(Number(rawItem.quantity) || 1)));

    return {
      id: `item-${crypto.randomUUID().slice(0, 8)}`,
      productId: dbProd.id,
      productName: dbProd.name,
      category,
      sku: dbProd.sku,
      unitPrice: dbProd.price,
      quantity,
      size: String(rawItem.size || dbProd.sizes?.[0] || 'M').trim(),
      color: rawItem.color ? String(rawItem.color).trim() : null,
      height: isJersey && rawItem.height ? Number(rawItem.height) : null,
      weight: isJersey && rawItem.weight ? Number(rawItem.weight) : null,
      customName: isJersey && rawItem.customName ? String(rawItem.customName).trim().toUpperCase().slice(0, 24) : null,
      customNumber:
        isJersey && rawItem.customNumber !== undefined && rawItem.customNumber !== null && String(rawItem.customNumber).trim() !== ''
          ? String(rawItem.customNumber).trim().slice(0, 4)
          : null,
    };
  });

  const totalAmount = normalizedItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  let suffix = String(crypto.randomInt(100000, 999999));
  let orderCode = `DVA-SHOP-${ymd}-${suffix}`;
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.order.findUnique({ where: { orderCode }, select: { id: true } });
    if (!exists) break;
    suffix = String(crypto.randomInt(100000, 999999));
    orderCode = `DVA-SHOP-${ymd}-${suffix}`;
  }

  const firstItem = normalizedItems[0];
  const isBall = firstItem?.category === 'VOLLEYBALLS' || (firstItem?.sku && firstItem.sku.includes('V200W'));
  const productShort = isBall
    ? 'V200W'
    : isJerseyCategory(firstItem?.category || '')
      ? 'JSY'
      : firstItem?.category === 'KNEE_PADS'
        ? 'KNEE'
        : firstItem?.category === 'SOCKS'
          ? 'SOCK'
          : 'GEAR';

  const cleanCustomerWords = removeVietnameseTones(data.customerName.trim())
    .replace(/[^A-Za-z0-9\s]/g, '')
    .trim()
    .split(/\s+/);
  const customerLastName = (cleanCustomerWords[cleanCustomerWords.length - 1] || 'KHACH').toUpperCase();

  const transferContent = `DVA ${productShort} ${customerLastName} ${suffix}`;
  const orderId = `ord-${crypto.randomUUID()}`;

  const createdOrder = await prisma.order.create({
    data: {
      id: orderId,
      orderCode,
      customerName: data.customerName.trim(),
      customerPhone: resolvedPhone,
      customerEmail: resolvedEmail,
      socialLink: data.socialLink ? data.socialLink.trim() : null,
      deliveryMethod: data.deliveryMethod,
      shippingAddress:
        data.deliveryMethod === 'HOME_DELIVERY' && data.shippingAddress ? data.shippingAddress.trim() : null,
      quantity: normalizedItems.reduce((sum, it) => sum + it.quantity, 0),
      totalAmount,
      transferContent,
      status: 'PENDING',
      notes: data.notes ? data.notes.trim() : null,
      items: { create: normalizedItems },
    },
    include: { items: true },
  });

  const orderDto = toOrderDto(createdOrder);
  dispatchGoogleSheetsWebhookAsync('Store_Orders', 'DonHang_Shop', buildShopOrderSheetPayload(orderDto));
  const qrUrl = buildBookingVietQrUrl(orderDto.totalAmount, orderDto.transferContent);

  return {
    order: orderDto,
    payment: {
      bankId: env.bank.id,
      bankName: 'MB Bank (Ngân hàng Quân Đội)',
      accountNo: env.bank.accountNo,
      accountName: env.bank.accountName,
      amount: orderDto.totalAmount,
      transferContent: orderDto.transferContent,
      qrUrl,
    },
  };
}

export async function confirmOrderPayment(id: string) {
  const existing = await prisma.order.findFirst({
    where: { OR: [{ id }, { orderCode: id }] },
    include: { items: true },
  });
  if (!existing) throw new HttpError(404, 'Order not found');

  const updated = await prisma.order.update({
    where: { id: existing.id },
    data: { customerConfirmedAt: existing.customerConfirmedAt ?? new Date() },
    include: { items: true },
  });

  const orderDto = toOrderDto(updated);
  dispatchGoogleSheetsWebhookAsync('Store_Orders', 'DonHang_Shop', buildShopOrderSheetPayload(orderDto));

  sendShopOrderConfirmationEmail(toShopOrderEmailPayload(orderDto)).catch((err: any) => {
    console.warn('[Shop Confirm Payment Email Warning]:', err?.message || err);
  });

  sendAdminNotification({
    type: 'BOOKING',
    title: `Đơn Hàng DVA Shop Mới (${orderDto.orderCode}) - Khách Báo Đã CK`,
    code: orderDto.orderCode,
    customerName: orderDto.customerName,
    phone: orderDto.customerPhone,
    email: orderDto.customerEmail,
    amount: orderDto.totalAmount,
    transferContent: orderDto.transferContent,
    details: `${orderDto.productName} | Size: ${orderDto.size} | SL: ${orderDto.quantity || 1} | Nhận: ${
      orderDto.deliveryMethod === 'HOME_DELIVERY'
        ? `Ship COD (${orderDto.shippingAddress || 'Theo địa chỉ'})`
        : 'Sân BTL Thông Tin (155 Trường Chinh)'
    }`,
  }).catch((err: any) => {
    console.warn('[Admin Alert Error - Shop Order Confirm]:', err?.message || err);
  });

  return {
    success: true,
    message: 'Transfer confirmation recorded. Admin will verify and process your order shortly.',
    order: orderDto,
  };
}

export async function updateOrderStatus(id: string, data: { status: string; notes?: string }) {
  const existing = await prisma.order.findFirst({
    where: { OR: [{ id }, { orderCode: id }] },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, 'Order not found');

  const updated = await prisma.order.update({
    where: { id: existing.id },
    data: {
      status: data.status as any,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
    include: { items: true },
  });

  const orderDto = toOrderDto(updated);
  dispatchGoogleSheetsWebhookAsync('Store_Orders', 'DonHang_Shop', buildShopOrderSheetPayload(orderDto));
  return orderDto;
}

export async function sendOrderShippingEmail(
  id: string,
  extra: { trackingCode?: string; carrier?: string; shippingNotes?: string }
) {
  const existing = await prisma.order.findFirst({
    where: { OR: [{ id }, { orderCode: id }] },
    include: { items: true },
  });
  if (!existing) throw new HttpError(404, 'Order not found');

  const cleanTracking = extra.trackingCode?.trim() || null;
  const cleanCarrier = extra.carrier?.trim() || null;
  const cleanNotes = extra.shippingNotes?.trim() || null;

  let updatedNotes = existing.notes || '';
  if (cleanTracking || cleanNotes) {
    const trackingTag = cleanTracking ? `[Vận đơn: ${cleanCarrier ? cleanCarrier + ' - ' : ''}${cleanTracking}]` : '';
    const notesTag = cleanNotes ? `[Ghi chú ship: ${cleanNotes}]` : '';
    const appended = [trackingTag, notesTag].filter(Boolean).join(' ');
    if (appended) updatedNotes = updatedNotes ? `${updatedNotes}\n${appended}` : appended;
  }

  const targetOrderRaw = await prisma.order.update({
    where: { id: existing.id },
    data: {
      status: 'SHIPPED',
      shippingEmailSentAt: new Date(),
      ...(updatedNotes ? { notes: updatedNotes } : {}),
    },
    include: { items: true },
  });

  const orderDto = toOrderDto(targetOrderRaw);
  const shippingExtra = { trackingCode: cleanTracking, carrier: cleanCarrier, shippingNotes: cleanNotes };

  dispatchGoogleSheetsWebhookAsync(
    'Store_Orders',
    'DonHang_Shop',
    buildShopOrderSheetPayload(orderDto, 'SHIPPED (Đang giao / Sẵn sàng nhận tại sân)', shippingExtra)
  );

  const emailResult = await sendShopOrderShippingEmail(toShopOrderEmailPayload(orderDto, shippingExtra));

  return {
    success: true,
    emailSent: Boolean(emailResult),
    message:
      orderDto.deliveryMethod === 'HOME_DELIVERY'
        ? `Shipping update email dispatched to ${orderDto.customerEmail || orderDto.email}.`
        : `Court pick-up ready notification dispatched to ${orderDto.customerEmail || orderDto.email}.`,
    order: orderDto,
  };
}

export async function deleteOrder(id: string, actorEmail?: string) {
  const existing = await prisma.order.findFirst({
    where: { OR: [{ id }, { orderCode: id }] },
    include: { items: true },
  });
  if (!existing) throw new HttpError(404, 'Order not found');

  if (NON_DELETABLE_ORDER_STATUSES.has(existing.status)) {
    throw new HttpError(400, 'Cannot delete active paid/shipped order. Please cancel the order first.');
  }

  const orderDto = toOrderDto(existing);
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
    await tx.order.delete({ where: { id: existing.id } });
  });

  const deletedOrderAuditDto: StoreOrder = {
    ...orderDto,
    notes: [orderDto.notes, `Deleted by Admin (${actorEmail || 'staff'}) at ${new Date().toISOString()}`]
      .filter(Boolean)
      .join(' | '),
  };

  dispatchGoogleSheetsWebhookAsync(
    'Store_Orders',
    'DonHang_Shop',
    buildShopOrderSheetPayload(deletedOrderAuditDto, 'DELETED')
  );

  return {
    success: true,
    deletedOrderId: existing.id,
    orderCode: existing.orderCode,
    message: `Order ${existing.orderCode} permanently deleted.`,
  };
}
