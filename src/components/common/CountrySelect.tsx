import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Globe } from 'lucide-react';
import {
  ALL_COUNTRIES,
  CountryOption,
  getCountryByCode,
  searchCountries,
  formatCountryLabel,
} from '../../data/countries';

export interface CountrySelectProps {
  value?: string; // ISO 2-letter code (ví dụ: 'VN', 'US', 'FR')
  onChange: (country: CountryOption) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value = 'VN',
  onChange,
  label,
  placeholder = 'Chọn quốc gia...',
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Lấy thông tin quốc gia hiện tại được chọn
  const selectedCountry = useMemo(() => getCountryByCode(value), [value]);

  // Lọc danh sách quốc gia theo từ khóa tìm kiếm
  const filteredCountries = useMemo(() => {
    return searchCountries(searchQuery, ALL_COUNTRIES);
  }, [searchQuery]);

  // Tự động focus ô tìm kiếm khi mở dropdown
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click outside để tự động đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Đảm bảo item đang highlight luôn trong tầm nhìn (scroll into view)
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeElement = listRef.current.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (country: CountryOption) => {
    onChange(country);
    setIsOpen(false);
  };

  // Xử lý phím mũi tên và Enter để chọn nhanh
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCountries.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCountries.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelect(filteredCountries[highlightedIndex]);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {label && (
        <label className="block text-slate-300 font-semibold mb-1 text-sm">
          {label}
        </label>
      )}

      {/* TRIGGER BUTTON */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3 py-2 bg-[#0B0F19] border ${
          isOpen ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-700 hover:border-slate-600'
        } rounded-xl text-white outline-none font-semibold text-left flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className="text-xl select-none shrink-0" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="text-white text-sm truncate font-medium">
            {selectedCountry.name}
          </span>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
            {selectedCountry.code}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-orange-400' : ''
          }`}
        />
      </button>

      {/* DROPDOWN POPUP */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '280px' }}
        >
          {/* SEARCH INPUT BAR */}
          <div className="p-2.5 bg-[#0B0F19] border-b border-slate-800 flex items-center gap-2 sticky top-0 z-10">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tìm theo tên quốc gia, mã ISO (VN, US...) hoặc tiếng Việt..."
              className="w-full bg-transparent text-white text-xs placeholder:text-slate-500 outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHighlightedIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* LIST OF COUNTRIES */}
          <div
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-64 overflow-y-auto divide-y divide-slate-800/40 overscroll-contain"
          >
            {filteredCountries.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 space-y-1">
                <Globe className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                <p>Không tìm thấy quốc gia phù hợp với</p>
                <p className="text-orange-400 font-bold truncate">"{searchQuery}"</p>
              </div>
            ) : (
              <>
                {/* Khi không search: Hiện nhãn phân biệt cho Việt Nam (Ưu tiên) */}
                {!searchQuery && (
                  <div className="px-3 py-1 bg-slate-900/60 border-b border-slate-800/60 text-[10px] font-bold text-orange-400/90 tracking-wider uppercase flex items-center justify-between">
                    <span>Quốc gia ưu tiên</span>
                    <span>⭐ Ghim</span>
                  </div>
                )}

                {filteredCountries.map((country, idx) => {
                  const isSelected = country.code === selectedCountry.code;
                  const isHighlighted = idx === highlightedIndex;

                  // Thêm phân cách sau Việt Nam khi đang ở chế độ xem toàn bộ (không search)
                  const showAllSeparator = !searchQuery && idx === 1;

                  return (
                    <React.Fragment key={country.code}>
                      {showAllSeparator && (
                        <div className="px-3 py-1 bg-slate-900/60 border-b border-slate-800/60 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                          Tất cả quốc gia (A-Z) · {ALL_COUNTRIES.length - 1} quốc gia
                        </div>
                      )}

                      <div
                        data-index={idx}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(country)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`px-3.5 py-2 flex items-center justify-between text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-500/15 text-orange-400'
                            : isHighlighted
                            ? 'bg-slate-800/90 text-white'
                            : 'text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-xl select-none shrink-0" role="img" aria-label={country.name}>
                            {country.flag}
                          </span>
                          <div className="flex flex-col truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className={`text-xs truncate ${
                                  isSelected ? 'font-bold text-orange-400' : 'font-medium text-white'
                                }`}
                              >
                                {country.name}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                                ({country.code})
                              </span>
                            </div>
                            {country.nameVi && country.nameVi !== country.name && (
                              <span className="text-[10px] text-slate-400 truncate">
                                {country.nameVi}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-orange-400 shrink-0 ml-2" />
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>

          {/* FOOTER BAR */}
          <div className="px-3 py-1.5 bg-[#0B0F19] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {filteredCountries.length} / {ALL_COUNTRIES.length} quốc gia
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Dùng phím ↑ ↓ để duyệt, Enter để chọn
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
