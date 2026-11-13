import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  Ruler,
  Truck,
  MapPin,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  X,
  Search,
  ShieldCheck,
  Shirt,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Info,
  Phone,
  Mail,
  User as UserIcon,
  Instagram,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minus,
  Plus,
  ChevronRight,
  BadgePercent,
  Clock,
} from 'lucide-react';
import {
  StoreProduct,
  StoreCategoryId,
  DeliveryMethod,
  SHOP_CATEGORIES,
  isJerseyCategory,
  isBallProduct,
  productRequiresSizeSelection,
  getShopCategoryCode,
  getShopCategoryLabel,
  getCategoryUrlSlug,
  getProductUrlPath,
  slugifyProductName,
  StoreOrder,
} from '../types';
import { storeService } from '../services/api';
import { VIETNAM_PROVINCES, formatVietnameseAddress } from '../data/vietnamAddressData';

const DEFAULT_COURT_PICKUP_ADDRESS = '155 Truong Chinh - Thanh Xuan - Hanoi (DVA Court - BTL Thong Tin)';

const FALLBACK_SHOP_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod-dva-slv-2026',
    sku: 'DVA-JSY-SLV-01',
    slug: 'dva-pro-sleeveless-training-tank',
    name: 'DVA Pro Sleeveless Training & Scrimmage Tank',
    category: 'SLEEVELESS',
    originalPrice: 350000,
    price: 290000,
    frontImage: '/courts/btl.png',
    backImage: '/courts/thecong.png',
    imageUrl: '/courts/btl.png',
    description:
      'Ultra-lightweight moisture-wicking sleeveless match tank engineered for explosive vertical jump, spike approach, and unrestricted shoulder mobility. Features custom back player name sublimation.',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 50,
    badge: 'PRO KIT',
    allowCustomPrint: true,
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-dva-ss-2026',
    sku: 'DVA-JSY-SH-01',
    slug: 'dva-2026-official-match-jersey-short-sleeve',
    name: 'DVA 2026 Official Match Jersey — Short Sleeve (Home Red)',
    category: 'SHORT_SLEEVE',
    originalPrice: 420000,
    price: 350000,
    frontImage: '/courts/thecong.png',
    backImage: '/courts/btl.png',
    imageUrl: '/courts/thecong.png',
    description:
      'Official DVA Volleyball Club home tournament jersey with 4-way micro-mesh ventilation side panels and custom player competition name printing on back.',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 60,
    badge: 'BEST SELLER',
    allowCustomPrint: true,
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-dva-wmn-2026',
    sku: 'DVA-JSY-WMN-01',
    slug: 'dva-womens-elite-competition-jersey',
    name: "DVA Elite Women's Competition Jersey (Sunset Orange)",
    category: 'WOMEN',
    originalPrice: 400000,
    price: 350000,
    frontImage: '/courts/btl.png',
    backImage: '/courts/thecong.png',
    imageUrl: '/courts/btl.png',
    description:
      "Tailored athletic silhouette designed for DVA Women's Division athletes. Ultra-light 4-way stretch polyester with custom competition player name printing.",
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 40,
    badge: 'WOMEN PRO',
    allowCustomPrint: true,
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-dva-kp-pro',
    sku: 'DVA-PAD-KP-01',
    slug: 'dva-impact-shield-pro-knee-pads',
    name: 'DVA Impact Shield Volleyball Knee Pads (Pair)',
    category: 'KNEE_PADS',
    originalPrice: 300000,
    price: 250000,
    frontImage: '/courts/thecong.png',
    backImage: '/courts/btl.png',
    imageUrl: '/courts/thecong.png',
    description:
      'High-density multi-segment EVA shock-absorbing foam knee pads protecting patella and lateral ligaments during aggressive Taraflex court dives and floor recoveries.',
    sizes: ['S/M (Black)', 'L/XL (Black)', 'S/M (White)', 'L/XL (White)'],
    stock: 80,
    badge: 'PROTECTION',
    allowCustomPrint: false,
    isPaused: false,
    isActive: true,
  },
  {
    id: 'prod-dva-sck-crew',
    sku: 'DVA-SCK-CRW-01',
    slug: 'dva-cushioned-mid-crew-court-socks',
    name: 'DVA Grip-Lock Pro Compression Crew Socks',
    category: 'SOCKS',
    originalPrice: 150000,
    price: 120000,
    frontImage: '/courts/btl.png',
    backImage: '/courts/thecong.png',
    imageUrl: '/courts/btl.png',
    description:
      'Cushioned heel and forefoot court socks with anatomical arch compression band and anti-slip footbed traction preventing blistering during high-friction approaches.',
    sizes: ['M (EU 36-40) - White/Red', 'L (EU 41-45) - White/Red', 'L (EU 41-45) - Stealth Black'],
    stock: 120,
    badge: 'ESSENTIAL',
    allowCustomPrint: false,
    isPaused: false,
    isActive: true,
  },
];

/** Size guide table: strictly starting from S and up (NO XS) */
const JERSEY_SIZE_GUIDE_ROWS = [
  { size: 'S', height: '160 – 167 cm', weight: '50 – 60 kg', chest: '92 cm', length: '67 cm' },
  { size: 'M', height: '168 – 174 cm', weight: '60 – 68 kg', chest: '96 cm', length: '70 cm' },
  { size: 'L', height: '175 – 180 cm', weight: '68 – 76 kg', chest: '100 cm', length: '73 cm' },
  { size: 'XL', height: '181 – 187 cm', weight: '76 – 85 kg', chest: '104 cm', length: '76 cm' },
  { size: '2XL', height: '188 – 198 cm', weight: '85 – 98 kg', chest: '110 cm', length: '79 cm' },
];

export const ShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { categorySlug, productSlug } = useParams<{ categorySlug?: string; productSlug?: string }>();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'ALL' | StoreCategoryId>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);

  // Size Guide Modal
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false);

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<StoreProduct | null>(null);
  const [quickViewActiveImage, setQuickViewActiveImage] = useState<'FRONT' | 'BACK'>('FRONT');

  // High-Res Image Zoom / Lightbox Modal
  const [zoomLightbox, setZoomLightbox] = useState<{
    isOpen: boolean;
    title: string;
    frontImage: string;
    backImage?: string;
    activeSide: 'FRONT' | 'BACK';
    zoomLevel: number;
  }>({
    isOpen: false,
    title: '',
    frontImage: '',
    backImage: undefined,
    activeSide: 'FRONT',
    zoomLevel: 1,
  });

  // Buy Now Checkout Modal State
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'FORM' | 'PAYMENT' | 'CONFIRMED'>('FORM');

  // Checkout Form Fields
  const [selectedSize, setSelectedSize] = useState<string>('L');
  const [quantity, setQuantity] = useState<number>(1);
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [enableCustomPrint, setEnableCustomPrint] = useState<boolean>(true);
  const [customName, setCustomName] = useState<string>(''); // ONLY PLAYER NAME

  // Customer & Delivery Fields
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [socialLink, setSocialLink] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('COURT_PICKUP');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // 4-Level Cascading Address State (Tỉnh/Thành -> Quận/Huyện -> Phường/Xã -> Số nhà/Đường)
  const [selectedProvince, setSelectedProvince] = useState<string>('Hà Nội');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Quận Thanh Xuân');
  const [selectedWard, setSelectedWard] = useState<string>('Phường Phương Liệt');
  const [specificAddress, setSpecificAddress] = useState<string>('');

  const availableDistricts = useMemo(() => {
    const prov = VIETNAM_PROVINCES.find((p) => p.name === selectedProvince);
    return prov ? prov.districts : [];
  }, [selectedProvince]);

  const availableWards = useMemo(() => {
    const dist = availableDistricts.find((d) => d.name === selectedDistrict);
    return dist ? dist.wards : [];
  }, [availableDistricts, selectedDistrict]);

  const handleProvinceChange = (newProvince: string) => {
    setSelectedProvince(newProvince);
    const prov = VIETNAM_PROVINCES.find((p) => p.name === newProvince);
    const firstDist = prov?.districts[0]?.name || '';
    setSelectedDistrict(firstDist);
    const firstWard = prov?.districts[0]?.wards[0] || '';
    setSelectedWard(firstWard);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    const dist = availableDistricts.find((d) => d.name === newDistrict);
    const firstWard = dist?.wards[0] || '';
    setSelectedWard(firstWard);
  };

  useEffect(() => {
    if (deliveryMethod === 'HOME_DELIVERY') {
      const fullAddr = formatVietnameseAddress(specificAddress, selectedWard, selectedDistrict, selectedProvince);
      setShippingAddress(fullAddr);
    }
  }, [deliveryMethod, specificAddress, selectedWard, selectedDistrict, selectedProvince]);

  // Submission & Payment State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<StoreOrder | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    bankId: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    amount: number;
    transferContent: string;
    qrUrl: string;
  } | null>(null);
  const [confirmingTransfer, setConfirmingTransfer] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dedicated Product Detail View State (when URL matches /shop/:categorySlug/:productSlug)
  const [detailActiveSide, setDetailActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [detailSelectedSize, setDetailSelectedSize] = useState<string>('L');
  const [detailQuantity, setDetailQuantity] = useState<number>(1);
  const [detailPlayerName, setDetailPlayerName] = useState<string>('');
  const [detailHeight, setDetailHeight] = useState<string>('');
  const [detailWeight, setDetailWeight] = useState<string>('');
  const [detailDelivery, setDetailDelivery] = useState<DeliveryMethod>('COURT_PICKUP');
  const [detailShippingAddress, setDetailShippingAddress] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const res = await storeService.getProducts({ activeOnly: true });
        if (mounted) {
          const activeList =
            Array.isArray(res) && res.length > 0
              ? res.filter((p) => p.isActive !== false)
              : FALLBACK_SHOP_PRODUCTS;
          setProducts(activeList);
        }
      } catch {
        if (mounted) {
          setProducts(FALLBACK_SHOP_PRODUCTS);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // Resolve target product if viewing dedicated detail route /shop/:categorySlug/:productSlug
  const currentDetailProduct = useMemo(() => {
    if (!productSlug) return null;
    const normSlug = productSlug.toLowerCase().trim();
    return (
      products.find(
        (p) =>
          (p.slug && p.slug.toLowerCase().trim() === normSlug) ||
          slugifyProductName(p.name) === normSlug ||
          p.id === normSlug ||
          p.sku?.toLowerCase() === normSlug
      ) || null
    );
  }, [products, productSlug]);

  // Synchronize default detail states when product changes
  useEffect(() => {
    if (currentDetailProduct) {
      setDetailActiveSide('FRONT');
      const sizes = Array.isArray(currentDetailProduct.sizes) && currentDetailProduct.sizes.length > 0
        ? currentDetailProduct.sizes
        : isJerseyCategory(currentDetailProduct.category)
        ? ['S', 'M', 'L', 'XL', '2XL']
        : ['M', 'L'];
      setDetailSelectedSize(sizes.includes('L') ? 'L' : sizes[0]);
      setDetailQuantity(1);
      setDetailPlayerName('');
      setDetailHeight('');
      setDetailWeight('');
      setDetailDelivery('COURT_PICKUP');
      setDetailShippingAddress('');
    }
  }, [currentDetailProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (product.isActive === false) return false;
      if (activeCategory !== 'ALL' && product.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchDesc = (product.description || '').toLowerCase().includes(q);
        const matchCat = getShopCategoryLabel(product.category).toLowerCase().includes(q);
        const matchSku = (product.sku || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat && !matchSku) return false;
      }
      return true;
    });
  }, [products, activeCategory, searchQuery]);

  const handleOpenBuyNow = (
    product: StoreProduct,
    preset?: { size?: string; quantity?: number; playerName?: string; height?: string; weight?: string; delivery?: DeliveryMethod; address?: string }
  ) => {
    if (product.isPaused) return; // Prevent order when paused
    setSelectedProduct(product);
    setCheckoutStep('FORM');
    setFormError(null);
    setCreatedOrder(null);
    setPaymentInfo(null);

    const defaultSizes =
      Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes
        : isJerseyCategory(product.category)
        ? ['S', 'M', 'L', 'XL', '2XL']
        : ['M', 'L'];

    setSelectedSize(preset?.size || (defaultSizes.includes('L') ? 'L' : defaultSizes[0]));
    setQuantity(preset?.quantity && preset.quantity > 0 ? preset.quantity : 1);
    setEnableCustomPrint(isJerseyCategory(product.category));
    setCustomName(preset?.playerName ? preset.playerName.toUpperCase() : '');
    setHeightCm(preset?.height || '');
    setWeightKg(preset?.weight || '');
    setDeliveryMethod(preset?.delivery || 'COURT_PICKUP');
    setShippingAddress(preset?.address || '');
  };

  const handleCloseBuyNow = () => {
    setSelectedProduct(null);
    setFormError(null);
    setCheckoutStep('FORM');
  };

  const handleOpenQuickView = (product: StoreProduct) => {
    setQuickViewProduct(product);
    setQuickViewActiveImage('FRONT');
  };

  const handleOpenZoom = (product: StoreProduct, initialSide: 'FRONT' | 'BACK' = 'FRONT') => {
    setZoomLightbox({
      isOpen: true,
      title: product.name,
      frontImage: product.frontImage || product.imageUrl || '/courts/btl.png',
      backImage: product.backImage || undefined,
      activeSide: initialSide,
      zoomLevel: 1.5,
    });
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2200);
  };

  const isJersey = selectedProduct
    ? (selectedProduct.allowCustomPrint !== false && isJerseyCategory(selectedProduct.category))
    : false;
  const totalAmount = selectedProduct ? selectedProduct.price * Math.max(1, quantity) : 0;

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (selectedProduct.isPaused) {
      setFormError('This product is temporarily out of stock.');
      return;
    }
    setFormError(null);

    if (customerName.trim().length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setFormError('Please enter a valid phone / Zalo number (at least 8 digits).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address to receive your order invoice.');
      return;
    }
    if (deliveryMethod === 'HOME_DELIVERY') {
      if (!specificAddress.trim() || specificAddress.trim().length < 2) {
        setFormError('Please enter your specific street address, house or apartment number.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await storeService.createOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        socialLink: socialLink.trim() || undefined,
        deliveryMethod,
        shippingAddress: deliveryMethod === 'HOME_DELIVERY' ? shippingAddress.trim() : undefined,
        notes: orderNotes.trim() || undefined,
        items: [
          {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            category: selectedProduct.category,
            price: selectedProduct.price,
            quantity: Math.max(1, quantity),
            size: selectedSize,
            ...(isJersey && heightCm ? { height: Number(heightCm) } : {}),
            ...(isJersey && weightKg ? { weight: Number(weightKg) } : {}),
            ...(isJersey && enableCustomPrint && customName.trim()
              ? { customName: customName.trim().toUpperCase() }
              : {}),
          },
        ],
      });

      setCreatedOrder(response.order);
      setPaymentInfo(response.payment);
      setCheckoutStep('PAYMENT');
    } catch (err: any) {
      setFormError(err?.message || 'Could not place order. Please check your information and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTransferred = async () => {
    if (!createdOrder) return;
    setConfirmingTransfer(true);
    try {
      const res = await storeService.confirmOrderPayment(createdOrder.id);
      if (res?.order) {
        setCreatedOrder(res.order);
      }
      setCheckoutStep('CONFIRMED');
    } catch {
      setCheckoutStep('CONFIRMED');
    } finally {
      setConfirmingTransfer(false);
    }
  };

  // Helper to compute discount percent
  const getDiscountPercent = (orig?: number | null, curr?: number | null) => {
    if (!orig || !curr || orig <= curr) return null;
    return Math.round(((orig - curr) / orig) * 100);
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-white pb-24 selection:bg-red-600 selection:text-white">
      {/* ===================================================================== */}
      {/* 1. DEDICATED PRODUCT DETAIL VIEW (/shop/:categorySlug/:productSlug)   */}
      {/* ===================================================================== */}
      {productSlug && currentDetailProduct ? (
        <div className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6 overflow-x-auto no-scrollbar">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <Link to="/shop" className="hover:text-white transition-colors">
              Shop
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-300">
              {getShopCategoryLabel(currentDetailProduct.category)}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-red-400 font-bold truncate max-w-xs">{currentDetailProduct.name}</span>
          </nav>

          <div className="mb-6">
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111827] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Gear</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-[#0E1524] border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl">
            {/* LEFT: GALLERY & HIGH-RES ZOOM VIEWER (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="w-full aspect-[4/5] relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800 group shadow-inner">
                <img
                  src={
                    detailActiveSide === 'BACK' && currentDetailProduct.backImage
                      ? currentDetailProduct.backImage
                      : currentDetailProduct.frontImage || currentDetailProduct.imageUrl || '/courts/btl.png'
                  }
                  alt={currentDetailProduct.name}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Discount Badge */}
                {getDiscountPercent(currentDetailProduct.originalPrice, currentDetailProduct.price) && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                    <BadgePercent className="w-3.5 h-3.5" />
                    <span>-{getDiscountPercent(currentDetailProduct.originalPrice, currentDetailProduct.price)}% OFF</span>
                  </div>
                )}

                {/* Paused Badge */}
                {currentDetailProduct.isPaused && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-amber-500/90 text-black text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Temporarily Out of Stock</span>
                  </div>
                )}

                {/* Zoom Trigger Button */}
                <button
                  type="button"
                  onClick={() => handleOpenZoom(currentDetailProduct, detailActiveSide)}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 transition-all shadow-xl cursor-pointer"
                  title="Click to Zoom & Inspect High-Resolution Details"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Zoom / Inspect</span>
                </button>
              </div>

              {/* Thumbnails Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDetailActiveSide('FRONT')}
                  className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    detailActiveSide === 'FRONT'
                      ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500'
                      : 'bg-[#121A2A] border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <img
                    src={currentDetailProduct.frontImage || currentDetailProduct.imageUrl || '/courts/btl.png'}
                    alt="Front View"
                    className="w-12 h-16 rounded-lg object-cover object-center border border-slate-700 shrink-0"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-extrabold text-white">Front View</span>
                    <span className="text-[10px] text-slate-400">Match Layout</span>
                  </div>
                </button>

                {currentDetailProduct.backImage ? (
                  <button
                    type="button"
                    onClick={() => setDetailActiveSide('BACK')}
                    className={`p-2 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      detailActiveSide === 'BACK'
                        ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500'
                        : 'bg-[#121A2A] border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <img
                      src={currentDetailProduct.backImage}
                      alt="Back View"
                      className="w-12 h-16 rounded-lg object-cover object-center border border-slate-700 shrink-0"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-extrabold text-white">Back View</span>
                      <span className="text-[10px] text-slate-400">Player Name Print</span>
                    </div>
                  </button>
                ) : (
                  <div className="p-2 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[11px] text-slate-500">
                    Single View Angle
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: SPECS & BUY NOW CONFIGURATION (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-800/60">
                    {getShopCategoryLabel(currentDetailProduct.category)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                    SKU: {currentDetailProduct.sku || 'DVA-STORE'}
                  </span>
                  {currentDetailProduct.badge && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-orange-600/90 text-white">
                      {currentDetailProduct.badge}
                    </span>
                  )}
                </div>

                <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                  {currentDetailProduct.name}
                </h1>

                {/* Price Display with Discount Support */}
                <div className="flex items-baseline gap-3 pt-1 flex-wrap">
                  <span className="font-heading font-black text-3xl sm:text-4xl text-emerald-400 whitespace-nowrap">
                    {Number(currentDetailProduct.price || 0).toLocaleString('vi-VN')} đ
                  </span>
                  {currentDetailProduct.originalPrice && currentDetailProduct.originalPrice > currentDetailProduct.price && (
                    <span className="text-lg sm:text-xl text-slate-500 line-through font-mono whitespace-nowrap">
                      {Number(currentDetailProduct.originalPrice).toLocaleString('vi-VN')} đ
                    </span>
                  )}
                  {getDiscountPercent(currentDetailProduct.originalPrice, currentDetailProduct.price) && (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap">
                      -{getDiscountPercent(currentDetailProduct.originalPrice, currentDetailProduct.price)}% OFF
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-300 leading-relaxed pt-1">
                  {currentDetailProduct.description ||
                    'Official DVA Volleyball Club competitive kit engineered for intense training approaches and tournament performance.'}
                </p>

                {/* Status Notice if Paused */}
                {currentDetailProduct.isPaused && (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm font-bold text-white mb-0.5">
                        Temporarily Out of Stock
                      </strong>
                      <span>
                        This item is currently being restocked or prepared for the next tournament drop. Orders are temporarily paused.
                      </span>
                    </div>
                  </div>
                )}

                {/* Sizing & Quantity Matrix */}
                <div className="space-y-4 pt-3 border-t border-slate-800">
                  {productRequiresSizeSelection(currentDetailProduct) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Select Size (Starts from S — No XS)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsSizeGuideOpen(true)}
                          className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Ruler className="w-4 h-4" />
                          <span>Size Guide</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(Array.isArray(currentDetailProduct.sizes) && currentDetailProduct.sizes.length > 0
                          ? currentDetailProduct.sizes
                          : isJerseyCategory(currentDetailProduct.category)
                          ? ['S', 'M', 'L', 'XL', '2XL']
                          : ['M', 'L']
                        ).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setDetailSelectedSize(sz)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                              detailSelectedSize === sz
                                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/30'
                                : 'bg-[#111827] border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector with Clear Multi-item Note */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#080C14] border border-slate-800">
                    <div>
                      <span className="block text-xs font-bold text-white">Select Quantity</span>
                      <span className="text-[11px] text-slate-400">Total updates automatically</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-[#111827] border border-slate-700 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-black text-sm text-white">
                          {detailQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailQuantity((q) => Math.min(50, q + 1))}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal</span>
                        <span className="text-base font-black text-emerald-400 font-mono whitespace-nowrap">
                          {(currentDetailProduct.price * Math.max(1, detailQuantity)).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notice for orders with quantity > 1 */}
                  {detailQuantity > 1 && productRequiresSizeSelection(currentDetailProduct) && (
                    <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/50 text-[11px] text-blue-300 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>
                        Ordering {detailQuantity} units will apply size <strong>{detailSelectedSize}</strong> and the same player print name to all items in this batch. If you need different sizes or names, please place separate orders.
                      </span>
                    </div>
                  )}

                  {/* Jersey Customization: ONLY "PLAYER NAME" */}
                  {isJerseyCategory(currentDetailProduct.category) && (
                    <div className="p-4 rounded-2xl bg-[#080C14] border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-orange-400">
                        <Shirt className="w-4 h-4" />
                        <span>Custom Jersey Back Printing</span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          PLAYER NAME (Competition Jersey Back Name) — Optional
                        </label>
                        <input
                          type="text"
                          maxLength={24}
                          value={detailPlayerName}
                          onChange={(e) => setDetailPlayerName(e.target.value.toUpperCase())}
                          placeholder="e.g. HOANG DUY, NATHAN, HOANG QUOC..."
                          className="w-full px-4 py-2.5 bg-[#111827] border border-slate-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-orange-500 tracking-wider"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Only competition player name is printed. Jersey number input has been removed for tournament standard compliance.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Fulfillment Selection */}
                  <div className="space-y-2 pt-2">
                    <span className="block text-xs font-black uppercase text-slate-300">
                      Receiving / Fulfillment Option
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDetailDelivery('COURT_PICKUP')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          detailDelivery === 'COURT_PICKUP'
                            ? 'bg-emerald-950/40 border-emerald-500 text-white'
                            : 'bg-[#111827] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-bold text-white">Court Pick-up (Free)</span>
                          <span className="block text-[10px] text-slate-400">
                            155 Truong Chinh - Thanh Xuan - Hanoi
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailDelivery('HOME_DELIVERY')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          detailDelivery === 'HOME_DELIVERY'
                            ? 'bg-orange-950/40 border-orange-500 text-white'
                            : 'bg-[#111827] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-bold text-white">Home Delivery</span>
                          <span className="block text-[10px] text-slate-400">COD shipping fee paid to courier</span>
                        </div>
                      </button>
                    </div>

                    {detailDelivery === 'HOME_DELIVERY' && (
                      <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-800/60 text-[11px] text-orange-300 space-y-1">
                        <span>Notice: Shipping fee is paid directly by the recipient upon receiving the parcel (Ship COD).</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTION: BUY NOW BUTTON */}
              <div className="pt-6 border-t border-slate-800 flex items-center gap-4">
                <button
                  type="button"
                  disabled={Boolean(currentDetailProduct.isPaused)}
                  onClick={() =>
                    handleOpenBuyNow(currentDetailProduct, {
                      size: detailSelectedSize,
                      quantity: detailQuantity,
                      playerName: detailPlayerName,
                      delivery: detailDelivery,
                      address: detailShippingAddress,
                    })
                  }
                  className={`flex-1 py-4 px-6 rounded-2xl font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                    currentDetailProduct.isPaused
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-950/50 hover:scale-[1.01]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="whitespace-nowrap">
                    {currentDetailProduct.isPaused
                      ? 'Temporarily Out of Stock'
                      : `Buy Now · ${(currentDetailProduct.price * Math.max(1, detailQuantity)).toLocaleString('vi-VN')} đ`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* 2. CATALOG DISCOVERY & GRID VIEW (/shop)                              */
        /* ===================================================================== */
        <>
          {/* HERO BANNER */}
          <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-[#0E1524] via-[#0B101D] to-[#080C14] pt-28 pb-16">
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <div className="absolute -top-24 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-3xl" />
              <div className="absolute top-12 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="max-w-3xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-800/70 text-red-400 text-xs font-extrabold tracking-widest uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Official DVA Club Gear & Pro Apparel</span>
                  </div>
                  <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.08]">
                    DVA PRO <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">ATHLETIC STORE</span>
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                    Official competition jerseys and protective gear. Click on any item for dedicated details & high-res zoom, or use Quick View to inspect front/back designs and check out instantly.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#161F30] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
                  >
                    <Ruler className="w-4 h-4 text-orange-400" />
                    <span>Size Guide (S – 2XL)</span>
                  </button>
                  <div className="px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Court Pick-up @ 155 Truong Chinh</span>
                  </div>
                </div>
              </div>

              {/* CATEGORY PILLS & SEARCH BAR */}
              <div className="mt-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#0E1524]/90 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('ALL')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === 'ALL'
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    All Gear ({products.filter((p) => p.isActive !== false).length})
                  </button>
                  {SHOP_CATEGORIES.map((cat) => {
                    const count = products.filter((p) => p.isActive !== false && p.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeCategory === cat.id
                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className="text-[10px] opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jersey, knee pads, socks..."
                    className="w-full pl-9 pr-4 py-2 bg-[#080C14] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* PRODUCT CATALOG GRID */}
          <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-10">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="text-sm font-semibold">Loading official DVA Store catalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-[#0E1524] border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">No matching products found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Try selecting another category or clearing your search query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Show All Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4.5">
                {filteredProducts.map((product) => {
                  const isHovered = hoveredProductId === product.id;
                  const frontSrc = product.frontImage || product.imageUrl || '/courts/btl.png';
                  const backSrc = product.backImage || frontSrc;
                  const hasDistinctBack = backSrc && backSrc !== frontSrc;
                  const isProdJersey = isJerseyCategory(product.category);
                  const isProdBall = isBallProduct(product);
                  const catCode = getShopCategoryCode(product.category);
                  const productPath = getProductUrlPath(product);
                  const discountPct = getDiscountPercent(product.originalPrice, product.price);

                  return (
                    <div
                      key={product.id}
                      onMouseEnter={() => setHoveredProductId(product.id)}
                      onMouseLeave={() => setHoveredProductId(null)}
                      className="group bg-[#0E1524] border border-slate-800/80 hover:border-red-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-red-950/20 hover:-translate-y-1 h-full"
                    >
                      <div className="flex flex-col flex-1">
                        {/* COMPACT IMAGE CONTAINER (aspect-[4/5]) */}
                        <div
                          onClick={() => navigate(productPath)}
                          className="relative aspect-[4/5] w-full overflow-hidden bg-slate-900/60 cursor-pointer"
                        >
                          {/* Front Image */}
                          <img
                            src={frontSrc}
                            alt={`${product.name} - Front View`}
                            className={`w-full h-full object-cover object-center transition-all duration-500 ease-out ${
                              isHovered && hasDistinctBack ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                            }`}
                          />
                          {/* Back Image on Hover */}
                          {hasDistinctBack && (
                            <img
                              src={backSrc}
                              alt={`${product.name} - Back View`}
                              className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ease-out ${
                                isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                              }`}
                            />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-[#0E1524]/70 via-transparent to-black/25 pointer-events-none" />

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-slate-200 border border-slate-700/80 truncate max-w-[85px] sm:max-w-none">
                              {catCode}
                            </span>
                            <div className="flex items-center gap-1">
                              {discountPct && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-600 text-white shadow">
                                  -{discountPct}%
                                </span>
                              )}
                              {product.isPaused ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-black shadow">
                                  Out
                                </span>
                              ) : product.badge ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-600 text-white shadow truncate max-w-[80px]">
                                  {product.badge}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Floating Quick View Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuickView(product);
                            }}
                            className="absolute bottom-2 right-2 p-1.5 sm:p-2 rounded-xl bg-black/80 hover:bg-red-600 text-white border border-slate-700/80 backdrop-blur-md shadow-lg transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Quick View"
                          >
                            <Eye className="w-3.5 h-3.5 text-orange-400 group-hover:text-white transition-colors" />
                          </button>

                          {/* Front / Back Indicator */}
                          {hasDistinctBack && (
                            <div className="absolute bottom-2 left-2 pointer-events-none">
                              <span className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold bg-black/75 backdrop-blur-md text-slate-300 border border-slate-700/70 flex items-center gap-1">
                                <span className={`w-1 h-1 rounded-full ${isHovered ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                                <span className="hidden sm:inline">{isHovered ? 'Back' : 'Front'}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* CARD BODY: Clean & Minimalist (No description snippet!) */}
                        <div className="p-2.5 sm:p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                          <Link to={productPath} className="block group/title">
                            <h3 className="font-heading font-black text-xs sm:text-sm text-white group-hover/title:text-red-400 transition-colors leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
                              {product.name}
                            </h3>
                          </Link>

                          {/* Compact Attribute Tag */}
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                            {isProdJersey ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-semibold border border-slate-700/60 truncate">
                                5 Sizes (S–2XL) · Custom Print
                              </span>
                            ) : isProdBall ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/60 truncate">
                                Size 5 · FIVB Match Ball
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-semibold border border-slate-700/60 truncate">
                                {(Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ['Standard']).join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CARD FOOTER: Compact Price & Buy Now */}
                      <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 shrink-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
                            <span className="font-heading font-bold text-xs sm:text-sm md:text-base text-emerald-400 whitespace-nowrap">
                              {Number(product.price || 0).toLocaleString('vi-VN')} đ
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-[10px] sm:text-xs text-slate-500 line-through font-mono whitespace-nowrap">
                                {Number(product.originalPrice).toLocaleString('vi-VN')} đ
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={Boolean(product.isPaused)}
                          onClick={() => handleOpenBuyNow(product)}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-heading font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                            product.isPaused
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-950/40'
                          }`}
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>{product.isPaused ? 'Paused' : 'Buy'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ===================================================================== */}
      {/* 3. QUICK VIEW MODAL                                                   */}
      {/* ===================================================================== */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl bg-[#121A2A] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#161F30] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-800">
                  Quick View · {getShopCategoryLabel(quickViewProduct.category)}
                </span>
                <span className="text-xs text-slate-400 font-mono">SKU: {quickViewProduct.sku || 'DVA'}</span>
              </div>
              <button
                type="button"
                onClick={() => setQuickViewProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                <div className="space-y-3">
                  <div className="w-full aspect-[4/5] relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800 shadow-inner">
                    <img
                      src={
                        quickViewActiveImage === 'BACK' && quickViewProduct.backImage
                          ? quickViewProduct.backImage
                          : quickViewProduct.frontImage || quickViewProduct.imageUrl || '/courts/btl.png'
                      }
                      alt={quickViewProduct.name}
                      className="w-full h-full object-cover object-center"
                    />

                    {/* Zoom Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenZoom(quickViewProduct, quickViewActiveImage)}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold border border-slate-700 backdrop-blur-md flex items-center gap-1.5 shadow-xl cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-orange-400" />
                      <span>Zoom</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickViewActiveImage('FRONT')}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        quickViewActiveImage === 'FRONT'
                          ? 'bg-red-950 border-red-500 text-white'
                          : 'bg-[#0E1524] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Front Photo</span>
                    </button>
                    {quickViewProduct.backImage && (
                      <button
                        type="button"
                        onClick={() => setQuickViewActiveImage('BACK')}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          quickViewActiveImage === 'BACK'
                            ? 'bg-red-950 border-red-500 text-white'
                            : 'bg-[#0E1524] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Back Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-heading font-black text-xl text-white">{quickViewProduct.name}</h3>
                    <div className="flex items-baseline gap-2.5 mt-2 flex-wrap">
                      <span className="font-heading font-black text-2xl text-emerald-400 whitespace-nowrap">
                        {Number(quickViewProduct.price || 0).toLocaleString('vi-VN')} đ
                      </span>
                      {quickViewProduct.originalPrice && quickViewProduct.originalPrice > quickViewProduct.price && (
                        <span className="text-sm text-slate-500 line-through font-mono whitespace-nowrap">
                          {Number(quickViewProduct.originalPrice).toLocaleString('vi-VN')} đ
                        </span>
                      )}
                      {getDiscountPercent(quickViewProduct.originalPrice, quickViewProduct.price) && (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap">
                          -{getDiscountPercent(quickViewProduct.originalPrice, quickViewProduct.price)}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {quickViewProduct.description || 'Official DVA Volleyball Club athletic gear.'}
                  </p>

                  {isBallProduct(quickViewProduct) ? (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-300 block">Specification</span>
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs font-bold text-emerald-300">
                        Official Size 5 · 18-Panel Double-Dimple Microfiber Match Ball
                      </span>
                    </div>
                  ) : productRequiresSizeSelection(quickViewProduct) ? (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase text-slate-300 block">Available Sizes</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(quickViewProduct.sizes) && quickViewProduct.sizes.length > 0
                          ? quickViewProduct.sizes
                          : ['S', 'M', 'L', 'XL', '2XL']
                        ).map((sz) => (
                          <span key={sz} className="px-2.5 py-1 rounded-lg bg-[#0E1524] border border-slate-700 text-xs font-bold text-slate-200">
                            {sz}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {quickViewProduct.isPaused && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700 text-amber-200 text-xs flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Temporarily Out of Stock / Coming Back Soon</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={Boolean(quickViewProduct.isPaused)}
                      onClick={() => {
                        const prod = quickViewProduct;
                        setQuickViewProduct(null);
                        handleOpenBuyNow(prod);
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        quickViewProduct.isPaused
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{quickViewProduct.isPaused ? 'Out of Stock' : 'Buy Now Directly'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const path = getProductUrlPath(quickViewProduct);
                        setQuickViewProduct(null);
                        navigate(path);
                      }}
                      className="px-4 py-3 rounded-xl bg-[#0E1524] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Full Specs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. HIGH-RES IMAGE ZOOM / LIGHTBOX MODAL                               */}
      {/* ===================================================================== */}
      {zoomLightbox.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-lg animate-in fade-in">
          <div className="w-full max-w-4xl bg-[#080C14] border border-slate-800 rounded-3xl overflow-hidden flex flex-col max-h-[95vh] shadow-2xl">
            {/* Zoom Toolbar */}
            <div className="px-6 py-4 bg-[#0E1524] border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-heading font-black text-sm text-white truncate max-w-md">
                  {zoomLightbox.title} — High-Res Inspection
                </h4>
                <p className="text-[11px] text-slate-400">
                  Inspecting {zoomLightbox.activeSide === 'FRONT' ? 'Front Fabric & Sublimation' : 'Back Player Name Print'}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {zoomLightbox.backImage && (
                  <button
                    type="button"
                    onClick={() =>
                      setZoomLightbox((prev) => ({
                        ...prev,
                        activeSide: prev.activeSide === 'FRONT' ? 'BACK' : 'FRONT',
                      }))
                    }
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    Switch to {zoomLightbox.activeSide === 'FRONT' ? 'Back View' : 'Front View'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setZoomLightbox((prev) => ({
                      ...prev,
                      zoomLevel: Math.max(1, prev.zoomLevel - 0.5),
                    }))
                  }
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-slate-300 w-12 text-center">
                  {Math.round(zoomLightbox.zoomLevel * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setZoomLightbox((prev) => ({
                      ...prev,
                      zoomLevel: Math.min(3, prev.zoomLevel + 0.5),
                    }))
                  }
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomLightbox((prev) => ({ ...prev, zoomLevel: 1 }))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomLightbox((prev) => ({ ...prev, isOpen: false }))}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zoom Image Canvas */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#05070C]">
              <div
                style={{
                  transform: `scale(${zoomLightbox.zoomLevel})`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="origin-center max-w-full"
              >
                <img
                  src={
                    zoomLightbox.activeSide === 'BACK' && zoomLightbox.backImage
                      ? zoomLightbox.backImage
                      : zoomLightbox.frontImage
                  }
                  alt={zoomLightbox.title}
                  className="max-h-[70vh] w-auto rounded-xl shadow-2xl object-contain select-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SIZE GUIDE MODAL (STRICTLY STARTING FROM S - NO XS)               */}
      {/* ===================================================================== */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#121A2A] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#161F30] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Ruler className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-heading font-black text-base text-white">DVA Athletic Size Matrix</h3>
                  <p className="text-xs text-slate-400">Pro Kit Recommendations (Starting from Size S — No XS)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#161F30] text-slate-200 uppercase font-black tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Height</th>
                      <th className="py-3 px-4">Weight</th>
                      <th className="py-3 px-4">Chest</th>
                      <th className="py-3 px-4">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-[#0E1524]">
                    {JERSEY_SIZE_GUIDE_ROWS.map((row) => (
                      <tr key={row.size} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-black text-red-400">{row.size}</td>
                        <td className="py-2.5 px-4 font-mono">{row.height}</td>
                        <td className="py-2.5 px-4 font-mono">{row.weight}</td>
                        <td className="py-2.5 px-4 font-mono">{row.chest}</td>
                        <td className="py-2.5 px-4 font-mono">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#0E1524] border border-slate-800">
                  <span className="font-bold text-white block mb-1">Knee Pads Sizing</span>
                  <p className="text-slate-400 text-[11px]">
                    <strong>S/M:</strong> Athletes 45–68 kg (Knee circumference 32–37 cm)
                    <br />
                    <strong>L/XL:</strong> Athletes 68–95 kg (Knee circumference 37–44 cm)
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0E1524] border border-slate-800">
                  <span className="font-bold text-white block mb-1">Compression Crew Socks</span>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Size M:</strong> EU 36–40 (Women & Youth)
                    <br />
                    <strong>Size L:</strong> EU 41–45 (Men & Senior)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. GUEST BUY-NOW & VIETQR CHECKOUT MODAL                              */}
      {/* ===================================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#121A2A] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#161F30] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-base text-white">
                      {checkoutStep === 'FORM'
                        ? 'Express Guest Checkout'
                        : checkoutStep === 'PAYMENT'
                        ? 'Dynamic VietQR Payment'
                        : 'Order Confirmed'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      No Login Required
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-md">{selectedProduct.name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseBuyNow}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {checkoutStep === 'FORM' && (
                <form onSubmit={handleCreateOrderSubmit} className="space-y-6">
                  {/* Product Summary Strip */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0B101B] border border-slate-800">
                    <img
                      src={selectedProduct.frontImage || selectedProduct.imageUrl || '/courts/btl.png'}
                      alt={selectedProduct.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                        {getShopCategoryLabel(selectedProduct.category)} · Code{' '}
                        {getShopCategoryCode(selectedProduct.category)}
                      </span>
                      <h4 className="font-bold text-sm text-white truncate">{selectedProduct.name}</h4>
                      <p className="text-xs text-emerald-400 font-black mt-0.5 whitespace-nowrap">
                        {Number(selectedProduct.price).toLocaleString('vi-VN')} đ × {quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Total</span>
                      <span className="font-heading font-black text-lg text-emerald-400 whitespace-nowrap">
                        {totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 1. SIZE & QUANTITY */}
                  <div className="space-y-3">
                    {productRequiresSizeSelection(selectedProduct) ? (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                            1. Select {isJersey ? 'Jersey Size' : 'Size / Variant'} & Quantity
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsSizeGuideOpen(true)}
                            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Ruler className="w-3.5 h-3.5" />
                            <span>Size Guide</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0
                            ? selectedProduct.sizes
                            : isJersey
                            ? ['S', 'M', 'L', 'XL', '2XL']
                            : ['M', 'L']
                          ).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setSelectedSize(sz)}
                              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                                selectedSize === sz
                                  ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-900/30'
                                  : 'bg-[#0B101B] border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}

                          {/* Quantity Selector */}
                          <div className="ml-auto flex items-center gap-2 bg-[#0B101B] border border-slate-700 rounded-xl px-2.5 py-1">
                            <span className="text-[11px] text-slate-400 font-bold">Qty:</span>
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-white">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Notice for orders with quantity > 1 */}
                        {quantity > 1 && (
                          <p className="text-[11px] text-blue-300 bg-blue-950/40 border border-blue-800/60 p-2.5 rounded-xl">
                            Note: Quantity is <strong>{quantity}</strong>. All items will share size <strong>{selectedSize}</strong> and player print name. To purchase different sizes or names, please place separate orders.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0B101B] border border-slate-800">
                        <div>
                          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-200 block">
                            1. Select Order Quantity
                          </label>
                          <span className="text-[11px] text-slate-400">
                            {isBallProduct(selectedProduct) ? 'Official Size 5 Tournament Game Ball' : 'Standard Equipment Size'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-[#121A2A] border border-slate-700 rounded-xl px-3 py-1.5">
                          <span className="text-xs text-slate-400 font-bold">Qty:</span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-black text-white">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. DYNAMIC JERSEY CUSTOMIZATION: ONLY "PLAYER NAME" */}
                  {isJersey && (
                    <div className="p-4 rounded-2xl bg-[#0B101B] border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shirt className="w-4 h-4 text-orange-400" />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                            2. Fit Check & Custom Jersey Printing
                          </span>
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableCustomPrint}
                            onChange={(e) => setEnableCustomPrint(e.target.checked)}
                            className="rounded border-slate-600 text-red-600 focus:ring-red-500"
                          />
                          <span>Add Player Name Print</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Athlete Height (cm) — Optional Fit Check
                          </label>
                          <input
                            type="number"
                            min={120}
                            max={230}
                            placeholder="e.g. 178"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#121A2A] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Athlete Weight (kg) — Optional Fit Check
                          </label>
                          <input
                            type="number"
                            min={30}
                            max={160}
                            placeholder="e.g. 72"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#121A2A] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      {enableCustomPrint && (
                        <div>
                          <label className="block text-[11px] font-bold text-orange-300 mb-1">
                            PLAYER NAME (Competition Jersey Back Name)
                          </label>
                          <input
                            type="text"
                            maxLength={24}
                            placeholder="e.g. HOANG DUY, NATHAN, VAN A..."
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                            className="w-full px-3.5 py-2.5 bg-[#121A2A] border border-orange-500/40 rounded-xl text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-orange-400"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Competition back-name only. Jersey number input has been removed per official club guidelines.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. CUSTOMER CONTACT DETAILS */}
                  <div className="space-y-3">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-200 block">
                      {isJersey ? '3.' : '2.'} Athlete / Customer Contact Details
                    </label>

                    {/* IMPORTANT CONTACT NOTICE */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed flex items-start gap-2.5">
                      <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠️</span>
                      <div>
                        <strong className="block text-amber-300 font-bold mb-0.5">
                          IMPORTANT CONTACT NOTICE:
                        </strong>
                        <span>
                          Please ensure your <strong>Phone Number (Zalo)</strong> and <strong>Email Address</strong> are 100% accurate. DVA Club will dispatch order receipts, verify bank transfers, and send courier tracking codes to these contacts.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Nguyen Van A"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B101B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Phone / Zalo Number *
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            placeholder="0912345678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B101B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Email Address (for Invoice & Status Updates) *
                        </label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            placeholder="athlete@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B101B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Instagram / Facebook Profile (Optional)
                        </label>
                        <div className="relative">
                          <Instagram className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="@your.ig (or enter 'None' if not applicable)"
                            value={socialLink}
                            onChange={(e) => setSocialLink(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B101B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. RECEIVING / DELIVERY METHOD */}
                  <div className="space-y-3">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-200 block">
                      {isJersey ? '4.' : '3.'} Receiving / Delivery Method
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('COURT_PICKUP')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                          deliveryMethod === 'COURT_PICKUP'
                            ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500'
                            : 'bg-[#0B101B] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <MapPin
                          className={`w-5 h-5 shrink-0 mt-0.5 ${
                            deliveryMethod === 'COURT_PICKUP' ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        />
                        <div>
                          <span className="block text-xs font-extrabold text-white">
                            Free Pickup @ DVA Court (BTL Thong Tin Arena)
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            Collect directly during club hours (0 đ pickup fee).
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('HOME_DELIVERY')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                          deliveryMethod === 'HOME_DELIVERY'
                            ? 'bg-orange-950/40 border-orange-500 text-white shadow-lg ring-1 ring-orange-500'
                            : 'bg-[#0B101B] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Truck
                          className={`w-5 h-5 shrink-0 mt-0.5 ${
                            deliveryMethod === 'HOME_DELIVERY' ? 'text-orange-400' : 'text-slate-500'
                          }`}
                        />
                        <div>
                          <span className="block text-xs font-extrabold text-white">
                            Home Delivery (Courier COD)
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            Delivered to your address. COD fee paid upon receipt.
                          </span>
                        </div>
                      </button>
                    </div>

                    {deliveryMethod === 'COURT_PICKUP' ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/60 text-[11px] text-emerald-300 flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-white font-bold">Fixed Pickup Location:</strong>
                          <span>{DEFAULT_COURT_PICKUP_ADDRESS}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-800/60 space-y-3.5 animate-in fade-in">
                        <div className="flex items-start gap-2 text-[11px] text-orange-300 font-semibold">
                          <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <span>
                            Courier shipping fee (COD) is paid directly by recipient to delivery driver upon arrival.
                          </span>
                        </div>

                        {/* Cascading Address Selectors: 1. Province/City -> 2. District -> 3. Ward */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-white mb-1">
                              1. Province / City *
                            </label>
                            <select
                              value={selectedProvince}
                              onChange={(e) => handleProvinceChange(e.target.value)}
                              className="w-full px-3 py-2 bg-[#0B101B] border border-orange-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-orange-400"
                            >
                              {VIETNAM_PROVINCES.map((prov) => (
                                <option key={prov.name} value={prov.name} className="bg-[#0B101B] text-white">
                                  {prov.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-white mb-1">
                              2. District / County *
                            </label>
                            <select
                              value={selectedDistrict}
                              onChange={(e) => handleDistrictChange(e.target.value)}
                              className="w-full px-3 py-2 bg-[#0B101B] border border-orange-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-orange-400"
                            >
                              {availableDistricts.map((dist) => (
                                <option key={dist.name} value={dist.name} className="bg-[#0B101B] text-white">
                                  {dist.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-white mb-1">
                              3. Ward / Commune *
                            </label>
                            <select
                              value={selectedWard}
                              onChange={(e) => setSelectedWard(e.target.value)}
                              className="w-full px-3 py-2 bg-[#0B101B] border border-orange-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-orange-400"
                            >
                              {availableWards.map((w) => (
                                <option key={w} value={w} className="bg-[#0B101B] text-white">
                                  {w}
                                </option>
                              ))}
                              <option value="Other (Specify in street address)" className="bg-[#0B101B] text-slate-400">
                                Other (Specify in street address)
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* 4. Specific street / house number */}
                        <div>
                          <label className="block text-[11px] font-bold text-white mb-1">
                            4. Specific Street Address, House / Apt Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. No. 15, Alley 29, 155 Truong Chinh Street..."
                            value={specificAddress}
                            onChange={(e) => setSpecificAddress(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#0B101B] border border-orange-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-orange-400 placeholder-slate-500"
                          />
                        </div>

                        {/* Complete address preview */}
                        {shippingAddress && (
                          <div className="p-2.5 rounded-xl bg-black/40 border border-orange-500/20 text-[11px] text-slate-300">
                            <span className="text-slate-400">Shipping Label Destination: </span>
                            <strong className="text-orange-300 font-medium">{shippingAddress}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Order Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Special instructions or pickup requests..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#0B101B] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-orange-500 text-white font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating VietQR Payment...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to VietQR Payment</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* PAYMENT STEP */}
              {checkoutStep === 'PAYMENT' && paymentInfo && createdOrder && (
                <div className="space-y-6 text-center animate-in fade-in">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs font-black uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Order #{createdOrder.orderCode} Created</span>
                  </div>

                  <div className="bg-[#0B101B] border border-slate-800 rounded-3xl p-6 max-w-md mx-auto space-y-4">
                    <div className="flex justify-center">
                      <div className="p-3 bg-white rounded-2xl shadow-2xl">
                        <img
                          src={paymentInfo.qrUrl}
                          alt="VietQR MB Bank"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-left text-xs bg-[#121A2A] p-4 rounded-2xl border border-slate-700">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Beneficiary Bank:</span>
                        <span className="font-bold text-white">{paymentInfo.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Account Number:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400">{paymentInfo.accountNo}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(paymentInfo.accountNo, 'ACC')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            {copiedField === 'ACC' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Account Holder:</span>
                        <span className="font-bold text-white">{paymentInfo.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800">
                        <span className="text-slate-400">Total Amount (VND):</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-400 text-sm whitespace-nowrap">
                            {paymentInfo.amount.toLocaleString('vi-VN')} đ
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(String(paymentInfo.amount), 'AMT')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            {copiedField === 'AMT' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">Transfer Memo:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400">
                            {paymentInfo.transferContent}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(paymentInfo.transferContent, 'MEMO')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            {copiedField === 'MEMO' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Action Button */}
                  <div className="max-w-md mx-auto space-y-2">
                    <button
                      type="button"
                      disabled={confirmingTransfer}
                      onClick={handleConfirmTransferred}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                    >
                      {confirmingTransfer ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Notifying Club Staff...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>I Have Transferred / Confirm Order</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Clicking this records your transfer timestamp and dispatches confirmation email & Google Sheets sync.
                    </p>
                  </div>
                </div>
              )}

              {/* CONFIRMED STEP */}
              {checkoutStep === 'CONFIRMED' && createdOrder && (
                <div className="text-center py-8 space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading font-black text-2xl text-white">Order Confirmed!</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Thank you, <strong>{createdOrder.customerName}</strong>! Your order{' '}
                    <span className="font-mono text-amber-400 font-bold">{createdOrder.orderCode}</span> has been received. Our team will verify the payment and email you tracking or court pickup notices.
                  </p>
                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCloseBuyNow}
                      className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Continue Browsing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
