import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Shirt,
  Shield,
  Footprints,
  Plus,
  Package,
  Receipt,
  Wallet,
  Layers,
  Search,
  Edit3,
  Trash2,
  Upload,
  Send,
  CheckCircle2,
  Truck,
  MapPin,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  OrderStatus,
  StoreCategoryId,
  StoreOrder,
  StoreOrderItem,
  StoreProduct,
  StoreSubView,
  SHOP_CATEGORIES,
  getShopCategoryCode,
  getShopCategoryLabel,
  isJerseyCategory,
  slugifyProductName,
} from '../../../types';
import { cloudinaryService, storeService } from '../../../services/api';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';

const PRODUCTS_PAGE_SIZE = 8;
const ORDERS_PAGE_SIZE = 10;

const SUB_TABS: { id: StoreSubView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ORDERS', label: 'Orders Management & VietQR', icon: Receipt },
  { id: 'PRODUCTS', label: 'Products & Inventory', icon: Package },
  { id: 'CATEGORIES', label: 'Categories & Merch', icon: Layers },
];

const CATEGORY_OPTIONS: { id: 'ALL' | StoreCategoryId; label: string }[] = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'SLEEVELESS', label: 'Sleeveless Jersey' },
  { id: 'SHORT_SLEEVE', label: 'Short Sleeve Jersey' },
  { id: 'WOMEN', label: "Women's Jersey" },
  { id: 'KNEE_PADS', label: 'Knee Pads' },
  { id: 'SOCKS', label: 'Athletic Socks' },
  { id: 'VOLLEYBALLS', label: 'Volleyballs & Gear' },
];

const CATEGORIES_OVERVIEW: {
  id: StoreCategoryId;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  {
    id: 'SLEEVELESS',
    icon: Shirt,
    title: 'Sleeveless Jerseys (SLV)',
    body: 'Pro sleeveless match kits with custom name & number printing.',
  },
  {
    id: 'SHORT_SLEEVE',
    icon: Shirt,
    title: 'Short Sleeve Jerseys (SS)',
    body: 'Official home/away tournament kits with custom printing.',
  },
  {
    id: 'WOMEN',
    icon: Sparkles,
    title: "Women's Competition Jerseys (WMN)",
    body: "Tailored four-way stretch kits for DVA Women's Division.",
  },
  {
    id: 'KNEE_PADS',
    icon: Shield,
    title: 'Volleyball Knee Pads (KP)',
    body: 'EVA impact-shield knee protection for Taraflex court dives.',
  },
  {
    id: 'SOCKS',
    icon: Footprints,
    title: 'Athletic Crew Socks (SCK)',
    body: 'Grip-lock compression crew socks for explosive footwork.',
  },
  {
    id: 'VOLLEYBALLS',
    icon: ShoppingBag,
    title: 'Match Volleyballs & Official Gear (BAL)',
    body: 'FIVB official tournament volleyballs (Mikasa V200W) & professional arena gear.',
  },
];

const ORDER_STATUS_FILTERS: { id: 'ALL' | OrderStatus; label: string }[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'PAID', label: 'Paid' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

interface ProductFormState {
  id?: string;
  name: string;
  sku: string;
  slug: string;
  category: StoreCategoryId;
  originalPrice: number | string;
  price: number;
  stock: number;
  sortOrder: number | string;
  frontImage: string;
  backImage: string;
  description: string;
  sizesInput: string;
  badge: string;
  allowCustomPrint: boolean;
  isPaused: boolean;
  isActive: boolean;
}

const createInitialProductForm = (product?: StoreProduct | null): ProductFormState => {
  if (product) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      slug: product.slug || '',
      category: product.category || 'SHORT_SLEEVE',
      originalPrice: product.originalPrice ?? '',
      price: Number(product.price) || 350000,
      stock: Number(product.stock ?? 50),
      sortOrder: product.sortOrder ?? 0,
      frontImage: product.frontImage || product.imageUrl || '/courts/btl.png',
      backImage: product.backImage || product.frontImage || product.imageUrl || '/courts/thecong.png',
      description: product.description || '',
      sizesInput:
        Array.isArray(product.sizes) && product.sizes.length > 0
          ? product.sizes.join(', ')
          : isJerseyCategory(product.category)
          ? 'S, M, L, XL, 2XL'
          : product.category === 'VOLLEYBALLS'
          ? 'Size 5'
          : 'S/M, L/XL',
      badge: product.badge || '',
      allowCustomPrint:
        product.allowCustomPrint !== undefined
          ? Boolean(product.allowCustomPrint)
          : isJerseyCategory(product.category),
      isPaused: Boolean(product.isPaused),
      isActive: product.isActive !== false,
    };
  }
  return {
    name: '',
    sku: '',
    slug: '',
    category: 'SHORT_SLEEVE',
    originalPrice: 420000,
    price: 350000,
    stock: 50,
    sortOrder: 0,
    frontImage: '/courts/btl.png',
    backImage: '/courts/thecong.png',
    description: '',
    sizesInput: 'S, M, L, XL, 2XL',
    badge: 'NEW RELEASE',
    allowCustomPrint: true,
    isPaused: false,
    isActive: true,
  };
};

/**
 * DVA Store module — Phase 2 full implementation:
 * - Orders Management with status filters (`PENDING`, `PAID`, `SHIPPED`, `COMPLETED`, `CANCELLED`),
 *   idempotent Google Sheets (`DonHang_Shop`) sync, and Stage 2 "Send Shipping Update" Resend email trigger.
 * - Product Catalog CRUD with Cloudinary dual-image upload (`frontImage` & `backImage`) and `isActive` toggle.
 */
export const StoreTab: React.FC = () => {
  const {
    storeSubView,
    setStoreSubView,
    notify,
    data: { storeProducts, storeOrders },
    setData: { setStoreProducts, setStoreOrders },
  } = useAdminDashboard();
  const metrics = useAdminMetrics();

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | StoreCategoryId>('ALL');
  const [productQuery, setProductQuery] = useState('');
  const [productsPage, setProductsPage] = useState(1);

  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [orderQuery, setOrderQuery] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(() => createInitialProductForm(null));
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingSide, setUploadingSide] = useState<'FRONT' | 'BACK' | null>(null);

  // Order Shipping Email & Dedicated Dispatch Modal State
  const [dispatchModalOrder, setDispatchModalOrder] = useState<StoreOrder | null>(null);
  const [dispatchTrackingCode, setDispatchTrackingCode] = useState('');
  const [dispatchCarrier, setDispatchCarrier] = useState('Viettel Post');
  const [dispatchShippingNotes, setDispatchShippingNotes] = useState('');
  const [isSendingDispatch, setIsSendingDispatch] = useState(false);
  const [sendingShippingOrderId, setSendingShippingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return storeProducts.filter((product) => {
      if (categoryFilter !== 'ALL' && product.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.sku || '').toLowerCase().includes(q) ||
        getShopCategoryLabel(product.category).toLowerCase().includes(q)
      );
    });
  }, [storeProducts, categoryFilter, productQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return storeOrders.filter((order) => {
      const effectiveStatus = (order.status || order.paymentStatus || 'PENDING') as OrderStatus;
      if (orderStatusFilter !== 'ALL' && effectiveStatus !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        order.orderCode.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        (order.phone || order.customerPhone || '').toLowerCase().includes(q) ||
        (order.email || order.customerEmail || '').toLowerCase().includes(q) ||
        (order.transferContent || '').toLowerCase().includes(q)
      );
    });
  }, [storeOrders, orderStatusFilter, orderQuery]);

  const safeProductsPage = Math.min(
    Math.max(1, productsPage),
    Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE))
  );
  const paginatedProducts = filteredProducts.slice(
    (safeProductsPage - 1) * PRODUCTS_PAGE_SIZE,
    safeProductsPage * PRODUCTS_PAGE_SIZE
  );

  const safeOrdersPage = Math.min(
    Math.max(1, ordersPage),
    Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE))
  );
  const paginatedOrders = filteredOrders.slice(
    (safeOrdersPage - 1) * ORDERS_PAGE_SIZE,
    safeOrdersPage * ORDERS_PAGE_SIZE
  );

  const handleOpenCreateProduct = () => {
    setProductForm(createInitialProductForm(null));
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: StoreProduct) => {
    setProductForm(createInitialProductForm(product));
    setIsProductModalOpen(true);
  };

  const handleImageFileUpload = async (side: 'FRONT' | 'BACK', file?: File) => {
    if (!file) return;
    setUploadingSide(side);
    try {
      const uploadedUrl = await cloudinaryService.uploadImage(file, 'dva_shop');
      setProductForm((prev) =>
        side === 'FRONT' ? { ...prev, frontImage: uploadedUrl } : { ...prev, backImage: uploadedUrl }
      );
      notify(`${side === 'FRONT' ? 'Front' : 'Back'} product image uploaded to Cloudinary.`);
    } catch {
      notify('Image upload failed. Please try again or paste a direct image URL.');
    } finally {
      setUploadingSide(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      notify('Product name is required.');
      return;
    }
    setSavingProduct(true);
    try {
      const parsedSizes = productForm.sizesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const parsedOrigPrice =
        productForm.originalPrice !== '' && productForm.originalPrice !== undefined
          ? Math.max(0, Math.round(Number(productForm.originalPrice) || 0))
          : undefined;

      const payload: Partial<StoreProduct> = {
        name: productForm.name.trim(),
        sku: productForm.sku.trim().toUpperCase() || undefined,
        slug: productForm.slug.trim() || undefined,
        category: productForm.category,
        originalPrice: parsedOrigPrice,
        price: Math.max(0, Math.round(Number(productForm.price) || 0)),
        stock: Math.max(0, Math.round(Number(productForm.stock) || 0)),
        sortOrder: Math.round(Number(productForm.sortOrder) || 0),
        frontImage: productForm.frontImage.trim() || '/courts/btl.png',
        backImage: productForm.backImage.trim() || productForm.frontImage.trim() || '/courts/btl.png',
        description: productForm.description.trim(),
        sizes: parsedSizes.length > 0 ? parsedSizes : ['S', 'M', 'L', 'XL', '2XL'],
        badge: productForm.badge.trim() || undefined,
        allowCustomPrint: productForm.allowCustomPrint,
        isPaused: productForm.isPaused,
        isActive: productForm.isActive,
      };

      if (productForm.id) {
        const updated = await storeService.updateProduct(productForm.id, payload);
        setStoreProducts((prev) => prev.map((p) => (p.id === productForm.id ? updated : p)));
        notify(`Product "${updated.name}" updated.`);
      } else {
        const created = await storeService.createProduct(payload);
        setStoreProducts((prev) => [created, ...prev]);
        notify(`Product "${created.name}" added to DVA Store catalog.`);
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      notify(err?.message || 'Unable to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductActive = async (productId: string, nextActive: boolean) => {
    try {
      const updated = await storeService.toggleProductActive(productId, nextActive);
      setStoreProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...updated, isActive: nextActive } : p))
      );
      notify(`Product visibility updated to ${nextActive ? 'Active' : 'Hidden'}.`);
    } catch {
      notify('Unable to update product visibility.');
    }
  };

  const handleToggleProductPaused = async (productId: string, nextPaused: boolean) => {
    try {
      const updated = await storeService.toggleProductPaused(productId, nextPaused);
      setStoreProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...updated, isPaused: nextPaused } : p))
      );
      notify(`Product stock status updated to ${nextPaused ? 'Paused / Out of Stock' : 'In Stock'}.`);
    } catch {
      notify('Unable to update product paused status.');
    }
  };

  const handleDeleteProduct = async (product: StoreProduct) => {
    try {
      const res = await storeService.deleteProduct(product.id);
      if (res.softDeleted && res.product) {
        setStoreProducts((prev) => prev.map((p) => (p.id === product.id ? res.product! : p)));
        notify(`Product "${product.name}" has linked orders and was archived (Hidden).`);
      } else {
        setStoreProducts((prev) => prev.filter((p) => p.id !== product.id));
        notify(`Product "${product.name}" deleted.`);
      }
    } catch {
      notify('Unable to delete product.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const updated = await storeService.updateOrderStatus(orderId, status);
      setStoreOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...updated,
                status,
                paymentStatus: status,
              }
            : o
        )
      );
      notify(`Order updated to ${status} & synced to Google Sheet (DonHang_Shop).`);
    } catch {
      notify('Unable to update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleOpenDispatchModal = (order: StoreOrder) => {
    setDispatchModalOrder(order);
    setDispatchTrackingCode('');
    setDispatchCarrier('Viettel Post');
    setDispatchShippingNotes('');
  };

  const handleConfirmSendDispatchEmail = async () => {
    if (!dispatchModalOrder) return;
    setIsSendingDispatch(true);
    try {
      const res = await storeService.sendShippingUpdateEmail(dispatchModalOrder.id, {
        trackingCode:
          dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY' ? dispatchTrackingCode.trim() || undefined : undefined,
        carrier:
          dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY' ? dispatchCarrier.trim() || undefined : undefined,
        shippingNotes: dispatchShippingNotes.trim() || undefined,
      });
      if (res?.order) {
        setStoreOrders((prev) =>
          prev.map((o) =>
            o.id === dispatchModalOrder.id
              ? { ...o, ...res.order, status: 'SHIPPED', paymentStatus: 'SHIPPED' }
              : o
          )
        );
      }
      notify(
        res?.message ||
          (dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY'
            ? 'Shipping update email sent to customer & order marked SHIPPED!'
            : 'Court pick-up notification sent to customer & order marked SHIPPED!')
      );
      setDispatchModalOrder(null);
    } catch (err: any) {
      notify(err?.message || 'Could not dispatch shipping notification email.');
    } finally {
      setIsSendingDispatch(false);
    }
  };

  const handleSendShippingUpdate = async (orderId: string) => {
    const targetOrder = storeOrders.find((o) => o.id === orderId);
    if (targetOrder) {
      handleOpenDispatchModal(targetOrder);
      return;
    }
    setSendingShippingOrderId(orderId);
    try {
      const res = await storeService.sendShippingUpdateEmail(orderId);
      if (res?.order) {
        setStoreOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      }
      notify(res?.message || 'Stage 2 Shipping / Court Pick-up Ready email sent via Resend!');
    } catch (err: any) {
      notify(err?.message || 'Could not dispatch shipping notification email.');
    } finally {
      setSendingShippingOrderId(null);
    }
  };

  const kpis = [
    {
      icon: Wallet,
      label: 'Verified Shop Revenue',
      value: `${metrics.storeRevenue.toLocaleString('vi-VN')} đ`,
      tone: 'text-[#FACC15]',
    },
    {
      icon: Package,
      label: 'Active Products',
      value: `${storeProducts.filter((p) => p.isActive !== false).length} / ${storeProducts.length}`,
      tone: 'text-[#38BDF8]',
    },
    {
      icon: Receipt,
      label: 'Total Orders',
      value: `${storeOrders.length} (${metrics.pendingStoreOrdersCount} pending)`,
      tone: 'text-[#F97316]',
    },
  ];

  const getOrderStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
      case 'SHIPPED':
        return 'bg-sky-950 text-sky-300 border border-sky-800';
      case 'COMPLETED':
        return 'bg-purple-950 text-purple-300 border border-purple-800';
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-400 border border-slate-700';
      default:
        return 'bg-amber-950 text-amber-300 border border-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Product CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FACC15]/10 border border-[#FACC15]/30 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-[#FACC15]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-xl text-white">DVA Store Management</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live VietQR & Resend
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manage official DVA jerseys, gear inventory, VietQR orders, and Stage 2 shipping notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/shop"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#111827] hover:bg-[#1E293B] text-slate-200 border border-[#1E293B] transition-colors"
          >
            View Public /shop
          </a>
          <button
            type="button"
            onClick={handleOpenCreateProduct}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B0000] to-[#F97316] hover:brightness-110 text-white flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Store KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="rounded-3xl border border-[#1E293B] bg-[#111827] p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">{label}</span>
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className={`font-mono font-black text-2xl tabular-nums ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Segmented Internal Sub-Tabs */}
      <div
        role="tablist"
        aria-label="DVA Store views"
        className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#111827] border border-[#1E293B]"
      >
        {SUB_TABS.map(({ id, label, icon: Icon }) => {
          const active = storeSubView === id;
          const badgeCount =
            id === 'ORDERS'
              ? metrics.pendingStoreOrdersCount
              : id === 'PRODUCTS'
              ? storeProducts.length
              : 0;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStoreSubView(id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {badgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                    id === 'ORDERS'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* SUB-VIEW 1: ORDERS MANAGEMENT & VIETQR                              */}
      {/* =================================================================== */}
      {storeSubView === 'ORDERS' && (
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {ORDER_STATUS_FILTERS.map((st) => {
                const count =
                  st.id === 'ALL'
                    ? storeOrders.length
                    : storeOrders.filter((o) => (o.status || o.paymentStatus) === st.id).length;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setOrderStatusFilter(st.id);
                      setOrdersPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      orderStatusFilter === st.id
                        ? 'bg-[#F97316] text-white'
                        : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => {
                  setOrderQuery(e.target.value);
                  setOrdersPage(1);
                }}
                placeholder="Order code, customer, phone, VietQR memo…"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/60"
              />
            </div>
          </div>

          {paginatedOrders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-white">No Matching Store Orders</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Orders placed on `/shop` automatically appear here and sync to the `DonHang_Shop` sheet tab.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B0F19] text-slate-400 font-bold border-b border-[#1E293B]">
                      <th className="py-3 px-3">Order / VietQR Syntax</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Items & Custom Specs</th>
                      <th className="py-3 px-3">Delivery</th>
                      <th className="py-3 px-3">Total</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions & Stage 2 Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] text-slate-300">
                    {paginatedOrders.map((o) => {
                      const effectiveStatus = (o.status || o.paymentStatus || 'PENDING') as OrderStatus;
                      const isUpdating = updatingOrderId === o.id;
                      const isSendingMail = sendingShippingOrderId === o.id;

                      return (
                        <tr key={o.id} className="hover:bg-slate-800/30 align-top">
                          {/* Order Code & Transfer Content */}
                          <td className="py-3.5 px-3 font-mono space-y-1">
                            <span className="font-bold text-white block">{o.orderCode}</span>
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/70 text-amber-300 text-[10px] font-bold">
                              CK: {o.transferContent}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {o.createdAt ? o.createdAt.slice(0, 16).replace('T', ' ') : ''}
                            </span>
                            {o.customerConfirmedAt && effectiveStatus === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px] font-sans font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Customer Reported Transfer
                              </span>
                            )}
                          </td>

                          {/* Customer Info */}
                          <td className="py-3.5 px-3 space-y-0.5">
                            <span className="font-bold text-white block">{o.customerName}</span>
                            <span className="font-mono text-[11px] text-slate-300 block">
                              {o.phone || o.customerPhone}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {o.email || o.customerEmail}
                            </span>
                            {o.socialLink && (
                              <span className="text-[10px] text-sky-400 block truncate max-w-[180px]">
                                IG/FB: {o.socialLink}
                              </span>
                            )}
                          </td>

                          {/* Items & Custom Jersey Specs */}
                          <td className="py-3.5 px-3 space-y-1.5">
                            {Array.isArray(o.items) && o.items.length > 0 ? (
                              o.items.map((item) => (
                                <div key={item.id} className="space-y-0.5">
                                  <div className="font-semibold text-white">
                                    {item.productName}{' '}
                                    <span className="text-orange-400 font-mono">×{item.quantity}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    <span className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-slate-700 text-slate-300 font-bold">
                                      Size: {item.size}
                                    </span>
                                    {(item.height || item.weight) && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-slate-800 text-slate-400">
                                        {item.height || '?'}cm / {item.weight || '?'}kg
                                      </span>
                                    )}
                                    {(item.customName || item.customNumber) && (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-950/70 border border-orange-800 text-orange-300 font-mono font-bold">
                                        Print: {item.customName || ''}{' '}
                                        {item.customNumber ? `#${item.customNumber}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400">{o.productName || 'DVA Merchandise'}</span>
                            )}
                          </td>

                          {/* Delivery Method */}
                          <td className="py-3.5 px-3 max-w-[210px]">
                            {o.deliveryMethod === 'HOME_DELIVERY' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-300 bg-orange-950/60 border border-orange-800/70 px-2 py-0.5 rounded">
                                  <Truck className="w-3 h-3" />
                                  Home Delivery (COD Fee)
                                </span>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  {o.shippingAddress || 'No address provided'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/70 px-2 py-0.5 rounded">
                                  <MapPin className="w-3 h-3" />
                                  Court Pick-up (Free)
                                </span>
                                <p className="text-[10px] text-slate-400">
                                  BTL Thong Tin Court
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-3 font-mono font-bold text-[#FACC15] whitespace-nowrap">
                            {Number(o.totalAmount || 0).toLocaleString('vi-VN')} đ
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3 space-y-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${getOrderStatusBadgeClass(
                                effectiveStatus
                              )}`}
                            >
                              {effectiveStatus}
                            </span>
                            {o.shippingEmailSentAt && (
                              <span className="block text-[10px] text-emerald-400 font-semibold">
                                ✓ Shipping Email Sent
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {/* Dedicated Dispatch Email Button (Stage 2) */}
                              <button
                                type="button"
                                disabled={isUpdating || isSendingDispatch}
                                onClick={() => handleOpenDispatchModal(o)}
                                className={`px-3 py-1.5 font-bold text-[11px] rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                                  o.shippingEmailSentAt
                                    ? 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/40'
                                    : 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white'
                                }`}
                                title={
                                  o.shippingEmailSentAt
                                    ? 'Resend dispatch notice email to customer'
                                    : 'Open preview modal & send dispatch notice email to customer'
                                }
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>
                                  {o.shippingEmailSentAt ? 'Resend Dispatch Email' : 'Send Dispatch Email'}
                                </span>
                              </button>

                              {effectiveStatus === 'PENDING' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(o.id, 'PAID')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl cursor-pointer"
                                >
                                  Approve Paid
                                </button>
                              )}

                              {(effectiveStatus === 'PAID' || effectiveStatus === 'PENDING') && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(o.id, 'SHIPPED')}
                                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl cursor-pointer"
                                >
                                  Mark Shipped
                                </button>
                              )}

                              {effectiveStatus === 'SHIPPED' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(o.id, 'COMPLETED')}
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl cursor-pointer"
                                >
                                  Complete
                                </button>
                              )}

                              {effectiveStatus !== 'CANCELLED' && effectiveStatus !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateOrderStatus(o.id, 'CANCELLED')}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[11px] rounded-xl cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={safeOrdersPage}
                totalItems={filteredOrders.length}
                pageSize={ORDERS_PAGE_SIZE}
                onPageChange={setOrdersPage}
                itemLabel="orders"
              />
            </>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-VIEW 2: PRODUCTS & INVENTORY                                    */}
      {/* =================================================================== */}
      {storeSubView === 'PRODUCTS' && (
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(opt.id);
                    setProductsPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    categoryFilter === opt.id
                      ? 'bg-[#F97316] text-white'
                      : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setProductsPage(1);
                }}
                placeholder="Search product or category…"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/60"
              />
            </div>
          </div>

          {paginatedProducts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-white">No Products Found</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Click &ldquo;Add Product&rdquo; above to add a new jersey, knee pad, or sock item to the catalog.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B0F19] text-slate-400 font-bold border-b border-[#1E293B]">
                      <th className="py-3 px-3">Front / Back Preview</th>
                      <th className="py-3 px-3">Product Name & Slug</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Sizes</th>
                      <th className="py-3 px-3">Price & Discount</th>
                      <th className="py-3 px-3">Stock & Visibility</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] text-slate-300">
                    {paginatedProducts.map((p) => {
                      const discountPct =
                        p.originalPrice && p.originalPrice > p.price
                          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                          : null;
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={p.frontImage || p.imageUrl || '/courts/btl.png'}
                                alt={`${p.name} front`}
                                className="w-11 h-11 rounded-lg object-cover border border-slate-700"
                                title="Front Image"
                              />
                              <img
                                src={p.backImage || p.frontImage || p.imageUrl || '/courts/thecong.png'}
                                alt={`${p.name} back`}
                                className="w-11 h-11 rounded-lg object-cover border border-slate-700 opacity-85"
                                title="Back Image (Hover)"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="font-mono text-[10px] text-slate-500 block truncate max-w-xs">
                              Slug: {p.slug || slugifyProductName(p.name)} {p.badge ? `· Badge: ${p.badge}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-slate-800 text-slate-300 font-semibold text-[11px]">
                              {getShopCategoryLabel(p.category)} ({getShopCategoryCode(p.category)})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-400">
                            {(Array.isArray(p.sizes) ? p.sizes : []).join(', ')}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-[#FACC15] block">
                              {Number(p.price || 0).toLocaleString('vi-VN')} đ
                            </span>
                            {discountPct && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500 line-through font-mono">
                                  {Number(p.originalPrice).toLocaleString('vi-VN')} đ
                                </span>
                                <span className="text-[9px] font-bold text-red-400 bg-red-950/70 px-1 rounded border border-red-900">
                                  -{discountPct}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleProductActive(p.id, !p.isActive)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  p.isActive
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {p.isActive ? 'ACTIVE' : 'HIDDEN'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleProductPaused(p.id, !p.isPaused)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  p.isPaused
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-teal-950 text-teal-300 border border-teal-800'
                                }`}
                                title="Toggle Paused / Out of Stock status"
                              >
                                {p.isPaused ? 'PAUSED' : 'IN STOCK'}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Stock: {p.stock}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-300 cursor-pointer"
                                title="Delete / Archive Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={safeProductsPage}
                totalItems={filteredProducts.length}
                pageSize={PRODUCTS_PAGE_SIZE}
                onPageChange={setProductsPage}
                itemLabel="products"
              />
            </>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-VIEW 3: CATEGORIES & MERCH                                      */}
      {/* =================================================================== */}
      {storeSubView === 'CATEGORIES' && (
        <div>
          <h3 className="font-bold text-sm text-white mb-3">DVA Store Categories & VietQR Prefix Codes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES_OVERVIEW.map(({ id, icon: Icon, title, body }) => {
              const count = storeProducts.filter((p) => p.category === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(id);
                    setStoreSubView('PRODUCTS');
                  }}
                  className="rounded-3xl border border-[#1E293B] hover:border-[#FACC15]/50 bg-[#111827] p-6 text-left space-y-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-7 h-7 text-[#FACC15]" />
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0B0F19] text-slate-300 border border-slate-800">
                      DVA {getShopCategoryCode(id)} [CODE]
                    </span>
                  </div>
                  <p className="font-bold text-sm text-white">{title}</p>
                  <p className="text-xs text-slate-400">{body}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                    {count} products in catalog →
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ADD / EDIT PRODUCT MODAL (WITH CLOUDINARY DUAL-IMAGE UPLOAD)        */}
      {/* =================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#161F30] border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-heading font-black text-base text-white">
                {productForm.id ? 'Edit Store Product' : 'Add New Store Product'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. DVA Pro Sleeveless Match Jersey 2026"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Internal SKU (Reconciliation Code)
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        sku: e.target.value.toUpperCase().replace(/[^A-Z0-9-_]/g, ''),
                      }))
                    }
                    placeholder="e.g. MIKASA-V200W or DVA-JSY-01"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    URL Slug (for /shop/[category]/[slug])
                  </label>
                  <input
                    type="text"
                    value={productForm.slug}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    placeholder="e.g. dva-pro-jersey-2026 (auto if blank)"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => {
                      const nextCat = e.target.value as StoreCategoryId;
                      const isJ = isJerseyCategory(nextCat);
                      setProductForm((prev) => ({
                        ...prev,
                        category: nextCat,
                        allowCustomPrint: isJ,
                        sizesInput: isJ
                          ? 'S, M, L, XL, 2XL'
                          : nextCat === 'VOLLEYBALLS'
                          ? 'Size 5'
                          : nextCat === 'KNEE_PADS'
                          ? 'S/M (Black), L/XL (Black)'
                          : 'M (EU 36-40), L (EU 41-45)',
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white"
                  >
                    {SHOP_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Badge Label (Optional)</label>
                  <input
                    type="text"
                    value={productForm.badge}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="PRO KIT / BEST SELLER / OFFICIAL MATCH"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['NEW RELEASE', 'OFFICIAL MATCH', 'BEST SELLER', 'HOT DEAL', 'LIMITED EDITION'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          setProductForm((prev) => ({
                            ...prev,
                            badge: prev.badge === chip ? '' : chip,
                          }))
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                          productForm.badge === chip
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Display Priority (Sort Order)
                    </label>
                    <input
                      type="number"
                      value={productForm.sortOrder}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                      placeholder="0 (Top Pin: 100)"
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Higher number ranks first</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Stock Inventory
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={productForm.stock}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                      placeholder="50"
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Available units in stock</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Original Price (VND - Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, originalPrice: e.target.value }))}
                    placeholder="e.g. 420000"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Selling Price (VND) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                {/* Discount Live Preview */}
                {Number(productForm.originalPrice) > Number(productForm.price) && (
                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 flex items-center justify-between">
                    <span>Discount Live Preview:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-slate-400 font-mono">
                        {Number(productForm.originalPrice).toLocaleString('vi-VN')} đ
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        → {Number(productForm.price).toLocaleString('vi-VN')} đ
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">
                        -{Math.round(((Number(productForm.originalPrice) - Number(productForm.price)) / Number(productForm.originalPrice)) * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    Available Sizes / Variants (Comma-separated, S and up)
                  </label>
                  <input
                    type="text"
                    value={productForm.sizesInput}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, sizesInput: e.target.value }))}
                    placeholder="S, M, L, XL, 2XL"
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Dual Image Uploaders (Front & Back) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Front Image (Default View) *</span>
                    <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer">
                      {uploadingSide === 'FRONT' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload('FRONT', e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={productForm.frontImage}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, frontImage: e.target.value }))}
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full px-3 py-1.5 bg-[#111827] border border-slate-700 rounded-lg text-[11px] text-white font-mono"
                  />
                  {productForm.frontImage && (
                    <img
                      src={productForm.frontImage}
                      alt="Front preview"
                      className="w-full h-32 object-cover rounded-xl border border-slate-800"
                    />
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Back Image (Hover View) *</span>
                    <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer">
                      {uploadingSide === 'BACK' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload('BACK', e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={productForm.backImage}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, backImage: e.target.value }))}
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full px-3 py-1.5 bg-[#111827] border border-slate-700 rounded-lg text-[11px] text-white font-mono"
                  />
                  {productForm.backImage && (
                    <img
                      src={productForm.backImage}
                      alt="Back preview"
                      className="w-full h-32 object-cover rounded-xl border border-slate-800"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Description (Markdown / Specs)
                </label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Material, fit, performance highlights, sizing advice..."
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isActive}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Active Catalog Item (Show on public /shop)</span>
                </label>

                <label className="flex items-center gap-2.5 font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isPaused}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, isPaused: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Temporarily Paused / Out of Stock (Disable Buy Now on Storefront)</span>
                </label>

                <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.allowCustomPrint}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, allowCustomPrint: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span>Allow Player Competition Name Printing on Jersey</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#F97316] text-white font-bold cursor-pointer"
                >
                  {savingProduct ? 'Saving...' : productForm.id ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage 2 Dedicated Dispatch Email Preview Modal */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0B111E] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 text-orange-400 border border-orange-500/20">
                  <Truck className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {dispatchModalOrder.shippingEmailSentAt ? 'Resend Dispatch Email' : 'Send Dispatch Email'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Order <span className="font-mono text-orange-400 font-bold">#{dispatchModalOrder.orderCode}</span> · Stage 2 Fulfillment Notification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-only Order Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Order Details (Read-only)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getOrderStatusBadgeClass(dispatchModalOrder.status || 'PENDING')}`}>
                  {dispatchModalOrder.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer:</span>
                  <span className="font-bold text-white text-sm">{dispatchModalOrder.customerName}</span>
                  <span className="block text-slate-400 font-mono text-[11px]">{dispatchModalOrder.customerPhone || dispatchModalOrder.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email Recipient:</span>
                  <span className="font-bold text-sky-400 font-mono text-xs break-all">
                    {dispatchModalOrder.customerEmail || dispatchModalOrder.email || (
                      <span className="text-rose-400 italic">No email provided</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Fulfillment Method:</span>
                  {dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-orange-400">
                      <Truck className="w-3.5 h-3.5" /> Home Delivery (Ship COD)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                      <MapPin className="w-3.5 h-3.5" /> Court Pick-up (Free)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Destination / Pickup Address:</span>
                  <span className="text-slate-200 text-xs">
                    {dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY'
                      ? dispatchModalOrder.shippingAddress || 'Not specified'
                      : '155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)'}
                  </span>
                </div>
              </div>

              {/* Products list */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">Ordered Items:</span>
                {dispatchModalOrder.items && dispatchModalOrder.items.length > 0 ? (
                  dispatchModalOrder.items.map((it: StoreOrderItem, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{it.productName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-sky-300 font-semibold">
                          Size: {it.size || 'Free Size'}
                        </span>
                        <span className="text-slate-400 font-bold">×{it.quantity || 1}</span>
                        {it.customName && (
                          <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Print Name: {it.customName}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">
                        {((Number(it.unitPrice ?? it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-300 py-1">
                    {dispatchModalOrder.productName} ({dispatchModalOrder.size}) × {dispatchModalOrder.quantity || 1}
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 text-xs font-bold">
                  <span className="text-slate-400">Total Order Amount:</span>
                  <span className="text-[#FACC15] font-mono text-sm">
                    {Number(dispatchModalOrder.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Fulfillment Form Inputs */}
            {dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY' ? (
              <div className="space-y-4 p-4 rounded-2xl bg-orange-950/20 border border-orange-800/30">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                  <Truck className="w-4 h-4" />
                  <span>Home Delivery Shipping Parameters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Shipping Carrier
                    </label>
                    <input
                      type="text"
                      value={dispatchCarrier}
                      onChange={(e) => setDispatchCarrier(e.target.value)}
                      placeholder="Viettel Post, GHTK, EMS..."
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white text-xs font-medium"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['Viettel Post', 'GHTK', 'GHN', 'EMS'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setDispatchCarrier(c)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                            dispatchCarrier === c
                              ? 'bg-orange-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tracking Code / Parcel ID
                    </label>
                    <input
                      type="text"
                      value={dispatchTrackingCode}
                      onChange={(e) => setDispatchTrackingCode(e.target.value)}
                      placeholder="e.g. VTP892348123"
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white text-xs font-mono font-bold text-amber-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Customer will use this tracking code to check parcel delivery status
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Shipping Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={dispatchShippingNotes}
                    onChange={(e) => setDispatchShippingNotes(e.target.value)}
                    placeholder="e.g. Dispatched to courier hub, estimated delivery within 1-2 days..."
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                  ⚠️ <strong>Notice:</strong> Customer notification email automatically includes a reminder to pay courier shipping fee (COD) upon receiving the parcel.
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <MapPin className="w-4 h-4" />
                  <span>Court Pick-up Fulfillment Parameters (Free Pick-up)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                  <div className="font-bold text-white">📍 DVA Arena (BTL Thong Tin Volleyball Court)</div>
                  <div className="text-slate-300 text-[11px]">155 Truong Chinh, Phuong Liet, Thanh Xuan, Hanoi</div>
                  <p className="text-[11px] text-emerald-300/90 leading-relaxed pt-1">
                    Jerseys / gear are ready at the arena. The email instructs the customer to collect directly from the Head Coach during scheduled training or open scrimmage sessions.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Pickup Instructions / Note for Customer (Optional)
                  </label>
                  <input
                    type="text"
                    value={dispatchShippingNotes}
                    onChange={(e) => setDispatchShippingNotes(e.target.value)}
                    placeholder="e.g. Jersey kept at DVA office desk, contact Coach Duy before 18:00 scrimmage..."
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* Live Email Preview Box */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Live Customer Email Preview
              </span>
              <div className="p-4 rounded-2xl bg-[#090D16] border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400 font-mono text-[11px]">
                    To: <strong className="text-sky-300">{dispatchModalOrder.customerEmail || dispatchModalOrder.email || 'customer@email.com'}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 text-[10px] font-bold">
                    Resend Official Domain
                  </span>
                </div>

                <div className="font-bold text-white text-sm">
                  {dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY'
                    ? '🚚 YOUR ORDER IS ON THE WAY / ĐƠN HÀNG ĐANG ĐƯỢC GIAO ĐẾN BẠN!'
                    : '🏐 YOUR GEAR IS READY AT DVA COURT! / ĐỒNG PHỤC ĐÃ SẴN SÀNG TẠI SÂN DVA!'}
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Xin chào / Dear <strong>{dispatchModalOrder.customerName}</strong>,{' '}
                  {dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY'
                    ? `your order has been dispatched via courier (${dispatchCarrier || 'Viettel Post'}) to ${dispatchModalOrder.shippingAddress || 'your registered address'}. Please prepare cash for courier COD upon delivery.`
                    : 'your order is ready for pickup at DVA Court (155 Truong Chinh, Hanoi). You may collect directly from Head Coach Hoang Quoc Duy.'}
                </p>

                {dispatchModalOrder.deliveryMethod === 'HOME_DELIVERY' && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-sky-900/60 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Tracking Code:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {dispatchTrackingCode || 'Updating / Pending'}
                    </span>
                  </div>
                )}

                {dispatchShippingNotes && (
                  <div className="text-[11px] text-slate-400 italic">
                    Note: {dispatchShippingNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSendingDispatch}
                onClick={() => setDispatchModalOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingDispatch}
                onClick={handleConfirmSendDispatchEmail}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 cursor-pointer transition-all"
              >
                {isSendingDispatch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isSendingDispatch
                    ? 'Sending via Resend...'
                    : dispatchModalOrder.shippingEmailSentAt
                    ? 'Confirm & Resend Dispatch Email'
                    : 'Confirm & Send Dispatch Email'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
