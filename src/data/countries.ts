export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  nameVi?: string;
}

/**
 * Danh sách 249 quốc gia & vùng lãnh thổ chuẩn ISO 3166-1 alpha-2.
 * Ưu tiên đặt Việt Nam (VN) lên đầu, tiếp theo là A-Z theo tên tiếng Anh.
 */
export const ALL_COUNTRIES: CountryOption[] = [
  {
    "code": "VN",
    "name": "Vietnam",
    "nameVi": "Việt Nam",
    "flag": "🇻🇳"
  },
  {
    "code": "AF",
    "name": "Afghanistan",
    "nameVi": "Afghanistan",
    "flag": "🇦🇫"
  },
  {
    "code": "AX",
    "name": "Åland Islands",
    "nameVi": "Quần đảo Åland",
    "flag": "🇦🇽"
  },
  {
    "code": "AL",
    "name": "Albania",
    "nameVi": "Albania",
    "flag": "🇦🇱"
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "nameVi": "Algeria",
    "flag": "🇩🇿"
  },
  {
    "code": "AS",
    "name": "American Samoa",
    "nameVi": "Samoa thuộc Mỹ",
    "flag": "🇦🇸"
  },
  {
    "code": "AD",
    "name": "Andorra",
    "nameVi": "Andorra",
    "flag": "🇦🇩"
  },
  {
    "code": "AO",
    "name": "Angola",
    "nameVi": "Angola",
    "flag": "🇦🇴"
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "nameVi": "Anguilla",
    "flag": "🇦🇮"
  },
  {
    "code": "AQ",
    "name": "Antarctica",
    "nameVi": "Nam Cực",
    "flag": "🇦🇶"
  },
  {
    "code": "AG",
    "name": "Antigua & Barbuda",
    "nameVi": "Antigua và Barbuda",
    "flag": "🇦🇬"
  },
  {
    "code": "AR",
    "name": "Argentina",
    "nameVi": "Argentina",
    "flag": "🇦🇷"
  },
  {
    "code": "AM",
    "name": "Armenia",
    "nameVi": "Armenia",
    "flag": "🇦🇲"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "nameVi": "Aruba",
    "flag": "🇦🇼"
  },
  {
    "code": "AU",
    "name": "Australia",
    "nameVi": "Úc (Australia)",
    "flag": "🇦🇺"
  },
  {
    "code": "AT",
    "name": "Austria",
    "nameVi": "Áo",
    "flag": "🇦🇹"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "nameVi": "Azerbaijan",
    "flag": "🇦🇿"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "nameVi": "Bahamas",
    "flag": "🇧🇸"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "nameVi": "Bahrain",
    "flag": "🇧🇭"
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "nameVi": "Bangladesh",
    "flag": "🇧🇩"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "nameVi": "Barbados",
    "flag": "🇧🇧"
  },
  {
    "code": "BY",
    "name": "Belarus",
    "nameVi": "Belarus",
    "flag": "🇧🇾"
  },
  {
    "code": "BE",
    "name": "Belgium",
    "nameVi": "Bỉ",
    "flag": "🇧🇪"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "nameVi": "Belize",
    "flag": "🇧🇿"
  },
  {
    "code": "BJ",
    "name": "Benin",
    "nameVi": "Benin",
    "flag": "🇧🇯"
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "nameVi": "Bermuda",
    "flag": "🇧🇲"
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "nameVi": "Bhutan",
    "flag": "🇧🇹"
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "nameVi": "Bolivia",
    "flag": "🇧🇴"
  },
  {
    "code": "BA",
    "name": "Bosnia & Herzegovina",
    "nameVi": "Bosnia và Herzegovina",
    "flag": "🇧🇦"
  },
  {
    "code": "BW",
    "name": "Botswana",
    "nameVi": "Botswana",
    "flag": "🇧🇼"
  },
  {
    "code": "BV",
    "name": "Bouvet Island",
    "nameVi": "Đảo Bouvet",
    "flag": "🇧🇻"
  },
  {
    "code": "BR",
    "name": "Brazil",
    "nameVi": "Brazil",
    "flag": "🇧🇷"
  },
  {
    "code": "IO",
    "name": "British Indian Ocean Territory",
    "nameVi": "Lãnh thổ Ấn Độ Dương thuộc Anh",
    "flag": "🇮🇴"
  },
  {
    "code": "VG",
    "name": "British Virgin Islands",
    "nameVi": "Quần đảo Virgin thuộc Anh",
    "flag": "🇻🇬"
  },
  {
    "code": "BN",
    "name": "Brunei",
    "nameVi": "Brunei",
    "flag": "🇧🇳"
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "nameVi": "Bulgaria",
    "flag": "🇧🇬"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "nameVi": "Burkina Faso",
    "flag": "🇧🇫"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "nameVi": "Burundi",
    "flag": "🇧🇮"
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "nameVi": "Campuchia",
    "flag": "🇰🇭"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "nameVi": "Cameroon",
    "flag": "🇨🇲"
  },
  {
    "code": "CA",
    "name": "Canada",
    "nameVi": "Canada",
    "flag": "🇨🇦"
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "nameVi": "Cape Verde",
    "flag": "🇨🇻"
  },
  {
    "code": "BQ",
    "name": "Caribbean Netherlands",
    "nameVi": "Ca-ri-bê Hà Lan",
    "flag": "🇧🇶"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "nameVi": "Quần đảo Cayman",
    "flag": "🇰🇾"
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "nameVi": "Cộng hòa Trung Phi",
    "flag": "🇨🇫"
  },
  {
    "code": "TD",
    "name": "Chad",
    "nameVi": "Chad",
    "flag": "🇹🇩"
  },
  {
    "code": "CL",
    "name": "Chile",
    "nameVi": "Chile",
    "flag": "🇨🇱"
  },
  {
    "code": "CN",
    "name": "China",
    "nameVi": "Trung Quốc",
    "flag": "🇨🇳"
  },
  {
    "code": "CX",
    "name": "Christmas Island",
    "nameVi": "Đảo Giáng Sinh",
    "flag": "🇨🇽"
  },
  {
    "code": "CC",
    "name": "Cocos (Keeling) Islands",
    "nameVi": "Quần đảo Cocos (Keeling)",
    "flag": "🇨🇨"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "nameVi": "Colombia",
    "flag": "🇨🇴"
  },
  {
    "code": "KM",
    "name": "Comoros",
    "nameVi": "Comoros",
    "flag": "🇰🇲"
  },
  {
    "code": "CG",
    "name": "Congo - Brazzaville",
    "nameVi": "Congo - Brazzaville",
    "flag": "🇨🇬"
  },
  {
    "code": "CD",
    "name": "Congo - Kinshasa",
    "nameVi": "Congo - Kinshasa",
    "flag": "🇨🇩"
  },
  {
    "code": "CK",
    "name": "Cook Islands",
    "nameVi": "Quần đảo Cook",
    "flag": "🇨🇰"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "nameVi": "Costa Rica",
    "flag": "🇨🇷"
  },
  {
    "code": "CI",
    "name": "Côte d’Ivoire",
    "nameVi": "Côte d’Ivoire",
    "flag": "🇨🇮"
  },
  {
    "code": "HR",
    "name": "Croatia",
    "nameVi": "Croatia",
    "flag": "🇭🇷"
  },
  {
    "code": "CU",
    "name": "Cuba",
    "nameVi": "Cuba",
    "flag": "🇨🇺"
  },
  {
    "code": "CW",
    "name": "Curaçao",
    "nameVi": "Curaçao",
    "flag": "🇨🇼"
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "nameVi": "Síp",
    "flag": "🇨🇾"
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "nameVi": "Séc (Cộng hòa Séc)",
    "flag": "🇨🇿"
  },
  {
    "code": "DK",
    "name": "Denmark",
    "nameVi": "Đan Mạch",
    "flag": "🇩🇰"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "nameVi": "Djibouti",
    "flag": "🇩🇯"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "nameVi": "Dominica",
    "flag": "🇩🇲"
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "nameVi": "Cộng hòa Dominica",
    "flag": "🇩🇴"
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "nameVi": "Ecuador",
    "flag": "🇪🇨"
  },
  {
    "code": "EG",
    "name": "Egypt",
    "nameVi": "Ai Cập",
    "flag": "🇪🇬"
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "nameVi": "El Salvador",
    "flag": "🇸🇻"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "nameVi": "Guinea Xích Đạo",
    "flag": "🇬🇶"
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "nameVi": "Eritrea",
    "flag": "🇪🇷"
  },
  {
    "code": "EE",
    "name": "Estonia",
    "nameVi": "Estonia",
    "flag": "🇪🇪"
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "nameVi": "Eswatini",
    "flag": "🇸🇿"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "nameVi": "Ethiopia",
    "flag": "🇪🇹"
  },
  {
    "code": "FK",
    "name": "Falkland Islands",
    "nameVi": "Quần đảo Falkland",
    "flag": "🇫🇰"
  },
  {
    "code": "FO",
    "name": "Faroe Islands",
    "nameVi": "Quần đảo Faroe",
    "flag": "🇫🇴"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "nameVi": "Fiji",
    "flag": "🇫🇯"
  },
  {
    "code": "FI",
    "name": "Finland",
    "nameVi": "Phần Lan",
    "flag": "🇫🇮"
  },
  {
    "code": "FR",
    "name": "France",
    "nameVi": "Pháp",
    "flag": "🇫🇷"
  },
  {
    "code": "GF",
    "name": "French Guiana",
    "nameVi": "Guiana thuộc Pháp",
    "flag": "🇬🇫"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "nameVi": "Polynesia thuộc Pháp",
    "flag": "🇵🇫"
  },
  {
    "code": "TF",
    "name": "French Southern Territories",
    "nameVi": "Lãnh thổ phía Nam Thuộc Pháp",
    "flag": "🇹🇫"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "nameVi": "Gabon",
    "flag": "🇬🇦"
  },
  {
    "code": "GM",
    "name": "Gambia",
    "nameVi": "Gambia",
    "flag": "🇬🇲"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "nameVi": "Georgia",
    "flag": "🇬🇪"
  },
  {
    "code": "DE",
    "name": "Germany",
    "nameVi": "Đức",
    "flag": "🇩🇪"
  },
  {
    "code": "GH",
    "name": "Ghana",
    "nameVi": "Ghana",
    "flag": "🇬🇭"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "nameVi": "Gibraltar",
    "flag": "🇬🇮"
  },
  {
    "code": "GR",
    "name": "Greece",
    "nameVi": "Hy Lạp",
    "flag": "🇬🇷"
  },
  {
    "code": "GL",
    "name": "Greenland",
    "nameVi": "Greenland",
    "flag": "🇬🇱"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "nameVi": "Grenada",
    "flag": "🇬🇩"
  },
  {
    "code": "GP",
    "name": "Guadeloupe",
    "nameVi": "Guadeloupe",
    "flag": "🇬🇵"
  },
  {
    "code": "GU",
    "name": "Guam",
    "nameVi": "Guam",
    "flag": "🇬🇺"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "nameVi": "Guatemala",
    "flag": "🇬🇹"
  },
  {
    "code": "GG",
    "name": "Guernsey",
    "nameVi": "Guernsey",
    "flag": "🇬🇬"
  },
  {
    "code": "GN",
    "name": "Guinea",
    "nameVi": "Guinea",
    "flag": "🇬🇳"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "nameVi": "Guinea-Bissau",
    "flag": "🇬🇼"
  },
  {
    "code": "GY",
    "name": "Guyana",
    "nameVi": "Guyana",
    "flag": "🇬🇾"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "nameVi": "Haiti",
    "flag": "🇭🇹"
  },
  {
    "code": "HM",
    "name": "Heard & McDonald Islands",
    "nameVi": "Quần đảo Heard và McDonald",
    "flag": "🇭🇲"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "nameVi": "Honduras",
    "flag": "🇭🇳"
  },
  {
    "code": "HK",
    "name": "Hong Kong SAR China",
    "nameVi": "Đặc khu Hành chính Hồng Kông, Trung Quốc",
    "flag": "🇭🇰"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "nameVi": "Hungary",
    "flag": "🇭🇺"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "nameVi": "Iceland",
    "flag": "🇮🇸"
  },
  {
    "code": "IN",
    "name": "India",
    "nameVi": "Ấn Độ",
    "flag": "🇮🇳"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "nameVi": "Indonesia",
    "flag": "🇮🇩"
  },
  {
    "code": "IR",
    "name": "Iran",
    "nameVi": "Iran",
    "flag": "🇮🇷"
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "nameVi": "Iraq",
    "flag": "🇮🇶"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "nameVi": "Ireland",
    "flag": "🇮🇪"
  },
  {
    "code": "IM",
    "name": "Isle of Man",
    "nameVi": "Đảo Man",
    "flag": "🇮🇲"
  },
  {
    "code": "IL",
    "name": "Israel",
    "nameVi": "Israel",
    "flag": "🇮🇱"
  },
  {
    "code": "IT",
    "name": "Italy",
    "nameVi": "Ý (Italia)",
    "flag": "🇮🇹"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "nameVi": "Jamaica",
    "flag": "🇯🇲"
  },
  {
    "code": "JP",
    "name": "Japan",
    "nameVi": "Nhật Bản",
    "flag": "🇯🇵"
  },
  {
    "code": "JE",
    "name": "Jersey",
    "nameVi": "Jersey",
    "flag": "🇯🇪"
  },
  {
    "code": "JO",
    "name": "Jordan",
    "nameVi": "Jordan",
    "flag": "🇯🇴"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "nameVi": "Kazakhstan",
    "flag": "🇰🇿"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "nameVi": "Kenya",
    "flag": "🇰🇪"
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "nameVi": "Kiribati",
    "flag": "🇰🇮"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "nameVi": "Kuwait",
    "flag": "🇰🇼"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "nameVi": "Kyrgyzstan",
    "flag": "🇰🇬"
  },
  {
    "code": "LA",
    "name": "Laos",
    "nameVi": "Lào",
    "flag": "🇱🇦"
  },
  {
    "code": "LV",
    "name": "Latvia",
    "nameVi": "Latvia",
    "flag": "🇱🇻"
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "nameVi": "Li-băng",
    "flag": "🇱🇧"
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "nameVi": "Lesotho",
    "flag": "🇱🇸"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "nameVi": "Liberia",
    "flag": "🇱🇷"
  },
  {
    "code": "LY",
    "name": "Libya",
    "nameVi": "Libya",
    "flag": "🇱🇾"
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "nameVi": "Liechtenstein",
    "flag": "🇱🇮"
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "nameVi": "Litva",
    "flag": "🇱🇹"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "nameVi": "Luxembourg",
    "flag": "🇱🇺"
  },
  {
    "code": "MO",
    "name": "Macao SAR China",
    "nameVi": "Đặc khu Hành chính Macao, Trung Quốc",
    "flag": "🇲🇴"
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "nameVi": "Madagascar",
    "flag": "🇲🇬"
  },
  {
    "code": "MW",
    "name": "Malawi",
    "nameVi": "Malawi",
    "flag": "🇲🇼"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "nameVi": "Malaysia",
    "flag": "🇲🇾"
  },
  {
    "code": "MV",
    "name": "Maldives",
    "nameVi": "Maldives",
    "flag": "🇲🇻"
  },
  {
    "code": "ML",
    "name": "Mali",
    "nameVi": "Mali",
    "flag": "🇲🇱"
  },
  {
    "code": "MT",
    "name": "Malta",
    "nameVi": "Malta",
    "flag": "🇲🇹"
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "nameVi": "Quần đảo Marshall",
    "flag": "🇲🇭"
  },
  {
    "code": "MQ",
    "name": "Martinique",
    "nameVi": "Martinique",
    "flag": "🇲🇶"
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "nameVi": "Mauritania",
    "flag": "🇲🇷"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "nameVi": "Mauritius",
    "flag": "🇲🇺"
  },
  {
    "code": "YT",
    "name": "Mayotte",
    "nameVi": "Mayotte",
    "flag": "🇾🇹"
  },
  {
    "code": "MX",
    "name": "Mexico",
    "nameVi": "Mexico",
    "flag": "🇲🇽"
  },
  {
    "code": "FM",
    "name": "Micronesia",
    "nameVi": "Micronesia",
    "flag": "🇫🇲"
  },
  {
    "code": "MD",
    "name": "Moldova",
    "nameVi": "Moldova",
    "flag": "🇲🇩"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "nameVi": "Monaco",
    "flag": "🇲🇨"
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "nameVi": "Mông Cổ",
    "flag": "🇲🇳"
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "nameVi": "Montenegro",
    "flag": "🇲🇪"
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "nameVi": "Montserrat",
    "flag": "🇲🇸"
  },
  {
    "code": "MA",
    "name": "Morocco",
    "nameVi": "Ma-rốc",
    "flag": "🇲🇦"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "nameVi": "Mozambique",
    "flag": "🇲🇿"
  },
  {
    "code": "MM",
    "name": "Myanmar (Burma)",
    "nameVi": "Myanmar (Miến Điện)",
    "flag": "🇲🇲"
  },
  {
    "code": "NA",
    "name": "Namibia",
    "nameVi": "Namibia",
    "flag": "🇳🇦"
  },
  {
    "code": "NR",
    "name": "Nauru",
    "nameVi": "Nauru",
    "flag": "🇳🇷"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "nameVi": "Nepal",
    "flag": "🇳🇵"
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "nameVi": "Hà Lan",
    "flag": "🇳🇱"
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "nameVi": "New Caledonia",
    "flag": "🇳🇨"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "nameVi": "New Zealand",
    "flag": "🇳🇿"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "nameVi": "Nicaragua",
    "flag": "🇳🇮"
  },
  {
    "code": "NE",
    "name": "Niger",
    "nameVi": "Niger",
    "flag": "🇳🇪"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "nameVi": "Nigeria",
    "flag": "🇳🇬"
  },
  {
    "code": "NU",
    "name": "Niue",
    "nameVi": "Niue",
    "flag": "🇳🇺"
  },
  {
    "code": "NF",
    "name": "Norfolk Island",
    "nameVi": "Đảo Norfolk",
    "flag": "🇳🇫"
  },
  {
    "code": "KP",
    "name": "North Korea",
    "nameVi": "Triều Tiên",
    "flag": "🇰🇵"
  },
  {
    "code": "MK",
    "name": "North Macedonia",
    "nameVi": "Bắc Macedonia",
    "flag": "🇲🇰"
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "nameVi": "Quần đảo Bắc Mariana",
    "flag": "🇲🇵"
  },
  {
    "code": "NO",
    "name": "Norway",
    "nameVi": "Na Uy",
    "flag": "🇳🇴"
  },
  {
    "code": "OM",
    "name": "Oman",
    "nameVi": "Oman",
    "flag": "🇴🇲"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "nameVi": "Pakistan",
    "flag": "🇵🇰"
  },
  {
    "code": "PW",
    "name": "Palau",
    "nameVi": "Palau",
    "flag": "🇵🇼"
  },
  {
    "code": "PS",
    "name": "Palestinian Territories",
    "nameVi": "Lãnh thổ Palestine",
    "flag": "🇵🇸"
  },
  {
    "code": "PA",
    "name": "Panama",
    "nameVi": "Panama",
    "flag": "🇵🇦"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "nameVi": "Papua New Guinea",
    "flag": "🇵🇬"
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "nameVi": "Paraguay",
    "flag": "🇵🇾"
  },
  {
    "code": "PE",
    "name": "Peru",
    "nameVi": "Peru",
    "flag": "🇵🇪"
  },
  {
    "code": "PH",
    "name": "Philippines",
    "nameVi": "Philippines",
    "flag": "🇵🇭"
  },
  {
    "code": "PN",
    "name": "Pitcairn Islands",
    "nameVi": "Quần đảo Pitcairn",
    "flag": "🇵🇳"
  },
  {
    "code": "PL",
    "name": "Poland",
    "nameVi": "Ba Lan",
    "flag": "🇵🇱"
  },
  {
    "code": "PT",
    "name": "Portugal",
    "nameVi": "Bồ Đào Nha",
    "flag": "🇵🇹"
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "nameVi": "Puerto Rico",
    "flag": "🇵🇷"
  },
  {
    "code": "QA",
    "name": "Qatar",
    "nameVi": "Qatar",
    "flag": "🇶🇦"
  },
  {
    "code": "RE",
    "name": "Réunion",
    "nameVi": "Réunion",
    "flag": "🇷🇪"
  },
  {
    "code": "RO",
    "name": "Romania",
    "nameVi": "Romania",
    "flag": "🇷🇴"
  },
  {
    "code": "RU",
    "name": "Russia",
    "nameVi": "Nga",
    "flag": "🇷🇺"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "nameVi": "Rwanda",
    "flag": "🇷🇼"
  },
  {
    "code": "WS",
    "name": "Samoa",
    "nameVi": "Samoa",
    "flag": "🇼🇸"
  },
  {
    "code": "SM",
    "name": "San Marino",
    "nameVi": "San Marino",
    "flag": "🇸🇲"
  },
  {
    "code": "ST",
    "name": "São Tomé & Príncipe",
    "nameVi": "São Tomé và Príncipe",
    "flag": "🇸🇹"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "nameVi": "Ả Rập Xê-út",
    "flag": "🇸🇦"
  },
  {
    "code": "SN",
    "name": "Senegal",
    "nameVi": "Senegal",
    "flag": "🇸🇳"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "nameVi": "Serbia",
    "flag": "🇷🇸"
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "nameVi": "Seychelles",
    "flag": "🇸🇨"
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "nameVi": "Sierra Leone",
    "flag": "🇸🇱"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "nameVi": "Singapore",
    "flag": "🇸🇬"
  },
  {
    "code": "SX",
    "name": "Sint Maarten",
    "nameVi": "Sint Maarten",
    "flag": "🇸🇽"
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "nameVi": "Slovakia",
    "flag": "🇸🇰"
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "nameVi": "Slovenia",
    "flag": "🇸🇮"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "nameVi": "Quần đảo Solomon",
    "flag": "🇸🇧"
  },
  {
    "code": "SO",
    "name": "Somalia",
    "nameVi": "Somalia",
    "flag": "🇸🇴"
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "nameVi": "Nam Phi",
    "flag": "🇿🇦"
  },
  {
    "code": "GS",
    "name": "South Georgia & South Sandwich Islands",
    "nameVi": "Nam Georgia & Quần đảo Nam Sandwich",
    "flag": "🇬🇸"
  },
  {
    "code": "KR",
    "name": "South Korea",
    "nameVi": "Hàn Quốc",
    "flag": "🇰🇷"
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "nameVi": "Nam Sudan",
    "flag": "🇸🇸"
  },
  {
    "code": "ES",
    "name": "Spain",
    "nameVi": "Tây Ban Nha",
    "flag": "🇪🇸"
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "nameVi": "Sri Lanka",
    "flag": "🇱🇰"
  },
  {
    "code": "BL",
    "name": "St. Barthélemy",
    "nameVi": "St. Barthélemy",
    "flag": "🇧🇱"
  },
  {
    "code": "SH",
    "name": "St. Helena",
    "nameVi": "St. Helena",
    "flag": "🇸🇭"
  },
  {
    "code": "KN",
    "name": "St. Kitts & Nevis",
    "nameVi": "St. Kitts và Nevis",
    "flag": "🇰🇳"
  },
  {
    "code": "LC",
    "name": "St. Lucia",
    "nameVi": "St. Lucia",
    "flag": "🇱🇨"
  },
  {
    "code": "MF",
    "name": "St. Martin",
    "nameVi": "St. Martin",
    "flag": "🇲🇫"
  },
  {
    "code": "PM",
    "name": "St. Pierre & Miquelon",
    "nameVi": "Saint Pierre và Miquelon",
    "flag": "🇵🇲"
  },
  {
    "code": "VC",
    "name": "St. Vincent & Grenadines",
    "nameVi": "St. Vincent và Grenadines",
    "flag": "🇻🇨"
  },
  {
    "code": "SD",
    "name": "Sudan",
    "nameVi": "Sudan",
    "flag": "🇸🇩"
  },
  {
    "code": "SR",
    "name": "Suriname",
    "nameVi": "Suriname",
    "flag": "🇸🇷"
  },
  {
    "code": "SJ",
    "name": "Svalbard & Jan Mayen",
    "nameVi": "Svalbard và Jan Mayen",
    "flag": "🇸🇯"
  },
  {
    "code": "SE",
    "name": "Sweden",
    "nameVi": "Thụy Điển",
    "flag": "🇸🇪"
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "nameVi": "Thụy Sĩ",
    "flag": "🇨🇭"
  },
  {
    "code": "SY",
    "name": "Syria",
    "nameVi": "Syria",
    "flag": "🇸🇾"
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "nameVi": "Đài Loan",
    "flag": "🇹🇼"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "nameVi": "Tajikistan",
    "flag": "🇹🇯"
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "nameVi": "Tanzania",
    "flag": "🇹🇿"
  },
  {
    "code": "TH",
    "name": "Thailand",
    "nameVi": "Thái Lan",
    "flag": "🇹🇭"
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "nameVi": "Timor-Leste",
    "flag": "🇹🇱"
  },
  {
    "code": "TG",
    "name": "Togo",
    "nameVi": "Togo",
    "flag": "🇹🇬"
  },
  {
    "code": "TK",
    "name": "Tokelau",
    "nameVi": "Tokelau",
    "flag": "🇹🇰"
  },
  {
    "code": "TO",
    "name": "Tonga",
    "nameVi": "Tonga",
    "flag": "🇹🇴"
  },
  {
    "code": "TT",
    "name": "Trinidad & Tobago",
    "nameVi": "Trinidad và Tobago",
    "flag": "🇹🇹"
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "nameVi": "Tunisia",
    "flag": "🇹🇳"
  },
  {
    "code": "TR",
    "name": "Türkiye",
    "nameVi": "Thổ Nhĩ Kỳ",
    "flag": "🇹🇷"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "nameVi": "Turkmenistan",
    "flag": "🇹🇲"
  },
  {
    "code": "TC",
    "name": "Turks & Caicos Islands",
    "nameVi": "Quần đảo Turks và Caicos",
    "flag": "🇹🇨"
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "nameVi": "Tuvalu",
    "flag": "🇹🇻"
  },
  {
    "code": "UM",
    "name": "U.S. Outlying Islands",
    "nameVi": "Các tiểu đảo xa của Hoa Kỳ",
    "flag": "🇺🇲"
  },
  {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "nameVi": "Quần đảo Virgin thuộc Hoa Kỳ",
    "flag": "🇻🇮"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "nameVi": "Uganda",
    "flag": "🇺🇬"
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "nameVi": "Ukraine",
    "flag": "🇺🇦"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "nameVi": "Các Tiểu Vương quốc Ả Rập Thống nhất",
    "flag": "🇦🇪"
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "nameVi": "Vương quốc Anh",
    "flag": "🇬🇧"
  },
  {
    "code": "US",
    "name": "United States",
    "nameVi": "Hoa Kỳ (Mỹ)",
    "flag": "🇺🇸"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "nameVi": "Uruguay",
    "flag": "🇺🇾"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "nameVi": "Uzbekistan",
    "flag": "🇺🇿"
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "nameVi": "Vanuatu",
    "flag": "🇻🇺"
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "nameVi": "Thành Vatican",
    "flag": "🇻🇦"
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "nameVi": "Venezuela",
    "flag": "🇻🇪"
  },
  {
    "code": "WF",
    "name": "Wallis & Futuna",
    "nameVi": "Wallis và Futuna",
    "flag": "🇼🇫"
  },
  {
    "code": "EH",
    "name": "Western Sahara",
    "nameVi": "Tây Sahara",
    "flag": "🇪🇭"
  },
  {
    "code": "YE",
    "name": "Yemen",
    "nameVi": "Yemen",
    "flag": "🇾🇪"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "nameVi": "Zambia",
    "flag": "🇿🇲"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "nameVi": "Zimbabwe",
    "flag": "🇿🇼"
  }
];

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
    .replace(/[\u0300-\u036f]/g, '')
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
  return `${country.flag} ${country.name} (${country.code})`;
}
