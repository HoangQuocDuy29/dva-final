/**
 * Định dạng ngày đăng sang chuẩn tiếng Anh (Anh - Mỹ): "February 28, 2025".
 * Xử lý an toàn chuỗi YYYY-MM-DD theo local date để tránh lệch ngày do múi giờ UTC.
 */
export const formatEnglishDate = (dateString?: string | Date): string => {
  if (!dateString) return '';
  let date: Date;
  if (typeof dateString === 'string') {
    const trimmed = dateString.trim();
    const ymdMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (ymdMatch) {
      date = new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = dateString;
  }
  if (Number.isNaN(date.getTime())) {
    return typeof dateString === 'string' ? dateString : '';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatPublishDate = formatEnglishDate;
