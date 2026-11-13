export interface AdministrativeDistrict {
  name: string;
  wards: string[];
}

export interface AdministrativeProvince {
  name: string;
  districts: AdministrativeDistrict[];
}

/**
 * Lightweight, structured administrative divisions dataset for Vietnam (63 Provinces & Cities).
 * Zero external API dependency, zero rate-limiting, instant client-side cascading response.
 */
export const VIETNAM_PROVINCES: AdministrativeProvince[] = [
  {
    name: 'Hà Nội',
    districts: [
      {
        name: 'Quận Thanh Xuân',
        wards: ['Phường Khương Mai', 'Phường Khương Trung', 'Phường Khương Đình', 'Phường Phương Liệt', 'Phường Thanh Xuân Bắc', 'Phường Thanh Xuân Nam', 'Phường Thanh Xuân Trung', 'Phường Nhân Chính', 'Phường Thượng Đình', 'Phường Hạ Đình', 'Phường Kim Giang'],
      },
      {
        name: 'Quận Đống Đa',
        wards: ['Phường Ô Chợ Dừa', 'Phường Láng Hạ', 'Phường Láng Thượng', 'Phường Cát Linh', 'Phường Văn Miếu', 'Phường Hàng Bột', 'Phường Nam Đồng', 'Phường Quang Trung', 'Phường Kim Liên', 'Phường Trung Tự', 'Phường Phương Mai'],
      },
      {
        name: 'Quận Cầu Giấy',
        wards: ['Phường Dịch Vọng', 'Phường Dịch Vọng Hậu', 'Phường Quan Hoa', 'Phường Nghĩa Đô', 'Phường Nghĩa Tân', 'Phường Mai Dịch', 'Phường Yên Hòa', 'Phường Trung Hòa'],
      },
      {
        name: 'Quận Ba Đình',
        wards: ['Phường Điện Biên', 'Phường Đội Cấn', 'Phường Giảng Võ', 'Phường Kim Mã', 'Phường Liễu Giai', 'Phường Ngọc Hà', 'Phường Thành Công', 'Phường Trúc Bạch', 'Phường Vĩnh Phúc'],
      },
      {
        name: 'Quận Hoàn Kiếm',
        wards: ['Phường Hàng Bạc', 'Phường Hàng Bài', 'Phường Hàng Bồ', 'Phường Hàng Gai', 'Phường Hàng Mã', 'Phường Hàng Trống', 'Phường Tràng Tiền', 'Phường Phan Chu Trinh', 'Phường Cửa Đông'],
      },
      {
        name: 'Quận Hai Bà Trưng',
        wards: ['Phường Bách Khoa', 'Phường Bạch Đằng', 'Phường Bạch Mai', 'Phường Cầu Dền', 'Phường Đống Mác', 'Phường Đồng Nhân', 'Phường Lê Đại Hành', 'Phường Minh Khai', 'Phường Trương Định', 'Phường Vĩnh Tuy'],
      },
      {
        name: 'Quận Hoàng Mai',
        wards: ['Phường Đại Kim', 'Phường Định Công', 'Phường Giáp Bát', 'Phường Hoàng Liệt', 'Phường Hoàng Văn Thụ', 'Phường Lĩnh Nam', 'Phường Mai Động', 'Phường Tân Mai', 'Phường Thịnh Liệt', 'Phường Vĩnh Hưng', 'Phường Yên Sở'],
      },
      {
        name: 'Quận Tây Hồ',
        wards: ['Phường Bưởi', 'Phường Nhật Tân', 'Phường Phú Thượng', 'Phường Quảng An', 'Phường Thụy Khuê', 'Phường Tứ Liên', 'Phường Xuân La', 'Phường Yên Phụ'],
      },
      {
        name: 'Quận Nam Từ Liêm',
        wards: ['Phường Cầu Diễn', 'Phường Đại Mỗ', 'Phường Mễ Trì', 'Phường Mỹ Đình 1', 'Phường Mỹ Đình 2', 'Phường Phú Đô', 'Phường Tây Mỗ', 'Phường Trung Văn', 'Phường Xuân Phương'],
      },
      {
        name: 'Quận Bắc Từ Liêm',
        wards: ['Phường Cổ Nhuế 1', 'Phường Cổ Nhuế 2', 'Phường Đông Ngạc', 'Phường Đức Thắng', 'Phường Minh Khai', 'Phường Phú Diễn', 'Phường Phúc Diễn', 'Phường Tây Tựu', 'Phường Thượng Cát', 'Phường Xuân Đỉnh', 'Phường Xuân Tảo'],
      },
      {
        name: 'Quận Long Biên',
        wards: ['Phường Bồ Đề', 'Phường Cự Khối', 'Phường Đức Giang', 'Phường Gia Thụy', 'Phường Giang Biên', 'Phường Long Biên', 'Phường Ngọc Lâm', 'Phường Ngọc Thụy', 'Phường Phúc Đồng', 'Phường Phúc Lợi', 'Phường Sài Đồng', 'Phường Thạch Bàn', 'Phường Thượng Thanh', 'Phường Việt Hưng'],
      },
      {
        name: 'Quận Hà Đông',
        wards: ['Phường Biên Giang', 'Phường Đồng Mai', 'Phường Dương Nội', 'Phường Hà Cầu', 'Phường Kiến Hưng', 'Phường La Khê', 'Phường Mộ Lao', 'Phường Nguyễn Trãi', 'Phường Phú La', 'Phường Phú Lương', 'Phường Phúc La', 'Phường Quang Trung', 'Phường Vạn Phúc', 'Phường Văn Quán', 'Phường Yên Nghĩa', 'Phường Yết Kiêu'],
      },
      {
        name: 'Huyện Gia Lâm',
        wards: ['Thị trấn Trâu Quỳ', 'Thị trấn Yên Viên', 'Xã Bát Tràng', 'Xã Cổ Bi', 'Xã Đa Tốn', 'Xã Đặng Xá', 'Xã Dương Xá', 'Xã Kiêu Kỵ', 'Xã Ninh Hiệp', 'Xã Phù Đổng'],
      },
      {
        name: 'Huyện Đông Anh',
        wards: ['Thị trấn Đông Anh', 'Xã Bắc Hồng', 'Xã Cổ Loa', 'Xã Dục Tú', 'Xã Hải Bối', 'Xã Kim Chung', 'Xã Kim Nỗ', 'Xã Mai Lâm', 'Xã Nam Hồng', 'Xã Tiên Dương', 'Xã Uy Nỗ', 'Xã Vĩnh Ngọc', 'Xã Xuân Canh'],
      },
      {
        name: 'Huyện Thanh Trì',
        wards: ['Thị trấn Văn Điển', 'Xã Đại Áng', 'Xã Đông Mỹ', 'Xã Duyên Hà', 'Xã Hữu Hòa', 'Xã Liên Ninh', 'Xã Ngọc Hồi', 'Xã Ngũ Hiệp', 'Xã Tả Thanh Oai', 'Xã Tam Hiệp', 'Xã Tân Triều', 'Xã Thanh Liệt', 'Xã Tứ Hiệp', 'Xã Vạn Phúc', 'Xã Vĩnh Quỳnh', 'Xã Yên Mỹ'],
      },
      {
        name: 'Huyện Hoài Đức',
        wards: ['Thị trấn Trạm Trôi', 'Xã An Khánh', 'Xã An Thượng', 'Xã Di Trạch', 'Xã Đông La', 'Xã Đức Giang', 'Xã Đức Thượng', 'Xã Kim Chung', 'Xã La Phù', 'Xã Lại Yên', 'Xã Song Phương', 'Xã Sơn Đồng', 'Xã Tiền Yên', 'Xã Vân Canh', 'Xã Vân Côn', 'Xã Yên Sở'],
      },
      {
        name: 'Các Huyện Khác (Hà Nội)',
        wards: ['Thị xã Sơn Tây', 'Huyện Sóc Sơn', 'Huyện Ba Vì', 'Huyện Phúc Thọ', 'Huyện Đan Phượng', 'Huyện Thạch Thất', 'Huyện Quốc Oai', 'Huyện Chương Mỹ', 'Huyện Thanh Oai', 'Huyện Thường Tín', 'Huyện Phú Xuyên', 'Huyện Ứng Hòa', 'Huyện Mỹ Đức', 'Huyện Mê Linh'],
      },
    ],
  },
  {
    name: 'TP. Hồ Chí Minh',
    districts: [
      {
        name: 'Quận 1',
        wards: ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cô Giang', 'Phường Cầu Kho', 'Phường Cầu Ông Lãnh', 'Phường Đa Kao', 'Phường Nguyễn Cư Trinh', 'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 'Phường Tân Định'],
      },
      {
        name: 'Quận 3',
        wards: ['Phường Võ Thị Sáu', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 14'],
      },
      {
        name: 'Quận 7',
        wards: ['Phường Tân Phong', 'Phường Tân Phú', 'Phường Phú Mỹ', 'Phường Phú Thuận', 'Phường Tân Quy', 'Phường Tân Kiểng', 'Phường Tân Hưng', 'Phường Bình Thuận', 'Phường Tân Thuận Đông', 'Phường Tân Thuận Tây'],
      },
      {
        name: 'Quận Bình Thạnh',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 17', 'Phường 19', 'Phường 21', 'Phường 22', 'Phường 24', 'Phường 25', 'Phường 26', 'Phường 27', 'Phường 28'],
      },
      {
        name: 'Quận Tân Bình',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
      },
      {
        name: 'Quận Gò Vấp',
        wards: ['Phường 1', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 17'],
      },
      {
        name: 'Quận Phú Nhuận',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 13', 'Phường 15', 'Phường 17'],
      },
      {
        name: 'Thành phố Thủ Đức',
        wards: ['Phường An Khánh', 'Phường An Lợi Đông', 'Phường An Phú', 'Phường Bình Chiểu', 'Phường Bình Thọ', 'Phường Bình Trưng Đông', 'Phường Bình Trưng Tây', 'Phường Hiệp Bình Chánh', 'Phường Hiệp Bình Phước', 'Phường Hiệp Phú', 'Phường Linh Chiểu', 'Phường Linh Đông', 'Phường Linh Tây', 'Phường Linh Trung', 'Phường Linh Xuân', 'Phường Phước Bình', 'Phường Phước Long A', 'Phường Phước Long B', 'Phường Tam Bình', 'Phường Tam Phú', 'Phường Tăng Nhơn Phú A', 'Phường Tăng Nhơn Phú B', 'Phường Thạnh Mỹ Lợi', 'Phường Thảo Điền', 'Phường Thủ Thiêm', 'Phường Trường Thạnh', 'Phường Trường Thọ'],
      },
      {
        name: 'Quận 4',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 6', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 18'],
      },
      {
        name: 'Quận 5',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
      },
      {
        name: 'Quận 6',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
      },
      {
        name: 'Quận 8',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16'],
      },
      {
        name: 'Quận 10',
        wards: ['Phường 1', 'Phường 2', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
      },
      {
        name: 'Quận 11',
        wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16'],
      },
      {
        name: 'Quận 12',
        wards: ['Phường An Phú Đông', 'Phường Đông Hưng Thuận', 'Phường Hiệp Thành', 'Phường Tân Chánh Hiệp', 'Phường Tân Hưng Thuận', 'Phường Tân Thới Hiệp', 'Phường Tân Thới Nhất', 'Phường Thạnh Lộc', 'Phường Thạnh Xuân', 'Phường Thới An', 'Phường Trung Mỹ Tây'],
      },
      {
        name: 'Quận Tân Phú',
        wards: ['Phường Hiệp Tân', 'Phường Hòa Thạnh', 'Phường Phú Thạnh', 'Phường Phú Thọ Hòa', 'Phường Phú Trung', 'Phường Sơn Kỳ', 'Phường Tân Quý', 'Phường Tân Sơn Nhì', 'Phường Tân Thành', 'Phường Tân Thới Hòa', 'Phường Tây Thạnh'],
      },
      {
        name: 'Quận Bình Tân',
        wards: ['Phường An Lạc', 'Phường An Lạc A', 'Phường Bình Hưng Hòa', 'Phường Bình Hưng Hòa A', 'Phường Bình Hưng Hòa B', 'Phường Bình Trị Đông', 'Phường Bình Trị Đông A', 'Phường Bình Trị Đông B', 'Phường Tân Tạo', 'Phường Tân Tạo A'],
      },
      {
        name: 'Các Huyện Ngoại Thành (TP.HCM)',
        wards: ['Huyện Bình Chánh', 'Huyện Hóc Môn', 'Huyện Củ Chi', 'Huyện Nhà Bè', 'Huyện Cần Giờ'],
      },
    ],
  },
  {
    name: 'Đà Nẵng',
    districts: [
      { name: 'Quận Hải Châu', wards: ['Phường Hải Châu 1', 'Phường Hải Châu 2', 'Phường Thạch Thang', 'Phường Thanh Bình', 'Phường Thuận Phước', 'Phường Hòa Thuận Đông', 'Phường Hòa Thuận Tây', 'Phường Nam Dương', 'Phường Phước Ninh', 'Phường Bình Hiên', 'Phường Bình Thuận', 'Phường Hòa Cường Bắc', 'Phường Hòa Cường Nam'] },
      { name: 'Quận Thanh Khê', wards: ['Phường Tam Thuận', 'Phường Thanh Khê Tây', 'Phường Thanh Khê Đông', 'Phường Xuân Hà', 'Phường Tân Chính', 'Phường Chính Gián', 'Phường Vĩnh Trung', 'Phường Thạc Gián', 'Phường An Khê', 'Phường Hòa Khê'] },
      { name: 'Quận Sơn Trà', wards: ['Phường An Hải Bắc', 'Phường An Hải Đông', 'Phường An Hải Tây', 'Phường Mân Thái', 'Phường Nại Hiên Đông', 'Phường Phước Mỹ', 'Phường Thọ Quang'] },
      { name: 'Quận Ngũ Hành Sơn', wards: ['Phường Mỹ An', 'Phường Khuê Mỹ', 'Phường Hòa Quý', 'Phường Hòa Hải'] },
      { name: 'Quận Liên Chiểu', wards: ['Phường Hòa Hiệp Bắc', 'Phường Hòa Hiệp Nam', 'Phường Hòa Khánh Bắc', 'Phường Hòa Khánh Nam', 'Phường Hòa Minh'] },
      { name: 'Quận Cẩm Lệ', wards: ['Phường Khuê Trung', 'Phường Hòa Phát', 'Phường Hòa An', 'Phường Hòa Thọ Tây', 'Phường Hòa Thọ Đông', 'Phường Hòa Xuân'] },
      { name: 'Huyện Hòa Vang', wards: ['Xã Hòa Bắc', 'Xã Hòa Châu', 'Xã Hòa Khương', 'Xã Hòa Liên', 'Xã Hòa Nhơn', 'Xã Hòa Ninh', 'Xã Hòa Phong', 'Xã Hòa Phú', 'Xã Hòa Phước', 'Xã Hòa Sơn', 'Xã Hòa Tiến'] },
    ],
  },
  {
    name: 'Hải Phòng',
    districts: [
      { name: 'Quận Hồng Bàng', wards: ['Phường Hoàng Văn Thụ', 'Phường Minh Khai', 'Phường Phan Bội Châu', 'Phường Quán Toan', 'Phường Sở Dầu', 'Phường Thượng Lý', 'Phường Trại Chuối'] },
      { name: 'Quận Ngô Quyền', wards: ['Phường Cầu Đất', 'Phường Cầu Tre', 'Phường Đằng Giang', 'Phường Đông Khê', 'Phường Đổng Quốc Bình', 'Phường Gia Viên', 'Phường Lạc Viên', 'Phường Lạch Tray', 'Phường Lê Lợi', 'Phường Máy Chai', 'Phường Máy Tơ', 'Phường Vạn Mỹ'] },
      { name: 'Quận Lê Chân', wards: ['Phường An Biên', 'Phường An Dương', 'Phường Cát Dài', 'Phường Dư Hàng', 'Phường Dư Hàng Kênh', 'Phường Hàng Kênh', 'Phường Hồ Nam', 'Phường Kênh Dương', 'Phường Lam Sơn', 'Phường Niệm Nghĩa', 'Phường Nghĩa Xá', 'Phường Trại Cau', 'Phường Trần Nguyên Hãn', 'Phường Vĩnh Niệm'] },
      { name: 'Quận Hải An', wards: ['Phường Cát Bi', 'Phường Đằng Hải', 'Phường Đằng Lâm', 'Phường Đông Hải 1', 'Phường Đông Hải 2', 'Phường Nam Hải', 'Phường Thành Tô', 'Phường Tràng Cát'] },
      { name: 'Quận Kiến An', wards: ['Phường Bắc Sơn', 'Phường Đồng Hòa', 'Phường Nam Sơn', 'Phường Ngọc Sơn', 'Phường Phù Liễn', 'Phường Quán Trữ', 'Phường Trần Thành Ngọ', 'Phường Văn Đẩu'] },
      { name: 'Các Huyện Khác (Hải Phòng)', wards: ['Huyện Thủy Nguyên', 'Huyện An Dương', 'Huyện An Lão', 'Huyện Kiến Thụy', 'Huyện Tiên Lãng', 'Huyện Vĩnh Bảo', 'Huyện Cát Hải', 'Huyện Bạch Long Vĩ', 'Quận Đồ Sơn', 'Quận Dương Kinh'] },
    ],
  },
  {
    name: 'Cần Thơ',
    districts: [
      { name: 'Quận Ninh Kiều', wards: ['Phường An Bình', 'Phường An Cư', 'Phường An Hòa', 'Phường An Khánh', 'Phường An Nghiệp', 'Phường Hưng Lợi', 'Phường Tân An', 'Phường Thới Bình', 'Phường Xuân Khánh'] },
      { name: 'Quận Bình Thủy', wards: ['Phường An Thới', 'Phường Bình Thủy', 'Phường Bùi Hữu Nghĩa', 'Phường Long Hòa', 'Phường Long Tuyền', 'Phường Thới An Đông', 'Phường Trà An', 'Phường Trà Nóc'] },
      { name: 'Quận Cái Răng', wards: ['Phường Ba Láng', 'Phường Hưng Phú', 'Phường Hưng Thạnh', 'Phường Lê Bình', 'Phường Phú Thứ', 'Phường Tân Phú', 'Phường Thường Thạnh'] },
      { name: 'Các Quận/Huyện Khác (Cần Thơ)', wards: ['Quận Ô Môn', 'Quận Thốt Nốt', 'Huyện Phong Điền', 'Huyện Thới Lai', 'Huyện Cờ Đỏ', 'Huyện Vĩnh Thạnh'] },
    ],
  },
  // Các tỉnh thành trọng điểm & toàn quốc
  {
    name: 'Bắc Ninh',
    districts: [
      { name: 'Thành phố Bắc Ninh', wards: ['Phường Đại Phúc', 'Phường Đáp Cầu', 'Phường Hắp Lĩnh', 'Phường Kinh Bắc', 'Phường Ninh Xá', 'Phường Suối Hoa', 'Phường Tiền An', 'Phường Thị Cầu', 'Phường Vạn An', 'Phường Vân Dương', 'Phường Vệ An', 'Phường Võ Cường', 'Phường Vũ Ninh'] },
      { name: 'Thị xã Từ Sơn', wards: ['Phường Châu Khê', 'Phường Đình Bảng', 'Phường Đông Ngàn', 'Phường Đồng Kỵ', 'Phường Đồng Nguyên', 'Phường Phù Chẩn', 'Phường Tân Hồng', 'Phường Trang Hạ'] },
      { name: 'Huyện Yên Phong', wards: ['Thị trấn Chờ', 'Xã Dũng Liệt', 'Xã Đông Phong', 'Xã Đông Thọ', 'Xã Đông Tiến', 'Xã Long Châu', 'Xã Tam Đa', 'Xã Tam Giang', 'Xã Thụy Hòa', 'Xã Trung Nghĩa', 'Xã Văn Môn', 'Xã Yên Phụ', 'Xã Yên Trung'] },
      { name: 'Các Huyện Khác (Bắc Ninh)', wards: ['Thị xã Quế Võ', 'Thị xã Thuận Thành', 'Huyện Tiên Du', 'Huyện Gia Bình', 'Huyện Lương Tài'] },
    ],
  },
  {
    name: 'Bình Dương',
    districts: [
      { name: 'Thành phố Thủ Dầu Một', wards: ['Phường Chánh Mỹ', 'Phường Chánh Nghĩa', 'Phường Định Hòa', 'Phường Hiệp An', 'Phường Hiệp Thành', 'Phường Hòa Phú', 'Phường Phú Cường', 'Phường Phú Hòa', 'Phường Phú Lợi', 'Phường Phú Mỹ', 'Phường Phú Tân', 'Phường Tân An', 'Phường Tương Bình Hiệp'] },
      { name: 'Thành phố Thuận An', wards: ['Phường An Phú', 'Phường An Thạnh', 'Phường Bình Chuẩn', 'Phường Bình Hòa', 'Phường Bình Nhâm', 'Phường Hưng Định', 'Phường Lái Thiêu', 'Phường Thuận Giao', 'Phường Vĩnh Phú', 'Xã An Sơn'] },
      { name: 'Thành phố Dĩ An', wards: ['Phường An Bình', 'Phường Bình An', 'Phường Bình Thắng', 'Phường Dĩ An', 'Phường Đông Hòa', 'Phường Tân Bình', 'Phường Tân Đông Hiệp'] },
      { name: 'Các Thị xã / Huyện Khác (Bình Dương)', wards: ['Thành phố Tân Uyên', 'Thành phố Bến Cát', 'Huyện Bàu Bàng', 'Huyện Bắc Tân Uyên', 'Huyện Dầu Tiếng', 'Huyện Phú Giáo'] },
    ],
  },
  {
    name: 'Đồng Nai',
    districts: [
      { name: 'Thành phố Biên Hòa', wards: ['Phường An Bình', 'Phường An Hòa', 'Phường Bình Đa', 'Phường Bửu Hòa', 'Phường Bửu Long', 'Phường Hiệp Hòa', 'Phường Hóa An', 'Phường Hố Nai', 'Phường Long Bình', 'Phường Long Bình Tân', 'Phường Quang Vinh', 'Phường Quyết Thắng', 'Phường Tam Hiệp', 'Phường Tam Hòa', 'Phường Tam Phước', 'Phường Tân Biên', 'Phường Tân Hạnh', 'Phường Tân Hòa', 'Phường Tân Hiệp', 'Phường Tân Mai', 'Phường Tân Phong', 'Phường Tân Tiến', 'Phường Tân Vạn', 'Phường Thanh Bình', 'Phường Thống Nhất', 'Phường Trảng Dài', 'Phường Trung Dũng', 'Xã Long Hưng'] },
      { name: 'Thành phố Long Khánh', wards: ['Phường Xuân An', 'Phường Xuân Bình', 'Phường Xuân Hòa', 'Phường Xuân Trung', 'Phường Xuân Thanh', 'Phường Phú Bình'] },
      { name: 'Các Huyện Khác (Đồng Nai)', wards: ['Huyện Long Thành', 'Huyện Nhơn Trạch', 'Huyện Trảng Bom', 'Huyện Thống Nhất', 'Huyện Vĩnh Cửu', 'Huyện Cẩm Mỹ', 'Huyện Định Quán', 'Huyện Tân Phú', 'Huyện Xuân Lộc'] },
    ],
  },
  {
    name: 'Quảng Ninh',
    districts: [
      { name: 'Thành phố Hạ Long', wards: ['Phường Bạch Đằng', 'Phường Bãi Cháy', 'Phường Cao Thắng', 'Phường Cao Xanh', 'Phường Đại Yên', 'Phường Giếng Đáy', 'Phường Hà Khánh', 'Phường Hà Khẩu', 'Phường Hà Lầm', 'Phường Hà Phong', 'Phường Hà Trung', 'Phường Hà Tu', 'Phường Hoành Bồ', 'Phường Hồng Gai', 'Phường Hồng Hà', 'Phường Hồng Hải', 'Phường Hùng Thắng', 'Phường Trần Hưng Đạo', 'Phường Tuần Châu', 'Phường Việt Hưng', 'Phường Yết Kiêu'] },
      { name: 'Thành phố Cẩm Phả', wards: ['Phường Cẩm Bình', 'Phường Cẩm Đông', 'Phường Cẩm Phú', 'Phường Cẩm Sơn', 'Phường Cẩm Tây', 'Phường Cẩm Thạch', 'Phường Cẩm Thành', 'Phường Cẩm Thịnh', 'Phường Cẩm Thủy', 'Phường Cẩm Trung', 'Phường Cửa Ông', 'Phường Mông Dương', 'Phường Quang Hanh'] },
      { name: 'Các Huyện/TX Khác (Quảng Ninh)', wards: ['Thành phố Móng Cái', 'Thành phố Uông Bí', 'Thị xã Đông Triều', 'Thị xã Quảng Yên', 'Huyện Vân Đồn', 'Huyện Tiên Yên', 'Huyện Đầm Hà', 'Huyện Hải Hà', 'Huyện Bình Liêu', 'Huyện Ba Chẽ', 'Huyện Cô Tô'] },
    ],
  },
  {
    name: 'Nghệ An',
    districts: [
      { name: 'Thành phố Vinh', wards: ['Phường Bến Thủy', 'Phường Cửa Nam', 'Phường Đội Cung', 'Phường Đông Vĩnh', 'Phường Hà Huy Tập', 'Phường Hồng Sơn', 'Phường Hưng Bình', 'Phường Hưng Dũng', 'Phường Hưng Phúc', 'Phường Lê Lợi', 'Phường Lê Mao', 'Phường Quán Bàu', 'Phường Quang Trung', 'Phường Trung Đô', 'Phường Trường Thi'] },
      { name: 'Các Huyện/TX Khác (Nghệ An)', wards: ['Thị xã Cửa Lò', 'Thị xã Hoàng Mai', 'Thị xã Thái Hòa', 'Huyện Diễn Châu', 'Huyện Quỳnh Lưu', 'Huyện Nghi Lộc', 'Huyện Yên Thành', 'Huyện Đô Lương', 'Huyện Nam Đàn', 'Huyện Hưng Nguyên', 'Huyện Thanh Chương', 'Huyện Tân Kỳ', 'Huyện Nghĩa Đàn', 'Huyện Quỳ Hợp', 'Huyện Quỳ Châu', 'Huyện Quế Phong', 'Huyện Con Cuông', 'Huyện Tương Dương', 'Huyện Kỳ Sơn', 'Huyện Anh Sơn'] },
    ],
  },
  {
    name: 'Thanh Hóa',
    districts: [
      { name: 'Thành phố Thanh Hóa', wards: ['Phường Ba Đình', 'Phường Điện Biên', 'Phường Đông Cương', 'Phường Đông Hương', 'Phường Đông Sơn', 'Phường Đông Thọ', 'Phường Đông Vệ', 'Phường Hàm Rồng', 'Phường Lam Sơn', 'Phường Nam Ngạn', 'Phường Ngọc Trạo', 'Phường Phú Sơn', 'Phường Quảng Hưng', 'Phường Quảng Thành', 'Phường Quảng Thắng', 'Phường Quảng Thịnh', 'Phường Tào Xuyên', 'Phường Tân Sơn', 'Phường Trường Thi'] },
      { name: 'Các Huyện/TX Khác (Thanh Hóa)', wards: ['Thành phố Sầm Sơn', 'Thị xã Bỉm Sơn', 'Thị xã Nghi Sơn', 'Huyện Hoằng Hóa', 'Huyện Quảng Xương', 'Huyện Hậu Lộc', 'Huyện Nga Sơn', 'Huyện Nông Cống', 'Huyện Triệu Sơn', 'Huyện Thọ Xuân', 'Huyện Yên Định', 'Huyện Vĩnh Lộc', 'Huyện Hà Trung', 'Huyện Thiệu Hóa', 'Huyện Thạch Thành', 'Huyện Cẩm Thủy', 'Huyện Ngọc Lặc', 'Huyện Như Thanh', 'Huyện Như Xuân', 'Huyện Lang Chánh', 'Huyện Bá Thước', 'Huyện Quan Hóa', 'Huyện Quan Sơn', 'Huyện Mường Lát'] },
    ],
  },
  {
    name: 'Thừa Thiên Huế',
    districts: [
      { name: 'Thành phố Huế', wards: ['Phường An Cựu', 'Phường An Đông', 'Phường An Hòa', 'Phường An Tây', 'Phường Hương Sơ', 'Phường Kim Long', 'Phường Phú Hậu', 'Phường Phú Hội', 'Phường Phú Nhuận', 'Phường Phước Vĩnh', 'Phường Phường Đúc', 'Phường Tây Lộc', 'Phường Thuận Hòa', 'Phường Thuận Lộc', 'Phường Thuận Thành', 'Phường Vĩnh Ninh', 'Phường Vỹ Dạ', 'Phường Xuân Phú'] },
      { name: 'Các Huyện/TX Khác (Huế)', wards: ['Thị xã Hương Thủy', 'Thị xã Hương Trà', 'Huyện Phú Vang', 'Huyện Phú Lộc', 'Huyện Quảng Điền', 'Huyện Phong Điền', 'Huyện A Lưới', 'Huyện Nam Đông'] },
    ],
  },
  {
    name: 'Khánh Hòa',
    districts: [
      { name: 'Thành phố Nha Trang', wards: ['Phường Lộc Thọ', 'Phường Ngọc Hiệp', 'Phường Phước Hải', 'Phường Phước Hòa', 'Phường Phước Tân', 'Phường Phước Tiến', 'Phường Phương Sài', 'Phường Phương Sơn', 'Phường Tân Lập', 'Phường Vạn Thắng', 'Phường Vạn Thạnh', 'Phường Vĩnh Hải', 'Phường Vĩnh Hòa', 'Phường Vĩnh Phước', 'Phường Vĩnh Thọ', 'Phường Vĩnh Nguyên', 'Phường Vĩnh Trường', 'Phường Xương Huân'] },
      { name: 'Các Huyện/TX Khác (Khánh Hòa)', wards: ['Thành phố Cam Ranh', 'Thị xã Ninh Hòa', 'Huyện Vạn Ninh', 'Huyện Diên Khánh', 'Huyện Cam Lâm', 'Huyện Khánh Vĩnh', 'Huyện Khánh Sơn', 'Huyện Trường Sa'] },
    ],
  },
  {
    name: 'Lâm Đồng',
    districts: [
      { name: 'Thành phố Đà Lạt', wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Xã Tà Nung', 'Xã Trạm Hành', 'Xã Xuân Thọ', 'Xã Xuân Trường'] },
      { name: 'Thành phố Bảo Lộc', wards: ['Phường 1', 'Phường 2', 'Phường B’Lao', 'Phường Lộc Phát', 'Phường Lộc Sơn', 'Phường Lộc Tiến'] },
      { name: 'Các Huyện Khác (Lâm Đồng)', wards: ['Huyện Đức Trọng', 'Huyện Di Linh', 'Huyện Đơn Dương', 'Huyện Lạc Dương', 'Huyện Lâm Hà', 'Huyện Bảo Lâm', 'Huyện Đạ Huoai', 'Huyện Đạ Tẻh', 'Huyện Cát Tiên'] },
    ],
  },
  {
    name: 'Nam Định',
    districts: [
      { name: 'Thành phố Nam Định', wards: ['Phường Bà Triệu', 'Phường Cửa Bắc', 'Phường Cửa Nam', 'Phường Hạ Long', 'Phường Lộc Hạ', 'Phường Lộc Vượng', 'Phường Năng Tĩnh', 'Phường Ngô Quyền', 'Phường Nguyễn Du', 'Phường Phan Đình Phùng', 'Phường Quang Trung', 'Phường Thống Nhất', 'Phường Tràng Thi', 'Phường Trần Đăng Ninh', 'Phường Trần Hưng Đạo', 'Phường Trần Quang Khải', 'Phường Trần Tế Xương', 'Phường Văn Miếu', 'Phường Vị Hoàng', 'Phường Vị Xuyên'] },
      { name: 'Các Huyện Khác (Nam Định)', wards: ['Huyện Hải Hậu', 'Huyện Giao Thủy', 'Huyện Nghĩa Hưng', 'Huyện Trực Ninh', 'Huyện Xuân Trường', 'Huyện Nam Trực', 'Huyện Vụ Bản', 'Huyện Ý Yên', 'Huyện Mỹ Lộc'] },
    ],
  },
  {
    name: 'Thái Nguyên',
    districts: [
      { name: 'Thành phố Thái Nguyên', wards: ['Phường Cam Giá', 'Phường Chùa Hang', 'Phường Đồng Bẩm', 'Phường Đồng Quang', 'Phường Gia Sàng', 'Phường Hoàng Văn Thụ', 'Phường Hương Sơn', 'Phường Phan Đình Phùng', 'Phường Phú Xá', 'Phường Quan Triều', 'Phường Quang Trung', 'Phường Quang Vinh', 'Phường Tân Lập', 'Phường Tân Long', 'Phường Tân Thành', 'Phường Tân Thịnh', 'Phường Thắng Lợi', 'Phường Thịnh Đán', 'Phường Tích Lương', 'Phường Trung Thành'] },
      { name: 'Các Huyện/TX Khác (Thái Nguyên)', wards: ['Thành phố Sông Công', 'Thành phố Phổ Yên', 'Huyện Đại Từ', 'Huyện Định Hóa', 'Huyện Đồng Hỷ', 'Huyện Phú Bình', 'Huyện Phú Lương', 'Huyện Võ Nhai'] },
    ],
  },
  {
    name: 'Hải Dương',
    districts: [
      { name: 'Thành phố Hải Dương', wards: ['Phường Bình Hàn', 'Phường Cẩm Thượng', 'Phường Hải Tân', 'Phường Lê Thanh Nghị', 'Phường Ngọc Châu', 'Phường Nguyễn Trãi', 'Phường Nhị Châu', 'Phường Phạm Ngũ Lão', 'Phường Quang Trung', 'Phường Tân Bình', 'Phường Thạch Khôi', 'Phường Thanh Bình', 'Phường Trần Hưng Đạo', 'Phường Trần Phú', 'Phường Tứ Minh', 'Phường Việt Hòa'] },
      { name: 'Các Huyện/TX Khác (Hải Dương)', wards: ['Thành phố Chí Linh', 'Thị xã Kinh Môn', 'Huyện Cẩm Giàng', 'Huyện Bình Giang', 'Huyện Gia Lộc', 'Huyện Kim Thành', 'Huyện Nam Sách', 'Huyện Ninh Giang', 'Huyện Thanh Hà', 'Huyện Thanh Miện', 'Huyện Tứ Kỳ'] },
    ],
  },
  {
    name: 'Bà Rịa - Vũng Tàu',
    districts: [
      { name: 'Thành phố Vũng Tàu', wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường Thắng Nhất', 'Phường Thắng Nhì', 'Phường Thắng Tam', 'Phường Nguyễn An Ninh', 'Phường Rạch Dừa', 'Xã Long Sơn'] },
      { name: 'Thành phố Bà Rịa', wards: ['Phường Phước Hưng', 'Phường Phước Hiệp', 'Phường Phước Nguyên', 'Phường Phước Trung', 'Phường Long Hương', 'Phường Long Tâm', 'Phường Long Toàn', 'Phường Kim Dinh'] },
      { name: 'Thị xã Phú Mỹ & Các Huyện', wards: ['Thị xã Phú Mỹ', 'Huyện Châu Đức', 'Huyện Xuyên Mộc', 'Huyện Long Điền', 'Huyện Đất Đỏ', 'Huyện Côn Đảo'] },
    ],
  },
  // Các tỉnh thành khác trên cả nước (đảm bảo phủ kín 63 tỉnh thành)
  { name: 'An Giang', districts: [{ name: 'TP. Long Xuyên & Các Huyện', wards: ['TP. Long Xuyên', 'TP. Châu Đốc', 'TX. Tân Châu', 'Huyện An Phú', 'Huyện Châu Phú', 'Huyện Châu Thành', 'Huyện Chợ Mới', 'Huyện Phú Tân', 'Huyện Thoại Sơn', 'Huyện Tịnh Biên', 'Huyện Tri Tôn'] }] },
  { name: 'Bắc Giang', districts: [{ name: 'TP. Bắc Giang & Các Huyện', wards: ['TP. Bắc Giang', 'TX. Việt Yên', 'Huyện Hiệp Hòa', 'Huyện Lạng Giang', 'Huyện Lục Nam', 'Huyện Lục Ngạn', 'Huyện Sơn Động', 'Huyện Tân Yên', 'Huyện Yên Dũng', 'Huyện Yên Thế'] }] },
  { name: 'Bắc Kạn', districts: [{ name: 'TP. Bắc Kạn & Các Huyện', wards: ['TP. Bắc Kạn', 'Huyện Ba Bể', 'Huyện Bạch Thông', 'Huyện Chợ Đồn', 'Huyện Chợ Mới', 'Huyện Na Rì', 'Huyện Ngân Sơn', 'Huyện Pác Nặm'] }] },
  { name: 'Bạc Liêu', districts: [{ name: 'TP. Bạc Liêu & Các Huyện', wards: ['TP. Bạc Liêu', 'TX. Giá Rai', 'Huyện Đông Hải', 'Huyện Hòa Bình', 'Huyện Hồng Dân', 'Huyện Phước Long', 'Huyện Vĩnh Lợi'] }] },
  { name: 'Bến Tre', districts: [{ name: 'TP. Bến Tre & Các Huyện', wards: ['TP. Bến Tre', 'Huyện Ba Tri', 'Huyện Bình Đại', 'Huyện Châu Thành', 'Huyện Chợ Lách', 'Huyện Giồng Trôm', 'Huyện Mỏ Cày Bắc', 'Huyện Mỏ Cày Nam', 'Huyện Thạnh Phú'] }] },
  { name: 'Bình Định', districts: [{ name: 'TP. Quy Nhơn & Các Huyện', wards: ['TP. Quy Nhơn', 'TX. An Nhơn', 'TX. Hoài Nhơn', 'Huyện An Lão', 'Huyện Hoài Ân', 'Huyện Phù Cát', 'Huyện Phù Mỹ', 'Huyện Tây Sơn', 'Huyện Tuy Phước', 'Huyện Vân Canh', 'Huyện Vĩnh Thạnh'] }] },
  { name: 'Bình Phước', districts: [{ name: 'TP. Đồng Xoài & Các Huyện', wards: ['TP. Đồng Xoài', 'TX. Bình Long', 'TX. Phước Long', 'TX. Chơn Thành', 'Huyện Bù Đăng', 'Huyện Bù Đốp', 'Huyện Bù Gia Mập', 'Huyện Đồng Phú', 'Huyện Hớn Quản', 'Huyện Lộc Ninh', 'Huyện Phú Riềng'] }] },
  { name: 'Bình Thuận', districts: [{ name: 'TP. Phan Thiết & Các Huyện', wards: ['TP. Phan Thiết', 'TX. La Gi', 'Huyện Tuy Phong', 'Huyện Bắc Bình', 'Huyện Hàm Thuận Bắc', 'Huyện Hàm Thuận Nam', 'Huyện Hàm Tân', 'Huyện Đức Linh', 'Huyện Tánh Linh', 'Huyện Phú Quý'] }] },
  { name: 'Cà Mau', districts: [{ name: 'TP. Cà Mau & Các Huyện', wards: ['TP. Cà Mau', 'Huyện Đầm Dơi', 'Huyện Cái Nước', 'Huyện Trần Văn Thời', 'Huyện U Minh', 'Huyện Thới Bình', 'Huyện Năm Căn', 'Huyện Phú Tân', 'Huyện Ngọc Hiển'] }] },
  { name: 'Cao Bằng', districts: [{ name: 'TP. Cao Bằng & Các Huyện', wards: ['TP. Cao Bằng', 'Huyện Bảo Lạc', 'Huyện Bảo Lâm', 'Huyện Hạ Lang', 'Huyện Hà Quảng', 'Huyện Hòa An', 'Huyện Nguyên Bình', 'Huyện Quảng Hòa', 'Huyện Thạch An', 'Huyện Trùng Khánh'] }] },
  { name: 'Đắk Lắk', districts: [{ name: 'TP. Buôn Ma Thuột & Các Huyện', wards: ['TP. Buôn Ma Thuột', 'TX. Buôn Hồ', 'Huyện Ea H’leo', 'Huyện Ea Súp', 'Huyện Krông Năng', 'Huyện Krông Búk', 'Huyện Buôn Đôn', 'Huyện Cư M’gar', 'Huyện Ea Kar', 'Huyện M’Drắk', 'Huyện Krông Pắc', 'Huyện Krông Bông', 'Huyện Krông Ana', 'Huyện Lắk', 'Huyện Cư Kuin'] }] },
  { name: 'Đắk Nông', districts: [{ name: 'TP. Gia Nghĩa & Các Huyện', wards: ['TP. Gia Nghĩa', 'Huyện Đắk Glong', 'Huyện Cư Jút', 'Huyện Đắk Mil', 'Huyện Krông Nô', 'Huyện Đắk Song', 'Huyện Đắk R’Lấp', 'Huyện Tuy Đức'] }] },
  { name: 'Điện Biên', districts: [{ name: 'TP. Điện Biên Phủ & Các Huyện', wards: ['TP. Điện Biên Phủ', 'TX. Mường Lay', 'Huyện Điện Biên', 'Huyện Điện Biên Đông', 'Huyện Mường Ảng', 'Huyện Tuần Giáo', 'Huyện Tủa Chùa', 'Huyện Mường Chà', 'Huyện Nậm Pồ', 'Huyện Mường Nhé'] }] },
  { name: 'Đồng Tháp', districts: [{ name: 'TP. Cao Lãnh & Các Huyện', wards: ['TP. Cao Lãnh', 'TP. Sa Đéc', 'TP. Hồng Ngự', 'Huyện Tân Hồng', 'Huyện Hồng Ngự', 'Huyện Tam Nông', 'Huyện Tháp Mười', 'Huyện Cao Lãnh', 'Huyện Thanh Bình', 'Huyện Lấp Vò', 'Huyện Lai Vung', 'Huyện Châu Thành'] }] },
  { name: 'Gia Lai', districts: [{ name: 'TP. Pleiku & Các Huyện', wards: ['TP. Pleiku', 'TX. An Khê', 'TX. Ayun Pa', 'Huyện Đắk Đoa', 'Huyện Mang Yang', 'Huyện Kbang', 'Huyện Kông Chro', 'Huyện Đức Cơ', 'Huyện Chư Prông', 'Huyện Chư Sê', 'Huyện Chư Pưh', 'Huyện Phú Thiện', 'Huyện Ia Pa', 'Huyện Krông Pa', 'Huyện Ia Grai', 'Huyện Đắk Pơ'] }] },
  { name: 'Hà Giang', districts: [{ name: 'TP. Hà Giang & Các Huyện', wards: ['TP. Hà Giang', 'Huyện Đồng Văn', 'Huyện Mèo Vạc', 'Huyện Yên Minh', 'Huyện Quản Bạ', 'Huyện Vị Xuyên', 'Huyện Bắc Mê', 'Huyện Hoàng Su Phì', 'Huyện Xín Mần', 'Huyện Bắc Quang', 'Huyện Quang Bình'] }] },
  { name: 'Hà Nam', districts: [{ name: 'TP. Phủ Lý & Các Huyện', wards: ['TP. Phủ Lý', 'TX. Duy Tiên', 'Huyện Kim Bảng', 'Huyện Thanh Liêm', 'Huyện Bình Lục', 'Huyện Lý Nhân'] }] },
  { name: 'Hà Tĩnh', districts: [{ name: 'TP. Hà Tĩnh & Các Huyện', wards: ['TP. Hà Tĩnh', 'TX. Hồng Lĩnh', 'TX. Kỳ Anh', 'Huyện Nghi Xuân', 'Huyện Đức Thọ', 'Huyện Hương Sơn', 'Huyện Hương Khê', 'Huyện Vũ Quang', 'Huyện Can Lộc', 'Huyện Lộc Hà', 'Huyện Thạch Hà', 'Huyện Cẩm Xuyên', 'Huyện Kỳ Anh'] }] },
  { name: 'Hậu Giang', districts: [{ name: 'TP. Vị Thanh & Các Huyện', wards: ['TP. Vị Thanh', 'TP. Ngã Bảy', 'TX. Long Mỹ', 'Huyện Châu Thành', 'Huyện Châu Thành A', 'Huyện Phụng Hiệp', 'Huyện Vị Thủy', 'Huyện Long Mỹ'] }] },
  { name: 'Hòa Bình', districts: [{ name: 'TP. Hòa Bình & Các Huyện', wards: ['TP. Hòa Bình', 'Huyện Đà Bắc', 'Huyện Lương Sơn', 'Huyện Kim Bôi', 'Huyện Cao Phong', 'Huyện Tân Lạc', 'Huyện Mai Châu', 'Huyện Lạc Sơn', 'Huyện Yên Thủy', 'Huyện Lạc Thủy'] }] },
  { name: 'Hưng Yên', districts: [{ name: 'TP. Hưng Yên & Các Huyện', wards: ['TP. Hưng Yên', 'TX. Mỹ Hào', 'Huyện Văn Lâm', 'Huyện Văn Giang', 'Huyện Yên Mỹ', 'Huyện Khoái Châu', 'Huyện Ân Thi', 'Huyện Kim Động', 'Huyện Tiên Lữ', 'Huyện Phù Cừ'] }] },
  { name: 'Kiên Giang', districts: [{ name: 'TP. Rạch Giá & Các Huyện', wards: ['TP. Rạch Giá', 'TP. Phú Quốc', 'TP. Hà Tiên', 'Huyện Kiên Lương', 'Huyện Hòn Đất', 'Huyện Tân Hiệp', 'Huyện Châu Thành', 'Huyện Giồng Riềng', 'Huyện Gò Quao', 'Huyện An Biên', 'Huyện An Minh', 'Huyện Vĩnh Thuận', 'Huyện U Minh Thượng', 'Huyện Kiên Hải', 'Huyện Giang Thành'] }] },
  { name: 'Kon Tum', districts: [{ name: 'TP. Kon Tum & Các Huyện', wards: ['TP. Kon Tum', 'Huyện Đắk Glei', 'Huyện Ngọc Hồi', 'Huyện Đắk Tô', 'Huyện Sa Thầy', 'Huyện Kon Plông', 'Huyện Đắk Hà', 'Huyện Kon Rẫy', 'Huyện Tu Mơ Rông', 'Huyện Ia H’Drai'] }] },
  { name: 'Lai Châu', districts: [{ name: 'TP. Lai Châu & Các Huyện', wards: ['TP. Lai Châu', 'Huyện Tam Đường', 'Huyện Mường Tè', 'Huyện Sìn Hồ', 'Huyện Phong Thổ', 'Huyện Than Uyên', 'Huyện Tân Uyên', 'Huyện Nậm Nhùn'] }] },
  { name: 'Lạng Sơn', districts: [{ name: 'TP. Lạng Sơn & Các Huyện', wards: ['TP. Lạng Sơn', 'Huyện Tràng Định', 'Huyện Bình Gia', 'Huyện Văn Lãng', 'Huyện Cao Lộc', 'Huyện Văn Quan', 'Huyện Bắc Sơn', 'Huyện Hữu Lũng', 'Huyện Chi Lăng', 'Huyện Lộc Bình', 'Huyện Đình Lập'] }] },
  { name: 'Lào Cai', districts: [{ name: 'TP. Lào Cai & Các Huyện', wards: ['TP. Lào Cai', 'TX. Sa Pa', 'Huyện Bát Xát', 'Huyện Mường Khương', 'Huyện Si Ma Cai', 'Huyện Bắc Hà', 'Huyện Bảo Thắng', 'Huyện Bảo Yên', 'Huyện Văn Bàn'] }] },
  { name: 'Long An', districts: [{ name: 'TP. Tân An & Các Huyện', wards: ['TP. Tân An', 'TX. Kiến Tường', 'Huyện Bến Lức', 'Huyện Cần Đước', 'Huyện Cần Giuộc', 'Huyện Châu Thành', 'Huyện Đức Hòa', 'Huyện Đức Huệ', 'Huyện Mộc Hóa', 'Huyện Tân Hưng', 'Huyện Tân Thạnh', 'Huyện Tân Trụ', 'Huyện Thạnh Hóa', 'Huyện Thủ Thừa', 'Huyện Vĩnh Hưng'] }] },
  { name: 'Ninh Bình', districts: [{ name: 'TP. Ninh Bình & Các Huyện', wards: ['TP. Ninh Bình', 'TP. Tam Điệp', 'Huyện Gia Viễn', 'Huyện Hoa Lư', 'Huyện Kim Sơn', 'Huyện Nho Quan', 'Huyện Yên Khánh', 'Huyện Yên Mô'] }] },
  { name: 'Ninh Thuận', districts: [{ name: 'TP. Phan Rang - Tháp Chàm & Huyện', wards: ['TP. Phan Rang - Tháp Chàm', 'Huyện Bác Ái', 'Huyện Ninh Hải', 'Huyện Ninh Phước', 'Huyện Ninh Sơn', 'Huyện Thuận Bắc', 'Huyện Thuận Nam'] }] },
  { name: 'Phú Thọ', districts: [{ name: 'TP. Việt Trì & Các Huyện', wards: ['TP. Việt Trì', 'TX. Phú Thọ', 'Huyện Cẩm Khê', 'Huyện Đoan Hùng', 'Huyện Hạ Hòa', 'Huyện Lâm Thao', 'Huyện Phù Ninh', 'Huyện Tam Nông', 'Huyện Tân Sơn', 'Huyện Thanh Ba', 'Huyện Thanh Sơn', 'Huyện Thanh Thủy', 'Huyện Yên Lập'] }] },
  { name: 'Phú Yên', districts: [{ name: 'TP. Tuy Hòa & Các Huyện', wards: ['TP. Tuy Hòa', 'TX. Sông Cầu', 'TX. Đông Hòa', 'Huyện Đồng Xuân', 'Huyện Phú Hòa', 'Huyện Sông Hinh', 'Huyện Sơn Hòa', 'Huyện Tây Hòa', 'Huyện Tuy An'] }] },
  { name: 'Quảng Bình', districts: [{ name: 'TP. Đồng Hới & Các Huyện', wards: ['TP. Đồng Hới', 'TX. Ba Đồn', 'Huyện Bố Trạch', 'Huyện Lệ Thủy', 'Huyện Minh Hóa', 'Huyện Quảng Ninh', 'Huyện Quảng Trạch', 'Huyện Tuyên Hóa'] }] },
  { name: 'Quảng Nam', districts: [{ name: 'TP. Tam Kỳ, Hội An & Các Huyện', wards: ['TP. Tam Kỳ', 'TP. Hội An', 'TX. Điện Bàn', 'Huyện Đại Lộc', 'Huyện Duy Xuyên', 'Huyện Thăng Bình', 'Huyện Quế Sơn', 'Huyện Núi Thành', 'Huyện Tiên Phước', 'Huyện Bắc Trà My', 'Huyện Nam Trà My', 'Huyện Phước Sơn', 'Huyện Hiệp Đức', 'Huyện Nông Sơn', 'Huyện Đông Giang', 'Huyện Nam Giang', 'Huyện Tây Giang', 'Huyện Phú Ninh'] }] },
  { name: 'Quảng Ngãi', districts: [{ name: 'TP. Quảng Ngãi & Các Huyện', wards: ['TP. Quảng Ngãi', 'TX. Đức Phổ', 'Huyện Ba Tơ', 'Huyện Bình Sơn', 'Huyện Minh Long', 'Huyện Mộ Đức', 'Huyện Nghĩa Hành', 'Huyện Sơn Hà', 'Huyện Sơn Tây', 'Huyện Sơn Tịnh', 'Huyện Trà Bồng', 'Huyện Tư Nghĩa', 'Huyện Lý Sơn'] }] },
  { name: 'Quảng Trị', districts: [{ name: 'TP. Đông Hà & Các Huyện', wards: ['TP. Đông Hà', 'TX. Quảng Trị', 'Huyện Cam Lộ', 'Huyện Cồn Cỏ', 'Huyện Đakrông', 'Huyện Gio Linh', 'Huyện Hải Lăng', 'Huyện Hướng Hóa', 'Huyện Triệu Phong', 'Huyện Vĩnh Linh'] }] },
  { name: 'Sóc Trăng', districts: [{ name: 'TP. Sóc Trăng & Các Huyện', wards: ['TP. Sóc Trăng', 'TX. Ngã Năm', 'TX. Vĩnh Châu', 'Huyện Châu Thành', 'Huyện Cù Lao Dung', 'Huyện Kế Sách', 'Huyện Long Phú', 'Huyện Mỹ Tú', 'Huyện Mỹ Xuyên', 'Huyện Thạnh Trị', 'Huyện Trần Đề'] }] },
  { name: 'Sơn La', districts: [{ name: 'TP. Sơn La & Các Huyện', wards: ['TP. Sơn La', 'Huyện Quỳnh Nhai', 'Huyện Mường La', 'Huyện Thuận Châu', 'Huyện Phù Yên', 'Huyện Bắc Yên', 'Huyện Mai Sơn', 'Huyện Sông Mã', 'Huyện Yên Châu', 'Huyện Mộc Châu', 'Huyện Sốp Cộp', 'Huyện Vân Hồ'] }] },
  { name: 'Tây Ninh', districts: [{ name: 'TP. Tây Ninh & Các Huyện', wards: ['TP. Tây Ninh', 'TX. Trảng Bàng', 'TX. Hòa Thành', 'Huyện Bến Cầu', 'Huyện Châu Thành', 'Huyện Dương Minh Châu', 'Huyện Gò Dầu', 'Huyện Tân Biên', 'Huyện Tân Châu'] }] },
  { name: 'Thái Bình', districts: [{ name: 'TP. Thái Bình & Các Huyện', wards: ['TP. Thái Bình', 'Huyện Đông Hưng', 'Huyện Hưng Hà', 'Huyện Kiến Xương', 'Huyện Quỳnh Phụ', 'Huyện Thái Thụy', 'Huyện Tiền Hải', 'Huyện Vũ Thư'] }] },
  { name: 'Tiền Giang', districts: [{ name: 'TP. Mỹ Tho & Các Huyện', wards: ['TP. Mỹ Tho', 'TP. Gò Công', 'TX. Cai Lậy', 'Huyện Cái Bè', 'Huyện Cai Lậy', 'Huyện Châu Thành', 'Huyện Chợ Gạo', 'Huyện Gò Công Tây', 'Huyện Gò Công Đông', 'Huyện Tân Phước', 'Huyện Tân Phú Đông'] }] },
  { name: 'Trà Vinh', districts: [{ name: 'TP. Trà Vinh & Các Huyện', wards: ['TP. Trà Vinh', 'TX. Duyên Hải', 'Huyện Càng Long', 'Huyện Cầu Kè', 'Huyện Cầu Ngang', 'Huyện Châu Thành', 'Huyện Duyên Hải', 'Huyện Tiểu Cần', 'Huyện Trà Cú'] }] },
  { name: 'Tuyên Quang', districts: [{ name: 'TP. Tuyên Quang & Các Huyện', wards: ['TP. Tuyên Quang', 'Huyện Chiêm Hóa', 'Huyện Hàm Yên', 'Huyện Lâm Bình', 'Huyện Na Hang', 'Huyện Sơn Dương', 'Huyện Yên Sơn'] }] },
  { name: 'Vĩnh Long', districts: [{ name: 'TP. Vĩnh Long & Các Huyện', wards: ['TP. Vĩnh Long', 'TX. Bình Minh', 'Huyện Bình Tân', 'Huyện Long Hồ', 'Huyện Mang Thít', 'Huyện Tam Bình', 'Huyện Trà Ôn', 'Huyện Vũng Liêm'] }] },
  { name: 'Vĩnh Phúc', districts: [{ name: 'TP. Vĩnh Yên & Các Huyện', wards: ['TP. Vĩnh Yên', 'TP. Phúc Yên', 'Huyện Bình Xuyên', 'Huyện Lập Thạch', 'Huyện Sông Lô', 'Huyện Tam Dương', 'Huyện Tam Đảo', 'Huyện Vĩnh Tường', 'Huyện Yên Lạc'] }] },
  { name: 'Yên Bái', districts: [{ name: 'TP. Yên Bái & Các Huyện', wards: ['TP. Yên Bái', 'TX. Nghĩa Lộ', 'Huyện Lục Yên', 'Huyện Mù Cang Chải', 'Huyện Trạm Tấu', 'Huyện Trấn Yên', 'Huyện Văn Chấn', 'Huyện Văn Yên', 'Huyện Yên Bình'] }] },
];

export function formatVietnameseAddress(
  specificAddress: string,
  ward: string,
  district: string,
  province: string
): string {
  const parts = [specificAddress.trim(), ward.trim(), district.trim(), province.trim()].filter(Boolean);
  return parts.join(', ');
}
