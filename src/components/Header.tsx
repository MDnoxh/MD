import React, { useState, useEffect } from 'react';
import { MD_CONFIG } from '../config';
import { Menu, X, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogin: () => void;
  tabs: string[];
  adminLoggedIn?: boolean;
  onLogout?: () => void;
  isEditingText?: boolean;
  setIsEditingText?: (val: boolean) => void;
  isEditingImages?: boolean;
  setIsEditingImages?: (val: boolean) => void;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onLogin, 
  tabs, 
  adminLoggedIn, 
  onLogout,
  isEditingText,
  setIsEditingText,
  isEditingImages,
  setIsEditingImages
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Smooth scroll tracking to add glassy styling and shadow on page scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    
    // Cuộn lên đầu trang ngay lập tức để nội dung tab mới hiển thị hoàn toàn, không bị che khuất
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  const handleCtaClick = () => {
    // Navigate directly to standard "Đăng Ký Mua" tab to fulfill consultation requests
    setActiveTab('Đăng Ký Mua');
    setIsMobileMenuOpen(false);
    
    // Cuộn lên đầu trang ngay lập tức
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  return (
    <header 
      style={{ contentVisibility: 'auto' }}
      className={`sticky top-0 z-50 transition-all duration-350 ${
        isScrolled 
          ? 'bg-[#1a3c6e]/95 backdrop-blur-md shadow-lg border-b border-white/5 py-2 rounded-b-2xl' 
          : 'bg-[#1a3c6e] py-3 border-b border-white/15'
      }`}
    >
      <div className="max-w-[1536px] mx-auto w-full px-2 xs:px-4 sm:px-6 md:px-8 flex justify-between items-center">
        
        {/* Left: Premium Multi-Line Brand Logo & Subtitle */}
        <div 
          onClick={() => handleTabClick('Trang Chủ')}
          className="flex items-center gap-1.5 sm:gap-3 cursor-pointer group select-none"
        >
          {/* Hexagonal Gold Crest Icon */}
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 h-9 bg-gradient-to-br from-[#c9a227] to-amber-600 rounded-xl shadow group-hover:scale-105 transition-all duration-300">
            <span className="text-white font-extrabold text-base sm:text-xl leading-none">🏠</span>
            <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9a227] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-450"></span>
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-[13.5px] font-black text-white tracking-wider uppercase leading-tight group-hover:text-amber-400 transition-colors duration-250 font-sans whitespace-nowrap">
                MD HOME SMART <span className="hidden sm:inline">PHỐ HIẾN</span>
              </span>
              <ShieldCheck size={11} className="text-amber-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Center: Navigation Menu (Desktop Only) */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 text-[12.5px] xl:text-[13px] font-bold font-sans">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer uppercase tracking-wider relative group ${
                activeTab === tab 
                  ? 'bg-amber-500/10 text-amber-400 font-extrabold shadow-sm' 
                  : 'text-white/90 hover:text-amber-400 hover:bg-white/5'
              }`}
            >
              <span>{tab}</span>
              {/* Bottom active line transition */}
              <span className={`absolute bottom-0 left-2.5 right-2.5 h-0.5 bg-amber-400 rounded transition-transform duration-300 ${
                activeTab === tab ? 'scale-100' : 'scale-0 group-hover:scale-50'
              }`}></span>
            </button>
          ))}
        </nav>

        {/* Right: Lead & Admin CTA Options (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-2.5">
          {/* Golden CTA Button */}
          <button 
            onClick={handleCtaClick}
            className="bg-gradient-to-r from-[#c9a227] to-amber-550 hover:from-amber-550 hover:to-[#c9a227] active:scale-98 text-white font-extrabold text-[11px] xl:text-xs py-2.5 px-4 rounded-xl shadow transition-all duration-250 cursor-pointer flex items-center gap-1.5 border border-amber-400/20 uppercase tracking-widest"
          >
            <span>📋</span>
            <span>Đăng Ký Tư Vấn</span>
          </button>

          {/* Admin Control Login/Logout Button */}
          {adminLoggedIn && (
            <button 
              onClick={() => {
                if (setIsEditingText && setIsEditingImages) {
                  const current = !!(isEditingText || isEditingImages);
                  setIsEditingText(!current);
                  setIsEditingImages(!current);
                }
              }}
              className={`font-extrabold text-[11px] xl:text-xs py-2.5 px-3.5 rounded-xl border transition-all duration-250 cursor-pointer flex items-center gap-1.5 uppercase tracking-widest ${
                (isEditingText || isEditingImages)
                  ? 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
              }`}
              title="Bật/Tắt chế độ chỉnh sửa giao diện nhanh trực tiếp"
            >
              <span>{isEditingText || isEditingImages ? '🔴 TẮT SỬA' : '✍️ BẬT SỬA'}</span>
            </button>
          )}

          {adminLoggedIn ? (
            <button 
              onClick={onLogout}
              className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[11px] xl:text-xs py-2.5 px-3.5 rounded-xl border border-rose-500 transition-all duration-250 cursor-pointer flex items-center gap-1.5 uppercase tracking-widest"
              title="Đăng xuất khỏi quyền quản trị"
            >
              <span>🔒</span>
              <span>Đăng xuất</span>
            </button>
          ) : (
            <button 
              onClick={onLogin}
              className="bg-white/10 hover:bg-white/15 active:scale-98 text-white font-extrabold text-[11px] xl:text-xs py-2.5 px-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-250 cursor-pointer flex items-center gap-1.5 uppercase tracking-widest"
              title="Đăng nhập quản trị hệ thống"
            >
              <span>🔑</span>
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Hamburger & Action Toggles (Mobile and Tablet Only) */}
        <div className="flex lg:hidden items-center gap-2">
          {/* Mobile Admin entrance / exit */}
          {adminLoggedIn && (
            <button 
              onClick={() => {
                if (setIsEditingText && setIsEditingImages) {
                  const current = !!(isEditingText || isEditingImages);
                  setIsEditingText(!current);
                  setIsEditingImages(!current);
                }
              }}
              className={`font-extrabold text-[11px] py-2 px-3 rounded-xl border transition-all duration-250 cursor-pointer flex items-center gap-1 uppercase tracking-wider ${
                (isEditingText || isEditingImages)
                  ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-700 border-slate-600 text-slate-200'
              }`}
              title="Bật/Tắt chế độ chỉnh sửa"
            >
              <span>{isEditingText || isEditingImages ? '🔴 TẮT' : '✍️ SỬA'}</span>
            </button>
          )}

          {adminLoggedIn ? (
            <button 
              onClick={onLogout} 
              className="bg-rose-600 hover:bg-rose-700 border border-rose-500 active:scale-95 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl flex items-center gap-1 transition-all text-center cursor-pointer uppercase tracking-wider font-sans"
              title="Sửa / Đăng xuất Admin"
            >
              <span>🔒</span>
              <span>Đăng xuất</span>
            </button>
          ) : (
            <button 
              onClick={onLogin} 
              className="bg-white/10 hover:bg-white/15 border border-white/15 active:scale-95 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl flex items-center gap-1 transition-all text-center cursor-pointer uppercase tracking-wider font-sans"
              title="Admin Login"
            >
              <span>🔑</span>
              <span>Admin</span>
            </button>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-9 h-9 bg-white/5 border border-white/10 hover:border-amber-500/30 rounded-xl flex items-center justify-center transition-all hover:bg-white/10 text-white cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} className="text-amber-400" /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile & Tablet Dropdown Drawer with Touch Targets */}
      <div 
        className={`lg:hidden transition-all duration-350 ease-in-out ${
          isMobileMenuOpen 
            ? 'max-h-[85vh] overflow-y-auto border-t border-white/5 mt-2.5' 
            : 'max-h-0 overflow-hidden'
        }`}
      >
        <div className="bg-[#152e55] px-4 py-4 space-y-3.5 shadow-inner">
          <nav className="flex flex-col gap-1 font-sans">
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`w-full text-left font-bold py-2.5 px-4 rounded-xl transition text-xs cursor-pointer uppercase tracking-wider ${
                  activeTab === tab 
                    ? 'bg-amber-500 text-white font-extrabold shadow' 
                    : 'text-white/90 hover:bg-white/5 hover:text-amber-400'
                }`}
                style={{ minHeight: '44px' }}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="border-t border-white/5 pt-3.5 flex flex-col gap-2">
            <button 
              onClick={handleCtaClick}
              className="w-full bg-[#c9a227] hover:bg-amber-600 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer uppercase tracking-wider"
              style={{ minHeight: '44px' }}
            >
              <span>📋</span>
              <span>Đăng Ký Tư Vấn</span>
            </button>

            {adminLoggedIn ? (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                style={{ minHeight: '44px' }}
              >
                <span>🔒</span>
                <span>Thoát Quyền Admin</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogin();
                }}
                className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/15 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                style={{ minHeight: '44px' }}
              >
                <span>🔑</span>
                <span>Cổng Admin Quản Trị</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
