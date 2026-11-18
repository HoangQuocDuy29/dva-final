import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, env } from '../../config/env';
import { prisma, toCourtDto, toNewsDto, toPlayerDto } from '../../config/prisma';
import { getOrSetCache, invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';

const NEWS_JSON_PATH = path.join(DATA_DIR, 'news.json');
const DEFAULT_NEWS_IMAGE_URL =
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';

function readNewsJsonFile(): any[] {
  try {
    if (fs.existsSync(NEWS_JSON_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[News JSON] Could not read data/news.json:', err);
  }
  return [];
}

function writeNewsJsonFile(items: any[]): void {
  try {
    fs.mkdirSync(path.dirname(NEWS_JSON_PATH), { recursive: true });
    fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[News JSON] Could not write data/news.json:', err);
  }
}

export async function getHomeSummary() {
  return getOrSetCache('home:summary', 60_000, async () => {
    const [courts, players, news] = await Promise.all([
      prisma.court.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }),
      prisma.player.findMany({
        where: { isActive: true },
        orderBy: [{ level: 'asc' }, { isCaptain: 'desc' }, { jerseyNumber: 'asc' }],
      }),
      prisma.newsPost.findMany({
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
    ]);

    return {
      courts: courts.map(toCourtDto),
      players: players.map(toPlayerDto),
      news: news.map(toNewsDto),
    };
  });
}

export async function listNews(opts: { category?: string; search?: string; staff: boolean }) {
  const { category, search, staff } = opts;
  const hasCategoryFilter = typeof category === 'string' && category.trim() !== '' && category.trim().toUpperCase() !== 'ALL';
  const hasSearchFilter = typeof search === 'string' && search.trim() !== '';

  const loader = async () => {
    const where: Record<string, any> = {};
    if (hasCategoryFilter) {
      where.category = { equals: category!.trim(), mode: 'insensitive' };
    }
    if (hasSearchFilter) {
      const q = search!.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const dbNews = await prisma.newsPost.findMany({
        where,
        orderBy:
          !hasCategoryFilter && !hasSearchFilter
            ? [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }]
            : [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      });
      return dbNews.map(toNewsDto);
    } catch {
      const fileNews = readNewsJsonFile().map((n) => toNewsDto(n));
      const filtered = fileNews.filter((item) => {
        if (hasCategoryFilter && String(item.category).toUpperCase() !== category!.trim().toUpperCase()) return false;
        if (hasSearchFilter) {
          const q = search!.trim().toLowerCase();
          if (!item.title.toLowerCase().includes(q) && !item.excerpt.toLowerCase().includes(q)) return false;
        }
        return true;
      });
      filtered.sort((a, b) => {
        if (!hasCategoryFilter && !hasSearchFilter) {
          const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
          if (pinDiff !== 0) return pinDiff;
        }
        return String(b.publishedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.createdAt || ''));
      });
      return filtered;
    }
  };

  if (!staff) {
    const cacheKey = `news:public:list:${hasCategoryFilter ? category!.trim().toUpperCase() : 'ALL'}:${hasSearchFilter ? search!.trim().toLowerCase() : ''}`;
    return getOrSetCache(cacheKey, 90_000, loader);
  }
  return loader();
}

export async function getNewsByIdOrSlug(id: string, staff: boolean) {
  const loader = async () => {
    try {
      const post = await prisma.newsPost.findFirst({ where: { OR: [{ id }, { slug: id }] } });
      if (!post) throw new HttpError(404, 'News post not found');
      return toNewsDto(post);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const fileNews = readNewsJsonFile();
      const post = fileNews.find((n) => n.id === id || n.slug === id);
      if (!post) throw new HttpError(404, 'News post not found');
      return toNewsDto(post);
    }
  };

  if (!staff) {
    return getOrSetCache(`news:public:detail:${id}`, 90_000, loader);
  }
  return loader();
}

export async function createNewsPost(
  data: Record<string, any>,
  author?: { id?: string; fullName?: string }
) {
  const slugBase = (data.slug || data.title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const resolvedImageUrl =
    (data.imageUrl && data.imageUrl.trim()) ||
    (data.image && data.image.trim()) ||
    (data.thumbnail && data.thumbnail.trim()) ||
    DEFAULT_NEWS_IMAGE_URL;

  const resolvedPublishedAt = data.publishedAt || data.createdAt || new Date().toISOString().split('T')[0];
  const parsedCreatedAt = new Date(`${resolvedPublishedAt}T00:00:00.000Z`);

  const newRecord = {
    id: `news-${crypto.randomUUID()}`,
    title: data.title,
    slug: `${slugBase || 'post'}-${Date.now().toString(36)}`,
    excerpt: data.excerpt || '',
    content: data.content,
    thumbnail: resolvedImageUrl,
    category: data.category || 'CLUB_EVENT',
    authorId: author?.id ?? null,
    authorName: data.authorName || author?.fullName || 'DVA',
    authorRole: data.authorRole || 'Club Administration',
    publishedAt: resolvedPublishedAt,
    ...(!Number.isNaN(parsedCreatedAt.getTime()) ? { createdAt: parsedCreatedAt } : {}),
    readTimeMinutes: data.readTimeMinutes || 4,
    featured: Boolean(data.featured),
    isPinned: Boolean(data.isPinned),
  };

  try {
    const created = await prisma.newsPost.create({ data: newRecord });
    const dto = toNewsDto(created);
    const currentFile = readNewsJsonFile();
    writeNewsJsonFile([dto, ...currentFile.filter((n) => n.id !== dto.id)]);
    invalidateCache(['news', 'home']);
    return dto;
  } catch {
    const dto = toNewsDto(newRecord as any);
    const currentFile = readNewsJsonFile();
    writeNewsJsonFile([dto, ...currentFile.filter((n) => n.id !== dto.id)]);
    invalidateCache(['news', 'home']);
    return dto;
  }
}

export async function updateNewsPost(id: string, data: Record<string, any>) {
  const { imageUrl, image, thumbnail, publishedAt, createdAt, ...restData } = data;
  const incomingImageUrl =
    (imageUrl && imageUrl.trim()) || (image && image.trim()) || (thumbnail && thumbnail.trim()) || '';
  const incomingDate = publishedAt || createdAt;
  const parsedCreatedAt = incomingDate ? new Date(`${incomingDate}T00:00:00.000Z`) : undefined;

  try {
    const existing = await prisma.newsPost.findFirst({ where: { OR: [{ id }, { slug: id }] } });
    if (!existing) throw new HttpError(404, 'News post not found');
    const resolvedImageUrl = incomingImageUrl || existing.thumbnail || DEFAULT_NEWS_IMAGE_URL;
    const updated = await prisma.newsPost.update({
      where: { id: existing.id },
      data: {
        ...restData,
        thumbnail: resolvedImageUrl,
        ...(incomingDate ? { publishedAt: incomingDate } : {}),
        ...(parsedCreatedAt && !Number.isNaN(parsedCreatedAt.getTime()) ? { createdAt: parsedCreatedAt } : {}),
      },
    });
    const dto = toNewsDto(updated);
    const currentFile = readNewsJsonFile();
    if (currentFile.length > 0) {
      writeNewsJsonFile(currentFile.map((n) => (n.id === existing.id || n.slug === id ? dto : n)));
    }
    invalidateCache(['news', 'home']);
    return dto;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const currentFile = readNewsJsonFile();
    const idx = currentFile.findIndex((n) => n.id === id || n.slug === id);
    if (idx === -1) throw new HttpError(404, 'News post not found');
    const existing = currentFile[idx];
    const resolvedImageUrl =
      incomingImageUrl || existing.imageUrl || existing.image || existing.thumbnail || DEFAULT_NEWS_IMAGE_URL;
    const merged = {
      ...existing,
      ...restData,
      ...(incomingDate ? { publishedAt: incomingDate } : {}),
      ...(parsedCreatedAt && !Number.isNaN(parsedCreatedAt.getTime())
        ? { createdAt: parsedCreatedAt.toISOString() }
        : {}),
      imageUrl: resolvedImageUrl,
      image: resolvedImageUrl,
      thumbnail: resolvedImageUrl,
    };
    const dto = toNewsDto(merged);
    currentFile[idx] = dto;
    writeNewsJsonFile(currentFile);
    invalidateCache(['news', 'home']);
    return dto;
  }
}

export async function deleteNewsPost(id: string) {
  try {
    const existing = await prisma.newsPost.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new HttpError(404, 'News post not found');
    await prisma.newsPost.delete({ where: { id } });
    const currentFile = readNewsJsonFile();
    if (currentFile.length > 0) {
      writeNewsJsonFile(currentFile.filter((n) => n.id !== id));
    }
    invalidateCache(['news', 'home']);
    return { success: true, message: 'News post deleted' };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const currentFile = readNewsJsonFile();
    const exists = currentFile.some((n) => n.id === id);
    if (!exists) throw new HttpError(404, 'News post not found');
    writeNewsJsonFile(currentFile.filter((n) => n.id !== id));
    invalidateCache(['news', 'home']);
    return { success: true, message: 'News post deleted' };
  }
}

export function generateCloudinaryUploadSignature(folder?: string) {
  const cfg = env.cloudinary;
  if (!cfg) {
    throw new HttpError(501, 'Cloudinary signing is not configured on the server.');
  }
  const safeFolder = (folder || 'dva_assets').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${safeFolder}&timestamp=${timestamp}${cfg.apiSecret}`)
    .digest('hex');

  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    folder: safeFolder,
    signature,
    timestamp,
  };
}
