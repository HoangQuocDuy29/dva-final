export const GOOGLE_APPS_SCRIPT_TEMPLATE = `var STANDARD_HEADERS = {
  DatSan: [
    'Thời Gian Nhận',
    'Mã đặt sân',
    'Tên sân',
    'Ngày đặt',
    'Khung giờ',
    'Tổng số giờ',
    'Họ tên khách',
    'Số điện thoại',
    'Email',
    'Tổng tiền (VNĐ)',
    'Trạng thái',
    'Ghi chú'
  ],
  Training_Registrations: [
    'Thời Gian Nhận',
    'Timestamp',
    'Manual_Trigger',
    'Status'
  ],
  DangKyKhoaHoc: [
    'Thời Gian Nhận',
    'Mã đăng ký',
    'Gói tập / Khóa học',
    'Cấp độ / Đội',
    'Họ và tên học viên',
    'Số điện thoại',
    'Email',
    'Vị trí thi đấu / Mục tiêu tập',
    'Khung giờ mong muốn',
    'Mức học phí (VNĐ)',
    'Nội dung chuyển khoản',
    'Trạng thái',
    'Ghi chú',
    'Thời gian đăng ký'
  ],
  TuyenThanhVien: [
    'Thời Gian Nhận',
    'Họ và tên',
    'Ngày sinh',
    'Vị trí',
    'Cấp độ',
    'Số áo mong muốn',
    'Chiều cao (cm)',
    'Cân nặng (kg)',
    'Bật đập (cm)',
    'Bật chắn (cm)',
    'Số Zalo',
    'Email',
    'Instagram',
    'Chiến thuật 5-1',
    'Quê quán',
    'Thời gian gửi'
  ]
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var sheetName = String(payload.sheetName || 'DatSan').trim();
    var data = payload.data || payload;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (ex) { data = {}; }
    }

    var timestamp = payload.timestamp || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // 1. Tạo mới tab hoặc khởi tạo dòng tiêu đề chuẩn nếu sheet đang trống
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = [];

    if (lastRow === 0 || lastCol === 0) {
      headers = STANDARD_HEADERS[sheetName] ? STANDARD_HEADERS[sheetName].slice() : ['Thời Gian Nhận'].concat(Object.keys(data));
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#B91C1C')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return String(h || '').trim();
      });
    }

    // 2. Chuẩn hóa key trong data (trim khoảng trắng) để khớp chính xác với tiêu đề cột
    var normalizedData = {};
    var rawKeys = Object.keys(data || {});
    for (var i = 0; i < rawKeys.length; i++) {
      var k = String(rawKeys[i]).trim();
      normalizedData[k] = data[rawKeys[i]];
    }

    // 3. Đảm bảo toàn bộ các cột chuẩn của bảng (STANDARD_HEADERS) hoặc trường mới trong data đều có mặt trên dòng 1
    var requiredCols = STANDARD_HEADERS[sheetName] || [];
    for (var c = 0; c < requiredCols.length; c++) {
      var stdCol = requiredCols[c];
      if (headers.indexOf(stdCol) === -1) {
        sheet.getRange(1, headers.length + 1)
          .setValue(stdCol)
          .setBackground('#B91C1C')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
        headers.push(stdCol);
      }
    }

    for (var j = 0; j < rawKeys.length; j++) {
      var cleanKey = String(rawKeys[j]).trim();
      if (cleanKey && headers.indexOf(cleanKey) === -1) {
        sheet.getRange(1, headers.length + 1)
          .setValue(cleanKey)
          .setBackground('#B91C1C')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
        headers.push(cleanKey);
      }
    }

    // 4. Dựng dữ liệu dòng theo đúng thứ tự từng cột trên Sheet
    var rowValues = [];
    for (var h = 0; h < headers.length; h++) {
      var colName = headers[h];
      if (colName === 'Thời Gian Nhận' || colName === 'Received_Timestamp') {
        rowValues.push(timestamp);
      } else if (colName === 'Timestamp') {
        rowValues.push(normalizedData['Timestamp'] !== undefined ? normalizedData['Timestamp'] : timestamp);
      } else if (colName === 'Thời gian đăng ký') {
        rowValues.push(normalizedData['Thời gian đăng ký'] !== undefined ? normalizedData['Thời gian đăng ký'] : timestamp);
      } else if (colName === 'Thời gian gửi') {
        rowValues.push(normalizedData['Thời gian gửi'] !== undefined ? normalizedData['Thời gian gửi'] : timestamp);
      } else {
        var val = normalizedData[colName];
        rowValues.push(val !== undefined && val !== null ? val : '');
      }
    }

    // 5. Chống ghi đúp dòng (Idempotent Upsert theo 'Mã đặt sân' hoặc 'Mã đăng ký')
    var idColIndex = headers.indexOf('Mã đặt sân');
    if (idColIndex === -1) idColIndex = headers.indexOf('Mã đăng ký');
    var recordId = idColIndex !== -1 ? String(rowValues[idColIndex] || '').trim() : '';

    var updatedExistingRow = false;
    if (recordId && sheet.getLastRow() > 1) {
      var existingIds = sheet.getRange(2, idColIndex + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var r = 0; r < existingIds.length; r++) {
        if (String(existingIds[r][0] || '').trim() === recordId) {
          sheet.getRange(r + 2, 1, 1, rowValues.length).setValues([rowValues]);
          updatedExistingRow = true;
          break;
        }
      }
    }

    if (!updatedExistingRow) {
      sheet.appendRow(rowValues);
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        action: updatedExistingRow ? 'updated' : 'appended',
        sheet: sheetName,
        row: rowValues
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'active', message: 'DVA Google Apps Script Webhook is ready' })
  ).setMimeType(ContentService.MimeType.JSON);
}`;
