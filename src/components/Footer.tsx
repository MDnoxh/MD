
import { MD_CONFIG } from '../config';

interface FooterProps {
    setActiveTab: (tab: string) => void;
    onLogin?: () => void;
    hiddenTabs?: string[];
}

export default function Footer({ setActiveTab, onLogin, hiddenTabs = [] }: FooterProps) {
  const infoLinks = [
      { name: 'Về MD HOME SMART PHỐ HIẾN', tab: 'Giới Thiệu' },
      { name: 'Tin tức', tab: 'Tin Tức' },
      { name: 'Tuyển dụng', tab: 'Tuyển Dụng' },
      { name: 'Liên hệ', tab: 'Liên Hệ' },
  ].filter(link => !hiddenTabs.includes(link.tab));

  const projectLinks = [
      { name: 'MD HOME SMART PHỐ HIẾN', tab: 'Dự Án' },
      { name: 'Chung Cư Phố Hiến', tab: 'Dự Án' },
      { name: 'Nhà Ở Xã Hội Phố Hiến', tab: 'Dự Án' },
      { name: 'Căn Hộ Phố Hiến', tab: 'Dự Án' },
      { name: 'Khu Đô Thị Phố Hiến', tab: 'Dự Án' },
  ];

  return (
      <footer className="bg-[#2a1b15] text-white p-12">
        <div className="max-w-[1536px] mx-auto w-full px-2 xs:px-4 sm:px-6 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-[#c9a227] mb-4">{MD_CONFIG.name}</h3>
            <p className="mb-2">Thành viên của Vinhome</p>
            <p className="mb-4">Chất Lượng – An Tâm – Bền Vững | An cư hôm nay – Vững Chắc Tương Lai</p>
            <p>📍 Phố Hiến, Hưng Yên</p>
            <p>📞 {MD_CONFIG.hotline1}</p>
            <p>📞 {MD_CONFIG.hotline2}</p>
            <p>✉️ {MD_CONFIG.email}</p>
            <a href="https://mdhomesmart.com.vn/" className="block hover:text-[#c9a227]">🌐 https://mdhomesmart.com.vn/</a>
            <a 
              href="https://youtube.com/@ducxuan4021?si=TPwMUucjoUhXfdWD" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mt-1 flex items-center gap-1.5 hover:text-rose-400 transition-colors duration-200"
            >
              <svg className="w-4 h-4 fill-current text-rose-500" viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>YouTube: Nhà Ở Xã Hội - MĐ</span>
            </a>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">THÔNG TIN CÔNG TY</h4>
            {infoLinks.map(link => (
                <button key={link.name} onClick={() => setActiveTab(link.tab)} className="block mb-2 hover:text-[#c9a227] text-left">
                    {'>'} {link.name}
                </button>
            ))}
          </div>

          <div>
            <h4 className="font-bold mb-4">CÁC DỰ ÁN NỔI BẬT</h4>
             {projectLinks.map(link => (
                <button key={link.name} onClick={() => setActiveTab(link.tab)} className="block mb-2 hover:text-[#c9a227] text-left">
                    {'>'} {link.name}
                </button>
            ))}
          </div>
        </div>
        
        {/* Bottom bar with copyright and admin access */}
        <div className="container mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-sans">
          <p>© {new Date().getFullYear()} MD HOME SMART. Thiết kế chuyên nghiệp. Bảo lưu mọi quyền.</p>
          {onLogin && (
            <button 
              onClick={onLogin}
              className="hover:text-[#c9a227] transition-all flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
              title="Cổng thông tin quản trị hệ thống"
            >
              <span>🔑</span>
              <span>Quản trị viên</span>
            </button>
          )}
        </div>
      </footer>
  );
}
