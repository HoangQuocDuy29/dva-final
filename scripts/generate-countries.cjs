const fs = require('fs');
const path = require('path');

const isoCodes = [
  'AF','AX','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ',
  'BS','BH','BD','BB','BY','BE','BZ','BJ','BM','BT','BO','BQ','BA','BW','BV','BR',
  'IO','BN','BG','BF','BI','CV','KH','CM','CA','KY','CF','TD','CL','CN','CX','CC',
  'CO','KM','CG','CD','CK','CR','CI','HR','CU','CW','CY','CZ','DK','DJ','DM','DO',
  'EC','EG','SV','GQ','ER','EE','SZ','ET','FK','FO','FJ','FI','FR','GF','PF','TF',
  'GA','GM','GE','DE','GH','GI','GR','GL','GD','GP','GU','GT','GG','GN','GW','GY',
  'HT','HM','VA','HN','HK','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','JM',
  'JP','JE','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY',
  'LI','LT','LU','MO','MG','MW','MY','MV','ML','MT','MH','MQ','MR','MU','YT','MX',
  'FM','MD','MC','MN','ME','MS','MA','MZ','MM','NA','NR','NP','NL','NC','NZ','NI',
  'NE','NG','NU','NF','MK','MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH',
  'PN','PL','PT','PR','QA','RE','RO','RU','RW','BL','SH','KN','LC','MF','PM','VC',
  'WS','SM','ST','SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS',
  'SS','ES','LK','SD','SR','SJ','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TK',
  'TO','TT','TN','TR','TM','TC','TV','UG','UA','AE','GB','US','UM','UY','UZ','VU',
  'VE','VN','VG','VI','WF','EH','YE','ZM','ZW'
];

const en = new Intl.DisplayNames(['en'], { type: 'region' });
const vi = new Intl.DisplayNames(['vi'], { type: 'region' });

function flag(code) {
  return String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0)));
}

// Bổ sung các tên tiếng Việt thông dụng
const commonViOverrides = {
  VN: 'Việt Nam',
  US: 'Hoa Kỳ (Mỹ)',
  GB: 'Vương quốc Anh',
  FR: 'Pháp',
  DE: 'Đức',
  JP: 'Nhật Bản',
  KR: 'Hàn Quốc',
  KP: 'Triều Tiên',
  CN: 'Trung Quốc',
  RU: 'Nga',
  TH: 'Thái Lan',
  LA: 'Lào',
  KH: 'Campuchia',
  ID: 'Indonesia',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  AU: 'Úc (Australia)',
  CA: 'Canada',
  IT: 'Ý (Italia)',
  ES: 'Tây Ban Nha',
  PT: 'Bồ Đào Nha',
  BR: 'Brazil',
  AR: 'Argentina',
  CU: 'Cuba',
  NL: 'Hà Lan',
  PL: 'Ba Lan',
  TR: 'Thổ Nhĩ Kỳ',
  IN: 'Ấn Độ',
  CH: 'Thụy Sĩ',
  SE: 'Thụy Điển',
  NO: 'Na Uy',
  FI: 'Phần Lan',
  DK: 'Đan Mạch',
  BE: 'Bỉ',
  AT: 'Áo',
  CZ: 'Séc (Cộng hòa Séc)',
  RS: 'Serbia',
  UA: 'Ukraine',
  EG: 'Ai Cập',
  ZA: 'Nam Phi',
  NZ: 'New Zealand',
  TW: 'Đài Loan'
};

const list = isoCodes.map(code => {
  let name = en.of(code) || code;
  let nameVi = commonViOverrides[code] || vi.of(code) || name;
  return {
    code,
    name,
    nameVi,
    flag: flag(code)
  };
});

// Sắp xếp: VN lên đầu, các nước còn lại A-Z theo tiếng Anh
const vn = list.find(c => c.code === 'VN');
const others = list.filter(c => c.code !== 'VN').sort((a, b) => a.name.localeCompare(b.name, 'en'));
const sorted = [vn, ...others];

const outPath = path.resolve(__dirname, '../src/data/countries.ts');

const fileContent = `export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  nameVi?: string;
}

/**
 * Danh sách 249 quốc gia & vùng lãnh thổ chuẩn ISO 3166-1 alpha-2.
 * Ưu tiên đặt Việt Nam (VN) lên đầu, tiếp theo là A-Z theo tên tiếng Anh.
 */
export const ALL_COUNTRIES: CountryOption[] = ${JSON.stringify(sorted, null, 2)};

/**
 * Alias tương thích ngược với danh sách PLAYER_COUNTRIES cũ
 */
export const PLAYER_COUNTRIES: CountryOption[] = ALL_COUNTRIES;

/**
 * Lấy thông tin quốc gia theo mã ISO 2 ký tự (không phân biệt hoa/thường)
 */
export function getCountryByCode(code?: string): CountryOption {
  if (!code || typeof code !== 'string') {
    return ALL_COUNTRIES[0]; // Mặc định Việt Nam (VN)
  }
  const clean = code.trim().toUpperCase();
  const found = ALL_COUNTRIES.find((c) => c.code === clean);
  if (found) return found;

  // Fallback nếu code chưa có trong danh sách chuẩn (tự tạo cờ theo chuẩn Regional Indicator)
  const flagEmoji = /^[A-Z]{2}$/.test(clean)
    ? String.fromCodePoint(...clean.split('').map((char) => 127397 + char.charCodeAt(0)))
    : '🇻🇳';
  return {
    code: clean,
    name: clean,
    flag: flagEmoji,
  };
}

/**
 * Loại bỏ dấu tiếng Việt để phục vụ tìm kiếm
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Tìm kiếm danh sách quốc gia theo từ khóa (tên EN, tên VI, mã ISO)
 */
export function searchCountries(query: string, source: CountryOption[] = ALL_COUNTRIES): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return source;

  const qNormalized = removeVietnameseTones(q);

  return source.filter((c) => {
    const codeMatch = c.code.toLowerCase().includes(q);
    const nameMatch = c.name.toLowerCase().includes(q);
    const nameViMatch = c.nameVi ? c.nameVi.toLowerCase().includes(q) : false;
    const nameNormMatch = removeVietnameseTones(c.name).includes(qNormalized);
    const nameViNormMatch = c.nameVi ? removeVietnameseTones(c.nameVi).includes(qNormalized) : false;

    return codeMatch || nameMatch || nameViMatch || nameNormMatch || nameViNormMatch;
  });
}

/**
 * Format nhãn hiển thị: [Icon cờ] [Tên quốc gia] ([Mã ISO])
 * Ví dụ: 🇻🇳 Vietnam (VN), 🇺🇸 United States (US)
 */
export function formatCountryLabel(country: CountryOption): string {
  return \`\${country.flag} \${country.name} (\${country.code})\`;
}
`;

fs.writeFileSync(outPath, fileContent, 'utf8');
console.log('Successfully wrote', sorted.length, 'countries to', outPath);
