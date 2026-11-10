import React, { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Shirt,
  Volleyball,
  Backpack,
  Plus,
  Package,
  Receipt,
  Wallet,
  Layers,
  Search,
} from 'lucide-react';
import { PaymentStatus, StoreCategoryId, StoreSubView } from '../../../types';
import { storeService } from '../../../services/api';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { useAdminMetrics } from '../hooks/useAdminMetrics';

const PRODUCTS_PAGE_SIZE = 8;
const ORDERS_PAGE_SIZE = 10;

const SUB_TABS: { id: StoreSubView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'PRODUCTS', label: 'Products & Inventory', icon: Package },
  { id: 'ORDERS', label: 'Orders & VietQR', icon: Receipt },
  { id: 'CATEGORIES', label: 'Categories & Merch', icon: Layers },
];

const CATEGORY_OPTIONS: { id: 'ALL' | StoreCategoryId; label: string }[] = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'JERSEYS', label: 'Jerseys' },
  { id: 'VOLLEYBALLS', label: 'Volleyballs' },
  { id: 'TRAINING_GEAR', label: 'Training Gear' },
  { id: 'ACCESSORIES', label: 'Accessories' },
];

const CATEGORIES: {
  id: StoreCategoryId;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}[] = [
  { id: 'JERSEYS', icon: Shirt, title: 'Jerseys', body: 'Home, away and training kits.' },
  { id: 'VOLLEYBALLS', icon: Volleyball, title: 'Volleyballs', body: 'Indoor match & practice balls.' },
  { id: 'TRAINING_GEAR', icon: Backpack, title: 'Training Gear', body: 'Knee pads, bags and accessories.' },
];

/**
 * DVA Store module — Phase 2 extensible architecture with internal sub-tabs (`?tab=store&view=...`),
 * lazy-loaded data (`storeProducts`, `storeOrders`), and VietQR order approval handlers.
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

  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [orderQuery, setOrderQuery] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return storeProducts.filter((product) => {
      if (categoryFilter !== 'ALL' && product.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q)
      );
    });
  }, [storeProducts, categoryFilter, productQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return storeOrders.filter((order) => {
      if (orderStatusFilter !== 'ALL' && order.paymentStatus !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        order.orderCode.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerPhone.toLowerCase().includes(q)
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

  const handleToggleProductActive = async (productId: string, nextActive: boolean) => {
    try {
      await storeService.toggleProductActive(productId, nextActive);
      setStoreProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: nextActive } : p))
      );
      notify(`Product visibility updated to ${nextActive ? 'Active' : 'Hidden'}.`);
    } catch {
      notify('Unable to update product status.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: PaymentStatus) => {
    try {
      await storeService.updateOrderStatus(orderId, status);
      setStoreOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: status } : o))
      );
      notify(`Store order updated to ${status}.`);
    } catch {
      notify('Unable to update store order status.');
    }
  };

  const kpis = [
    {
      icon: Wallet,
      label: 'Store Revenue',
      value: `${metrics.storeRevenue.toLocaleString('vi-VN')} đ`,
      tone: 'text-[#FACC15]',
    },
    {
      icon: Package,
      label: 'Products',
      value: String(storeProducts.length),
      tone: 'text-[#38BDF8]',
    },
    {
      icon: Receipt,
      label: 'Orders',
      value: String(storeOrders.length),
      tone: 'text-[#F97316]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FACC15]/10 border border-[#FACC15]/30 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-[#FACC15]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-xl text-white">DVA Store</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/40">
                Coming in Phase 2
              </span>
            </div>
            <p className="text-xs text-slate-400">Official club merchandise & equipment management.</p>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Available in Phase 2"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1E293B] text-slate-500 border border-[#1E293B] flex items-center gap-1.5 cursor-not-allowed self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </button>
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

      {/* Segmented Internal Sub-Tabs (?tab=store&view=products|orders|categories) */}
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

      {/* SUB-VIEW 1: PRODUCTS & INVENTORY */}
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
                placeholder="Search SKU or product…"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/60"
              />
            </div>
          </div>

          {paginatedProducts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-white">No Products in Catalog Yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Product catalog & SKU inventory endpoints (`/api/store/products`) are wired and ready for Phase 2 merchandise launch.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B0F19] text-slate-400 font-bold border-b border-[#1E293B]">
                      <th className="py-3 px-3">SKU / Product</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3">Stock</th>
                      <th className="py-3 px-3 text-right">Visibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] text-slate-300">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">{p.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{p.sku}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-400">{p.category}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#FACC15]">
                          {p.price.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 font-mono">{p.stock}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleProductActive(p.id, !p.isActive)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                              p.isActive
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE' : 'HIDDEN'}
                          </button>
                        </td>
                      </tr>
                    ))}
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

      {/* SUB-VIEW 2: ORDERS & VIETQR */}
      {storeSubView === 'ORDERS' && (
        <div className="rounded-3xl border border-[#1E293B] bg-[#111827] p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'PENDING', 'PAID', 'CANCELLED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter(status);
                    setOrdersPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    orderStatusFilter === status
                      ? 'bg-[#F97316] text-white'
                      : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  {status === 'ALL' ? 'All Orders' : status}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => {
                  setOrderQuery(e.target.value);
                  setOrdersPage(1);
                }}
                placeholder="Order code, customer, phone…"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38BDF8]/60"
              />
            </div>
          </div>

          {paginatedOrders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-white">No Store Orders Recorded Yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  VietQR order verification and revenue aggregation (`storeRevenue`) are connected and will populate automatically once Store checkout opens.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B0F19] text-slate-400 font-bold border-b border-[#1E293B]">
                      <th className="py-3 px-3">Order Code / Date</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Items</th>
                      <th className="py-3 px-3">Total</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] text-slate-300">
                    {paginatedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono">
                          <span className="font-bold text-white block">{o.orderCode}</span>
                          <span className="text-[10px] text-slate-500">{o.createdAt.slice(0, 10)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-white block">{o.customerName}</span>
                          <span className="font-mono text-[11px] text-slate-400">{o.customerPhone}</span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          {o.items.map((item) => `${item.productName} ×${item.quantity}`).join(', ')}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#FACC15]">
                          {o.totalAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              o.paymentStatus === 'PAID'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : o.paymentStatus === 'CANCELLED'
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {o.paymentStatus === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(o.id, 'PAID')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl cursor-pointer"
                              >
                                Approve Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(o.id, 'CANCELLED')}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-xl cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
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

      {/* SUB-VIEW 3: CATEGORIES & MERCH */}
      {storeSubView === 'CATEGORIES' && (
        <div>
          <h3 className="font-bold text-sm text-white mb-3">Product Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CATEGORIES.map(({ id, icon: Icon, title, body }) => {
              const count = storeProducts.filter((p) => p.category === id).length;
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(id);
                    setStoreSubView('PRODUCTS');
                  }}
                  className="rounded-3xl border border-dashed border-[#1E293B] hover:border-[#FACC15]/50 bg-[#111827]/60 hover:bg-[#111827] p-6 text-center space-y-2 transition-colors cursor-pointer"
                >
                  <Icon className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-sm text-white">{title}</p>
                  <p className="text-xs text-slate-500">{body}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {count} products
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
