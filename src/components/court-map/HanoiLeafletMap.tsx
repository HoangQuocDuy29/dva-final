import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { VolleyballVenue } from '../../types';

const HANOI_CENTER: [number, number] = [21.0285, 105.8542];
const DEFAULT_ZOOM = 12;
const VIETNAM_BOUNDS: L.LatLngBoundsExpression = [[7.5, 101.5], [24.0, 118.0]];

export interface MapVenueItem { venue: VolleyballVenue; isLive: boolean; isClosed: boolean; hasActivity: boolean; matchingSessionsCount: number }
export interface UserGeoPoint { lat: number; lng: number }
export interface MapViewportTarget { lat: number; lng: number; zoom: number; tick: number }

interface HanoiLeafletMapProps {
  items: MapVenueItem[]; selectedVenueId: string | null; onSelectVenue: (venueId: string) => void;
  focusTrigger: number; isVisible?: boolean; userLocation?: UserGeoPoint | null; userFocusTrigger?: number;
  viewportTarget?: MapViewportTarget | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

function createVenueIcon(item: MapVenueItem, isSelected: boolean): L.DivIcon {
  const { venue, isLive, isClosed, hasActivity, matchingSessionsCount } = item;
  const isDimmed = !isClosed && !hasActivity;
  const isDva = venue.isDvaOfficial;
  const isFree = venue.venueType === 'FREE_PUBLIC';
  const size = isSelected ? 44 : isDva && !isDimmed && !isClosed ? 40 : 34;

  const pinBg = isClosed
    ? 'background:#334155;border:2px solid #f87171;box-shadow:0 4px 12px rgba(0,0,0,.6);'
    : isDva
      ? 'background:linear-gradient(135deg,#dc2626,#f97316);border:2.5px solid #fed7aa;box-shadow:0 6px 20px rgba(234,88,12,.55);'
      : isFree
        ? 'background:linear-gradient(135deg,#059669,#10b981);border:2px solid #a7f3d0;box-shadow:0 6px 18px rgba(16,185,129,.45);'
        : 'background:#1e293b;border:2px solid #94a3b8;box-shadow:0 5px 14px rgba(0,0,0,.65);';

  const dimStyle = isDimmed ? 'opacity:0.45;filter:grayscale(100%);' : 'opacity:1;';
  const liveRing = isLive && !isClosed && !isDimmed ? '<span class="dva-live-ripple" style="position:absolute;left:50%;top:50%;width:42px;height:42px;border-radius:9999px;background:rgba(16,185,129,.45);border:2px solid #34d399;pointer-events:none;"></span>' : '';
  const selectedRing = isSelected ? '<span style="position:absolute;left:50%;top:50%;width:56px;height:56px;transform:translate(-50%,-50%);border-radius:9999px;border:2px solid #f97316;background:rgba(249,115,22,.16);pointer-events:none;"></span>' : '';
  const inner = isClosed ? '<span style="font-weight:900;font-size:8px;color:#fecaca;">NGHỈ</span>' : isDva ? '<span style="font-weight:900;font-size:10px;color:#fff;">DVA</span>' : isFree ? '<span style="font-weight:900;font-size:8px;color:#fff;">FREE</span>' : `<span style="font-weight:800;font-size:11px;color:#f8fafc;">${matchingSessionsCount}</span>`;
  const tag = isClosed ? '<span style="background:#991b1b;color:#fecaca;padding:1px 5px;border-radius:9999px;font-size:8px;margin-right:4px;">TẠM NGHỈ</span>' : '';
  const nameShort = esc(venue.name.length > 24 ? `${venue.name.slice(0, 22)}…` : venue.name);

  return L.divIcon({
    className: 'dva-venue-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;${dimStyle}">${liveRing}${selectedRing}<div style="position:relative;z-index:2;width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;${pinBg}">${inner}</div><div style="position:absolute;top:${size + 4}px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 8px;border-radius:9999px;background:rgba(11,15,25,.92);border:1px solid ${isClosed ? 'rgba(248,113,113,.6)' : isSelected ? 'rgba(249,115,22,.8)' : 'rgba(51,65,85,.75)'};color:${isSelected ? '#fdba74' : '#e2e8f0'};font-size:10px;font-weight:700;pointer-events:none;">${tag}${nameShort}</div></div>`,
  });
}

function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'dva-venue-marker-wrapper',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;"><span class="dva-live-ripple" style="position:absolute;left:50%;top:50%;width:28px;height:28px;border-radius:9999px;background:rgba(59,130,246,.45);border:2px solid #60a5fa;"></span><span style="position:relative;z-index:2;width:14px;height:14px;border-radius:9999px;background:#3b82f6;border:2.5px solid #ffffff;box-shadow:0 0 12px #3b82f6;"></span><span style="position:absolute;top:22px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:1px 7px;border-radius:9999px;background:rgba(30,58,138,.95);border:1px solid #60a5fa;color:#dbeafe;font-size:9px;font-weight:800;">Vị trí của bạn</span></div>`,
  });
}

export const HanoiLeafletMap: React.FC<HanoiLeafletMapProps> = ({
  items, selectedVenueId, onSelectVenue, focusTrigger, isVisible = true, userLocation, userFocusTrigger = 0, viewportTarget,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const venueLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelectVenue);
  onSelectRef.current = onSelectVenue;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: HANOI_CENTER, zoom: DEFAULT_ZOOM, zoomControl: false,
      minZoom: 5, maxZoom: 18, maxBounds: VIETNAM_BOUNDS, maxBoundsViscosity: 0.8,
    });
    const cartoKey = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();

    if (cartoKey) {
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`, { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', maxNativeZoom: 16, maxZoom: 18 }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 16, maxZoom: 18, pane: 'overlayPane' }).addTo(map);
    }
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;
    venueLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => {
      if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) map.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isVisible) return;
    const raf = requestAnimationFrame(() => {
      if (containerRef.current && containerRef.current.clientWidth > 0) mapRef.current?.invalidateSize({ animate: false });
    });
    return () => cancelAnimationFrame(raf);
  }, [isVisible]);

  useEffect(() => {
    const layer = venueLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const item of items) {
      const { latitude, longitude } = item.venue;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      const isSel = item.venue.id === selectedVenueId;
      const zIndex = isSel ? 1000 : item.isClosed ? 50 : item.hasActivity ? (item.venue.isDvaOfficial ? 500 : item.isLive ? 400 : 300) : 10;
      L.marker([latitude, longitude], { icon: createVenueIcon(item, isSel), zIndexOffset: zIndex })
        .on('click', () => onSelectRef.current(item.venue.id))
        .addTo(layer);
    }
  }, [items, selectedVenueId]);

  useEffect(() => {
    const layer = userLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (userLocation) L.marker([userLocation.lat, userLocation.lng], { icon: createUserLocationIcon(), zIndexOffset: 900 }).addTo(layer);
  }, [userLocation]);

  const safeFly = (lat: number, lng: number, zoom = 14, exactZoom = false) => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      const s = map.getSize();
      const targetZ = exactZoom ? zoom : Math.max(map.getZoom() || DEFAULT_ZOOM, zoom);
      if (!s || s.x <= 0 || s.y <= 0 || !isVisible) map.setView([lat, lng], targetZ, { animate: false });
      else map.flyTo([lat, lng], targetZ, { duration: 0.7 });
    } catch { /* ignore hidden-map projection error */ }
  };

  useEffect(() => { const hit = items.find((i) => i.venue.id === selectedVenueId); if (hit) safeFly(hit.venue.latitude, hit.venue.longitude, 14); }, [selectedVenueId, focusTrigger]);
  useEffect(() => { if (userLocation && userFocusTrigger > 0) safeFly(userLocation.lat, userLocation.lng, 13); }, [userLocation, userFocusTrigger]);
  useEffect(() => { if (viewportTarget) safeFly(viewportTarget.lat, viewportTarget.lng, viewportTarget.zoom, true); }, [viewportTarget]);

  return <div ref={containerRef} className="dva-dark-map w-full h-full min-h-[430px] relative z-0" aria-label="Bản đồ sân bóng chuyền Hà Nội" />;
};
