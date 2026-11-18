import { Router } from 'express';
import { isStaff } from '../../middlewares/auth.middleware';
import { requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah, publicWriteLimiter } from '../../middlewares/error.middleware';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import {
  ORDER_CREATE_SCHEMA,
  ORDER_STATUS_SCHEMA,
  PRODUCT_ACTIVE_TOGGLE_SCHEMA,
  PRODUCT_PAUSED_TOGGLE_SCHEMA,
  PRODUCT_SCHEMA,
  SHIPPING_EMAIL_SCHEMA,
} from '../../utils/schemas';
import {
  confirmOrderPayment,
  createOrder,
  createProduct,
  deleteOrder,
  deleteProduct,
  getProductByIdOrSlug,
  listOrders,
  listProducts,
  sendOrderShippingEmail,
  toggleProductActive,
  toggleProductPaused,
  updateOrderStatus,
  updateProduct,
} from './store.service';

export const storeRouter = Router();

storeRouter.get(
  '/store/products',
  ah(async (req, res) => {
    const isStaffUser = isStaff(req.user);
    const activeOnlyRequested = req.query.activeOnly === 'true';
    applyPublicCacheHeaders(res, isStaffUser && !activeOnlyRequested, { maxAgeSec: 60, swrSec: 300 });

    const category = typeof req.query.category === 'string' ? req.query.category.trim().toUpperCase() : undefined;
    const products = await listProducts({ isStaffUser, activeOnlyRequested, category });
    res.json(products);
  })
);

storeRouter.get(
  '/store/products/:idOrSlug',
  ah(async (req, res) => {
    const isStaffUser = isStaff(req.user);
    applyPublicCacheHeaders(res, isStaffUser, { maxAgeSec: 60, swrSec: 300 });
    const product = await getProductByIdOrSlug(req.params.idOrSlug, isStaffUser);
    res.json(product);
  })
);

storeRouter.post(
  '/store/products',
  requireSuperAdmin,
  ah(async (req, res) => {
    const rawBody = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    if (!rawBody.frontImage && rawBody.imageUrl) {
      rawBody.frontImage = rawBody.imageUrl;
    }
    const data = sanitize(rawBody, PRODUCT_SCHEMA, { required: ['name', 'category', 'price'] });
    const created = await createProduct(data);
    res.status(201).json(created);
  })
);

const handleUpdateProduct = ah(async (req, res) => {
  const rawBody = req.body && typeof req.body === 'object' ? { ...req.body } : {};
  if (rawBody.imageUrl && !rawBody.frontImage) {
    rawBody.frontImage = rawBody.imageUrl;
  }
  const data = sanitize(rawBody, PRODUCT_SCHEMA, { partial: true });
  const updated = await updateProduct(req.params.id, data);
  res.json(updated);
});

storeRouter.put('/store/products/:id', requireSuperAdmin, handleUpdateProduct);
storeRouter.patch('/store/products/:id', requireSuperAdmin, handleUpdateProduct);

storeRouter.patch(
  '/store/products/:id/active',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, PRODUCT_ACTIVE_TOGGLE_SCHEMA, { partial: true });
    const updated = await toggleProductActive(req.params.id, data.isActive);
    res.json(updated);
  })
);

storeRouter.patch(
  '/store/products/:id/paused',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, PRODUCT_PAUSED_TOGGLE_SCHEMA, { partial: true });
    const updated = await toggleProductPaused(req.params.id, data.isPaused);
    res.json(updated);
  })
);

storeRouter.delete(
  '/store/products/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteProduct(req.params.id);
    res.json(result);
  })
);

// Orders
storeRouter.get(
  '/store/orders',
  requireSuperAdmin,
  ah(async (req, res) => {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : undefined;
    const orders = await listOrders(statusFilter);
    res.json(orders);
  })
);

storeRouter.post(
  '/store/orders',
  publicWriteLimiter,
  ah(async (req, res) => {
    const data = sanitize(req.body, ORDER_CREATE_SCHEMA, {
      required: ['customerName', 'deliveryMethod'],
    });
    const result = await createOrder(data);
    res.status(201).json(result);
  })
);

storeRouter.post(
  '/store/orders/:id/confirm-payment',
  ah(async (req, res) => {
    const result = await confirmOrderPayment(req.params.id);
    res.json(result);
  })
);

storeRouter.patch(
  '/store/orders/:id/status',
  requireSuperAdmin,
  ah(async (req, res) => {
    const rawBody = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    if (!rawBody.status && rawBody.paymentStatus) {
      rawBody.status = rawBody.paymentStatus;
    }
    const data = sanitize(rawBody, ORDER_STATUS_SCHEMA, { required: ['status'] });
    const updated = await updateOrderStatus(req.params.id, data as any);
    res.json(updated);
  })
);

storeRouter.post(
  '/store/orders/:id/shipping-email',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, SHIPPING_EMAIL_SCHEMA, { partial: true });
    const result = await sendOrderShippingEmail(req.params.id, data);
    res.json(result);
  })
);

storeRouter.delete(
  '/store/orders/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteOrder(req.params.id, req.user?.email);
    res.json(result);
  })
);
