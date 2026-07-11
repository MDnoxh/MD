import React, { useState } from 'react';
import { 
  X, Save, ShieldAlert, Type, Image as ImageIcon, Briefcase, 
  Video, Settings, Download, RefreshCw, Trash2, Check, 
  EyeOff, Eye, Plus, Layout, Phone, Mail, Clock, MapPin, 
  Sparkles, List, Info, Database, AlertTriangle
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  details: string;
  date: string;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  isEditingText: boolean;
  setIsEditingText: (val: boolean) => void;
  isEditingImages: boolean;
  setIsEditingImages: (val: boolean) => void;
  customText: Record<string, string>;
  setCustomText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customImages: Record<string, string>;
  setCustomImages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
  unifiedLeads: Lead[];
  handleDeleteLead: (id: string) => void;
  leadSearchTerm: string;
  setLeadSearchTerm: (val: string) => void;
  handleExcelDownload: () => void;
  sheetLeads: { cols: string[], rows: any[], sheetId: string } | null;
  sheetLoading: boolean;
  sheetError: string | null;
  fetchSheetLeads: () => void;
  positions: any[];
  setPositions: React.Dispatch<React.SetStateAction<any[]>>;
  videos: any[];
  setVideos: React.Dispatch<React.SetStateAction<any[]>>;
  hiddenTabs: string[];
  setHiddenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  TABS: string[];
  adminUsers: Array<{email: string; password: string; role: string}>;
  setAdminUsers: React.Dispatch<React.SetStateAction<Array<{email: string; password: string; role: string}>>>;
  currentAdminEmail: string;
}

const SUPER_ADMIN_ROLE = 'Quản trị viên tối cao (Super Admin)';

export default function AdminDashboard({
  isOpen,
  onClose,
  isEditingText,
  setIsEditingText,
  isEditingImages,
  setIsEditingImages,
  customText,
  setCustomText,
  customImages,
  setCustomImages,
  leads,
  setLeads,
  unifiedLeads,
  handleDeleteLead,
  leadSearchTerm,
  setLeadSearchTerm,
  handleExcelDownload,
  sheetLeads,
  sheetLoading,
  sheetError,
  fetchSheetLeads,
  positions,
  setPositions,
  videos,
  setVideos,
  hiddenTabs,
  setHiddenTabs,
  TABS,
  adminUsers,
  setAdminUsers,
  currentAdminEmail
}: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'content' | 'jobs' | 'videos' | 'settings' | 'admins'>('leads');

  // Chỉ Quản trị viên tối cao (Super Admin) mới được xem/quản lý danh sách admin khác.
  const currentAdmin = adminUsers.find(u => u.email.toLowerCase() === currentAdminEmail.toLowerCase());
  const isSuperAdmin = currentAdmin?.role === SUPER_ADMIN_ROLE;

  // Nếu admin thường đang ở tab "admins" (VD: do state cũ còn sót lại) thì tự động đẩy về tab Khách Hàng.
  React.useEffect(() => {
    if (activeSubTab === 'admins' && !isSuperAdmin) {
      setActiveSubTab('leads');
    }
  }, [activeSubTab, isSuperAdmin]);
  const [leadsSourceFilter, setLeadsSourceFilter] = useState<'all' | 'register' | 'contact' | 'chatbot'>('all');
  const [leadsSubTab, setLeadsSubTab] = useState<'local' | 'sheets'>('local');

  // Form states for adding job
  const [newTitle, setNewTitle] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newExp, setNewExp] = useState('');
  const [newType, setNewType] = useState('Toàn thời gian');
  const [newDesc, setNewDesc] = useState('');
  const [newBenefits, setNewBenefits] = useState('');

  // Form states for adding video
  const [newVidTitle, setNewVidTitle] = useState('');
  const [newVidUrl, setNewVidUrl] = useState('');
  const [newVidDesc, setNewVidDesc] = useState('');

  // Form states for adding administrator
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Quản trị viên thường');

  // States for password visibility and editing existing admin passwords
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingAdminEmail, setEditingAdminEmail] = useState<string | null>(null);
  const [editingAdminPassword, setEditingAdminPassword] = useState<string>('');

  const togglePasswordVisibility = (email: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  const handleStartEditPassword = (email: string, currentPass: string) => {
    setEditingAdminEmail(email);
    setEditingAdminPassword(currentPass);
  };

  const handleSaveNewPassword = (email: string) => {
    if (!editingAdminPassword.trim()) {
      alert("Mật khẩu không được để trống!");
      return;
    }
    const updated = adminUsers.map(user => {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return { ...user, password: editingAdminPassword.trim() };
      }
      return user;
    });
    setAdminUsers(updated);
    setEditingAdminEmail(null);
    alert(`✓ Đã cập nhật mật khẩu mới thành công cho tài khoản: ${email}`);
  };

  const generatePass = () => {
    const words = ['md', 'home', 'smart', 'phohien', 'admin', 'vip', 'staff', 'lead'];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomNumber = Math.floor(100 + Math.random() * 900);
    setNewAdminPassword(`${randomWord}${randomNumber}`);
  };

  React.useEffect(() => {
    if (activeSubTab === 'admins') {
      generatePass();
    }
  }, [activeSubTab]);

  const handleAddNewAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) {
      alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }
    const emailLower = newAdminEmail.trim().toLowerCase();
    
    // Check duplication
    if (adminUsers.some(user => user.email.toLowerCase() === emailLower)) {
      alert("Email này đã được cấp quyền quản trị trước đó!");
      return;
    }

    const updated = [
      ...adminUsers,
      { email: emailLower, password: newAdminPassword.trim(), role: newAdminRole }
    ];
    setAdminUsers(updated);
    
    setNewAdminEmail('');
    generatePass();
    alert(`✓ Đã cấp quyền quản trị thành công cho: ${emailLower}`);
  };

  const handleRemoveAdmin = (email: string) => {
    if (email.toLowerCase() === 'admin@mdhome.com') {
      alert("Không thể xóa tài khoản Quản trị viên tối cao (Super Admin) mặc định!");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn thu hồi quyền quản trị của tài khoản "${email}"?`)) {
      return;
    }
    const updated = adminUsers.filter(user => user.email.toLowerCase() !== email.toLowerCase());
    setAdminUsers(updated);
    alert(`✓ Đã thu hồi quyền quản trị của tài khoản: ${email}`);
  };

  const handleCopyAdminInfo = (user: {email: string, password: string}) => {
    const textToCopy = `Tài khoản quản trị MD HOME SMART:\nEmail: ${user.email}\nMật khẩu: ${user.password}\nĐăng nhập tại: ${window.location.origin}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert("✓ Đã sao chép thông tin đăng nhập vào khay nhớ tạm! Hãy gửi cho người nhận."))
      .catch(() => alert(`Thông tin: Email: ${user.email} | Mật khẩu: ${user.password}`));
  };

  if (!isOpen) return null;

  // Filter local leads based on search and source
  const filteredLocalLeads = unifiedLeads.filter(lead => {
    const s = leadSearchTerm.toLowerCase();
    const matchesSearch = (
      (lead.name && lead.name.toLowerCase().includes(s)) ||
      (lead.phone && lead.phone.includes(s)) ||
      (lead.source && lead.source.toLowerCase().includes(s)) ||
      (lead.details && lead.details.toLowerCase().includes(s))
    );

    if (leadsSourceFilter === 'all') return matchesSearch;
    if (leadsSourceFilter === 'register' && lead.source === 'Đăng Ký Mua') return matchesSearch;
    if (leadsSourceFilter === 'contact' && lead.source === 'Liên Hệ') return matchesSearch;
    if (leadsSourceFilter === 'chatbot' && lead.source === 'Trợ Lý AI Chatbot') return matchesSearch;
    return matchesSearch;
  });

  const handleAddNewJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newQty || !newSalary) {
      alert("Vui lòng nhập đầy đủ các trường cơ bản (Tên công việc, Số lượng, Mức lương)!");
      return;
    }
    const benefitsArray = newBenefits ? newBenefits.split(',').map(b => b.trim()).filter(Boolean) : [
      'Đào tạo miễn phí từ đầu', 
      'Hỗ trợ tệp khách hàng nét', 
      'Thương hiệu uy tín dễ chốt deal'
    ];
    const job = {
      title: newTitle,
      qty: newQty,
      salary: newSalary,
      exp: newExp || 'Không yêu cầu',
      type: newType,
      desc: newDesc || 'Trao đổi chi tiết khi phỏng vấn.',
      benefits: benefitsArray
    };
    const updated = [...positions, job];
    setPositions(updated);
    localStorage.setItem('recruitmentPositions', JSON.stringify(updated));

    // Reset
    setNewTitle('');
    setNewQty('');
    setNewSalary('');
    setNewExp('');
    setNewDesc('');
    setNewBenefits('');
    alert("✓ Đã thêm vị trí tuyển dụng mới thành công!");
  };

  const handleRemoveJob = (index: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa công việc "${positions[index]?.title}"?`)) return;
    const updated = positions.filter((_, i) => i !== index);
    setPositions(updated);
    localStorage.setItem('recruitmentPositions', JSON.stringify(updated));
  };

  const handleAddNewVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVidTitle || !newVidUrl) {
      alert("Vui lòng điền tiêu đề và link video!");
      return;
    }
    const newVideo = {
      title: newVidTitle,
      url: newVidUrl,
      desc: newVidDesc || 'Mô tả ngắn về video.'
    };
    const updated = [...videos, newVideo];
    setVideos(updated);
    localStorage.setItem('communityVideos', JSON.stringify(updated));

    setNewVidTitle('');
    setNewVidUrl('');
    setNewVidDesc('');
    alert("✓ Đã thêm video chia sẻ mới thành công!");
  };

  const handleRemoveVideo = (index: number) => {
    if (!window.confirm(`Bạn có chắc muốn xóa video này?`)) return;
    const updated = videos.filter((_, i) => i !== index);
    setVideos(updated);
    localStorage.setItem('communityVideos', JSON.stringify(updated));
  };

  const handleToggleTabVisibility = (tab: string) => {
    let updated: string[];
    if (hiddenTabs.includes(tab)) {
      updated = hiddenTabs.filter(t => t !== tab);
    } else {
      updated = [...hiddenTabs, tab];
    }
    setHiddenTabs(updated);
    localStorage.setItem('hiddenTabs', JSON.stringify(updated));
  };

  const handleSaveDictionaryText = (key: string, value: string) => {
    setCustomText(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('customText', JSON.stringify(next));
      return next;
    });
  };

  const handleResetAllEdits = () => {
    if (window.confirm("CẢNH BÁO: Hành động này sẽ xóa toàn bộ nội dung chữ & ảnh bạn đã sửa, khôi phục về trạng thái gốc của nhà phát triển. Bạn có chắc muốn khôi phục mặc định?")) {
      localStorage.removeItem('customText');
      localStorage.removeItem('customImages');
      setCustomText({});
      setCustomImages({});
      alert("✓ Đã khôi phục toàn bộ giao diện & nội dung về mặc định của hệ thống!");
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[2000] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans text-slate-800 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden border border-slate-200/50">
        
        {/* Header Dashboard */}
        <div className="bg-gradient-to-r from-slate-900 to-[#1a3c6e] text-white p-4 sm:p-6 flex justify-between items-center shrink-0 border-b border-slate-800 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-amber-500/25">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black uppercase text-sm sm:text-lg tracking-wider text-amber-400">
                  Bảng Quản Trị Hệ Thống
                </h3>
                <span className="bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                  Live
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium font-sans">
                MD HOME SMART PHỐ HIẾN — Cập nhật nội dung & đồng bộ dữ liệu tức thì
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer font-bold shadow-sm"
            title="Đóng Bảng Quản Trị"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dashboard Body layout: Sidebar and content area */}
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden min-h-0">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 p-2 sm:p-3 gap-1 scrollbar-none select-none">
            
            <button 
              onClick={() => setActiveSubTab('leads')}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-nowrap transition cursor-pointer ${
                activeSubTab === 'leads' 
                  ? 'bg-[#1a3c6e] text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Database size={15} />
              <span>Khách Hàng ({unifiedLeads.length})</span>
            </button>

            <button 
              onClick={() => setActiveSubTab('content')}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-nowrap transition cursor-pointer ${
                activeSubTab === 'content' 
                  ? 'bg-[#1a3c6e] text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Type size={15} />
              <span>Sửa Chữ & Sửa Ảnh</span>
            </button>

            <button 
              onClick={() => setActiveSubTab('jobs')}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-nowrap transition cursor-pointer ${
                activeSubTab === 'jobs' 
                  ? 'bg-[#1a3c6e] text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Briefcase size={15} />
              <span>Tuyển Dụng ({positions.length})</span>
            </button>

            <button 
              onClick={() => setActiveSubTab('videos')}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-nowrap transition cursor-pointer ${
                activeSubTab === 'videos' 
                  ? 'bg-[#1a3c6e] text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Video size={15} />
              <span>Quản lý Video ({videos.length})</span>
            </button>

            <button 
              onClick={() => setActiveSubTab('settings')}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-nowrap transition cursor-pointer ${
                activeSubTab === 'settings' 
                  ? 'bg-[#1a3c6e] text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layout size={15} />
              <span>Thiết Lập Menu & Live</span>
            </button>

            {isSuperAdmin && (
              <button 
                onClick={() => setActiveSubTab('admins')}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-nowrap transition cursor-pointer ${
                  activeSubTab === 'admins' 
                    ? 'bg-[#1a3c6e] text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert size={15} />
                <span>Phân Quyền Admin ({adminUsers.length})</span>
              </button>
            )}

            <div className="hidden md:block mt-auto p-4 border-t border-slate-100">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-800 font-sans leading-relaxed">
                <span className="font-bold block">💡 Mẹo nhỏ:</span> 
                Khi bật chế độ chỉnh sửa trực tiếp, bạn có thể click trực tiếp vào văn bản hoặc hình ảnh trên website để thay đổi nội dung ngay tức thì!
              </div>
            </div>

          </div>

          {/* Right Main Content Area */}
          <div className="flex-grow overflow-y-auto p-4 sm:p-6 min-h-0">
            
            {/* SUB-TAB: LEADS */}
            {activeSubTab === 'leads' && (
              <div className="space-y-6">
                
                {/* Header Subtab */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="font-extrabold text-[#1a3c6e] text-base uppercase flex items-center gap-2">
                      <span>📊</span> Cơ Sở Dữ Liệu Khách Hàng Đăng Ký
                    </h4>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Báo cáo dữ liệu từ các Form đăng ký trực tuyến, form liên hệ và Trợ lý AI Chatbot
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 select-none">
                    <button
                      onClick={() => setLeadsSubTab('local')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                        leadsSubTab === 'local'
                          ? 'bg-[#c9a227] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📂 Khách hàng Local ({unifiedLeads.length})
                    </button>
                    <button
                      onClick={() => {
                        setLeadsSubTab('sheets');
                        fetchSheetLeads();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                        leadsSubTab === 'sheets'
                          ? 'bg-[#c9a227] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🟢 Trực Tuyến Google Sheet
                    </button>
                  </div>
                </div>

                {leadsSubTab === 'local' ? (
                  <div className="space-y-4">
                    
                    {/* Filters & Export */}
                    <div className="flex flex-col md:flex-row gap-3">
                      
                      <div className="flex-grow flex items-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl shadow-inner">
                        <span className="text-sm mr-2 select-none">🔍</span>
                        <input 
                          type="text" 
                          value={leadSearchTerm}
                          onChange={(e) => setLeadSearchTerm(e.target.value)}
                          placeholder="Tìm kiếm theo Tên, Số điện thoại, Nguồn..." 
                          className="bg-transparent text-xs w-full focus:outline-none placeholder-slate-400 font-sans font-medium text-slate-700"
                        />
                      </div>

                      <div className="flex gap-2">
                        <select 
                          value={leadsSourceFilter}
                          onChange={(e: any) => setLeadsSourceFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-[#1a3c6e]"
                        >
                          <option value="all">Tất cả nguồn</option>
                          <option value="register">Form Đăng Ký</option>
                          <option value="contact">Form Liên Hệ</option>
                          <option value="chatbot">AI Chatbot</option>
                        </select>

                        <button 
                          onClick={handleExcelDownload}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase px-4 py-2 rounded-2xl transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <Download size={14} />
                          <span>Xuất Excel</span>
                        </button>
                      </div>

                    </div>

                    {/* Table Local */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                            <tr className="text-[#1a3c6e] uppercase text-[10px] tracking-wider font-black select-none">
                              <th className="p-3">Họ và Tên</th>
                              <th className="p-3">Số Điện Thoại</th>
                              <th className="p-3 text-center">Nguồn Bản Ghi</th>
                              <th className="p-3">Chi Tiết Nhu Cầu</th>
                              <th className="p-3">Thời Gian</th>
                              <th className="p-3 text-center">Xóa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLocalLeads.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-12 text-center text-slate-400 font-bold font-sans">
                                  Không tìm thấy dữ liệu khách hàng nào phù hợp với bộ lọc.
                                </td>
                              </tr>
                            ) : (
                              filteredLocalLeads.map((row) => (
                                <tr key={row.id} className="hover:bg-amber-500/5 bg-white border-b border-slate-100 transition font-sans font-semibold text-slate-600">
                                  <td className="p-3 font-bold text-[#1a3c6e]">{row.name}</td>
                                  <td className="p-3 text-emerald-700 font-bold select-all">{row.phone}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                                      row.source === 'Đăng Ký Mua' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                      row.source === 'Tuyển Dụng' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                      row.source === 'Liên Hệ' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                      'bg-purple-50 text-purple-700 border border-purple-100'
                                    }`}>
                                      {row.source}
                                    </span>
                                  </td>
                                  <td className="p-3 max-w-xs md:max-w-md truncate hover:whitespace-normal" title={row.details}>
                                    {row.details}
                                  </td>
                                  <td className="p-3 text-slate-450 text-nowrap">{row.date}</td>
                                  <td className="p-3 text-center">
                                    <button 
                                      onClick={() => handleDeleteLead(row.id)}
                                      className="text-rose-600 hover:text-white hover:bg-rose-600 w-7 h-7 rounded-lg border border-rose-100 flex items-center justify-center transition cursor-pointer"
                                      title="Xóa khách hàng lẻ"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Sheets sync panel */}
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 select-none">
                          <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">Đồng bộ đám mây:</span>
                          {sheetLoading ? (
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-100 animate-pulse flex items-center gap-1">
                              <RefreshCw size={10} className="animate-spin" /> Đang tải...
                            </span>
                          ) : sheetError ? (
                            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-100">🔴 Lỗi kết nối</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">🟢 Đang hoạt động</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-[#1a3c6e] mt-1.5 font-sans">
                          Google Sheet ID liên kết: <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 select-all font-semibold">1RihHFmMVFbncctAWoDTe3c0Y_CVV5CDRqDCHRD0FIg0</span>
                        </p>
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto">
                        <button 
                          onClick={fetchSheetLeads}
                          disabled={sheetLoading}
                          className="flex-grow md:flex-none bg-[#1a3c6e] hover:bg-[#c9a227] disabled:bg-slate-300 text-white font-extrabold text-xs uppercase px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={14} className={sheetLoading ? 'animate-spin' : ''} />
                          <span>Tải lại Sheets</span>
                        </button>
                        
                        <a 
                          href="https://docs.google.com/spreadsheets/d/1RihHFmMVFbncctAWoDTe3c0Y_CVV5CDRqDCHRD0FIg0"
                          target="_blank"
                          rel="noreferrer"
                          className="flex-grow md:flex-none bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-xs uppercase px-4 py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5"
                        >
                          <span>↗️</span> Mở Bảng Tính
                        </a>
                      </div>
                    </div>

                    {sheetError && (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-700 text-xs font-medium font-sans">
                        ⚠️ Lỗi: {sheetError}. Vui lòng kiểm tra quyền chia sẻ của Google Sheet của bạn (phải đổi thành "Bất kỳ ai có liên kết đều có thể xem" - Anyone with link can view).
                      </div>
                    )}

                    {/* Google Sheet Live Report Table */}
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                            <tr className="text-[#1a3c6e] uppercase text-[10px] tracking-wider font-black select-none">
                              {sheetLeads && sheetLeads.cols && sheetLeads.cols.length > 0 ? (
                                sheetLeads.cols.map((col, idx) => (
                                  <th key={idx} className="p-3">{col || `Cột ${idx + 1}`}</th>
                                ))
                              ) : (
                                <>
                                  <th className="p-3">Họ Tên</th>
                                  <th className="p-3">Số Điện Thoại</th>
                                  <th className="p-3">Email</th>
                                  <th className="p-3">Nguồn</th>
                                  <th className="p-3">Nội Dung</th>
                                  <th className="p-3">Thời Gian</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetLoading ? (
                              <tr>
                                <td colSpan={sheetLeads && sheetLeads.cols ? sheetLeads.cols.length : 6} className="p-16 text-center text-slate-500 font-bold font-sans">
                                  <span className="inline-block animate-spin mr-2">🔄</span> Đang nạp dữ liệu trực tiếp từ Google Cloud Sheets...
                                </td>
                              </tr>
                            ) : sheetLeads && sheetLeads.rows && sheetLeads.rows.length > 0 ? (
                              sheetLeads.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50 bg-white border-b border-slate-100 transition font-sans font-semibold text-slate-600">
                                  {row.map((cell: any, cIdx: number) => (
                                    <td key={cIdx} className="p-3">{cell || '-'}</td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-16 text-center text-slate-400 font-bold font-sans">
                                  Chưa tải được dữ liệu. Hãy bấm "Tải lại Sheets" để nạp trực tiếp.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* SUB-TAB: LIVE IN-PLACE EDITING CONTROLS */}
            {activeSubTab === 'content' && (
              <div className="space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="font-extrabold text-[#1a3c6e] text-base uppercase flex items-center gap-2">
                    <span>✍️</span> Quản Lý Chế Độ Chỉnh Sửa Trực Tiếp
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Bật tắt nhanh tính năng chỉnh sửa kéo thả trực tiếp trên giao diện website
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Text Edit Toggle Card */}
                  <div className="border border-slate-150 p-5 rounded-2xl bg-slate-50 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Type className="text-amber-500" size={20} />
                        <span className="font-bold text-sm text-[#1a3c6e]">Sửa Chữ Trực Tiếp (Inline Text Editor)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                        Khi bật, các khu vực văn bản trên web sẽ được khoanh khung viền màu vàng nét đứt. Bạn có thể nhấn trực tiếp vào để nhập chữ mới, sau đó click ra ngoài để lưu tự động.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsEditingText(!isEditingText)}
                      className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        isEditingText 
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-black' 
                          : 'bg-slate-900 text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      {isEditingText ? '🟢 Chế Độ Đang BẬT' : '🔴 Chế Độ Đang TẮT'}
                    </button>
                  </div>

                  {/* Image Edit Toggle Card */}
                  <div className="border border-slate-150 p-5 rounded-2xl bg-slate-50 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="text-blue-500" size={20} />
                        <span className="font-bold text-sm text-[#1a3c6e]">Sửa Ảnh Trực Tiếp (Inline Image Editor)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                        Khi bật, các bức ảnh trên website có thể chỉnh sửa sẽ hiển thị một nút bấm "Thay Ảnh 📸". Click vào đó để đăng tải file từ máy tính lên Cloud ImageKit miễn phí bảo mật.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsEditingImages(!isEditingImages)}
                      className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        isEditingImages 
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300 font-black' 
                          : 'bg-slate-900 text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      {isEditingImages ? '🟢 Chế Độ Đang BẬT' : '🔴 Chế Độ Đang TẮT'}
                    </button>
                  </div>

                </div>

                {/* Central Dictionary Editor */}
                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 select-none">
                    <h5 className="font-bold text-xs uppercase text-slate-500 tracking-wider">
                      📝 Bảng Tra Cứu & Sửa Văn Bản Toàn Hệ Thống
                    </h5>
                    
                    <button
                      onClick={handleResetAllEdits}
                      className="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Khôi phục mặc định</span>
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20 max-h-[250px] overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-600">
                          <th className="p-2.5 w-1/4">Tên Vị Trí (Key ID)</th>
                          <th className="p-2.5 w-3/4">Nội Dung Văn Bản</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'hero_title', label: 'Tiêu đề lớn Trang Chủ' },
                          { key: 'hero_subtitle', label: 'Khẩu hiệu nhỏ Hero' },
                          { key: 'hero_tagline', label: 'Mô tả ngắn Hero' },
                          { key: 'home_intro_title', label: 'Tiêu đề giới thiệu trang chủ' },
                          { key: 'projects_section_desc', label: 'Mô tả dự án trang chủ' },
                          { key: 'about_title', label: 'Tiêu đề trang Giới Thiệu' },
                          { key: 'registration_title', label: 'Tiêu đề đăng ký nhận tư vấn' },
                        ].map((item) => (
                          <tr key={item.key} className="border-b border-slate-100 bg-white">
                            <td className="p-2.5 font-bold font-mono text-slate-500">
                              <div>{item.key}</div>
                              <div className="text-[10px] text-[#c9a227] font-sans mt-0.5 font-bold">{item.label}</div>
                            </td>
                            <td className="p-2.5">
                              <textarea
                                value={customText[item.key] || ''}
                                placeholder="Trống (Hiện văn bản mặc định của hệ thống)"
                                onChange={(e) => handleSaveDictionaryText(item.key, e.target.value)}
                                rows={2}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:bg-white focus:border-[#1a3c6e] focus:ring-2 focus:ring-slate-100 outline-none text-slate-700 font-medium font-sans"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB: RECRUITMENT MANAGEMENT */}
            {activeSubTab === 'jobs' && (
              <div className="space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="font-extrabold text-[#1a3c6e] text-base uppercase flex items-center gap-2">
                    <span>📋</span> Quản Lý Tin Tuyển Dụng Nhân Sự
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Thêm và xóa các tin tuyển dụng chuyên viên tư vấn kinh doanh cho dự án
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Add Job Form */}
                  <div className="lg:col-span-5 bg-slate-50 border border-slate-150 p-5 rounded-2xl h-fit">
                    <form onSubmit={handleAddNewJob} className="space-y-3">
                      <p className="font-bold text-xs uppercase tracking-wider text-slate-600 border-b pb-1.5 flex items-center gap-1.5 select-none">
                        <span>➕</span> Thêm vị trí mới
                      </p>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Tên công việc *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ví dụ: Trưởng phòng tuyển dụng" 
                          value={newTitle} 
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Số lượng tuyển *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ví dụ: 03 nhân sự" 
                            value={newQty} 
                            onChange={(e) => setNewQty(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Mức lương *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ví dụ: 10 – 25 triệu" 
                            value={newSalary} 
                            onChange={(e) => setNewSalary(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Yêu cầu kinh nghiệm</label>
                          <input 
                            type="text" 
                            placeholder="Ví dụ: Không yêu cầu" 
                            value={newExp} 
                            onChange={(e) => setNewExp(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Hình thức làm việc</label>
                          <select 
                            value={newType} 
                            onChange={(e) => setNewType(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-600 font-sans"
                          >
                            <option value="Toàn thời gian">Toàn thời gian</option>
                            <option value="Bán thời gian">Bán thời gian</option>
                            <option value="Cộng tác viên">Cộng tác viên</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Mô tả tóm tắt công việc</label>
                        <textarea 
                          placeholder="Nhập mô tả các nhiệm vụ chính..." 
                          value={newDesc} 
                          onChange={(e) => setNewDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-sans block">Quyền lợi (Ngăn cách bằng dấu phẩy)</label>
                        <input 
                          type="text" 
                          placeholder="Ví dụ: Thưởng nóng 5 triệu, Đóng bảo hiểm đầy đủ" 
                          value={newBenefits} 
                          onChange={(e) => setNewBenefits(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-[#1a3c6e] hover:bg-[#c9a227] text-white font-extrabold text-xs uppercase py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm mt-3"
                      >
                        <Plus size={14} />
                        <span>Thêm Tin Mới</span>
                      </button>
                    </form>
                  </div>

                  {/* Job List View */}
                  <div className="lg:col-span-7 space-y-3">
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-450 flex items-center gap-1.5 select-none">
                      <span>📑</span> Danh sách vị trí tuyển dụng ({positions.length})
                    </p>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {positions.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl text-slate-450 text-xs font-bold font-sans">
                          Chưa có tin tuyển dụng nào được thêm. Hãy tự mình thêm tin đầu tiên!
                        </div>
                      ) : (
                        positions.map((pos, idx) => (
                          <div key={idx} className="bg-white border border-slate-150 p-4 rounded-2xl flex justify-between items-start gap-4 hover:border-slate-350 transition-all shadow-sm">
                            <div className="space-y-1.5 font-sans">
                              <h5 className="font-extrabold text-xs text-[#1a3c6e] uppercase tracking-wide">
                                {idx + 1}. {pos.title}
                              </h5>
                              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">Số lượng: {pos.qty}</span>
                                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">Lương: {pos.salary}</span>
                                <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md">{pos.type}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-normal">{pos.desc}</p>
                            </div>

                            <button 
                              onClick={() => handleRemoveJob(idx)}
                              className="text-rose-600 hover:text-white hover:bg-rose-600 w-7 h-7 rounded-lg border border-rose-100 flex items-center justify-center transition shrink-0 cursor-pointer"
                              title="Xóa tin tuyển dụng này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* SUB-TAB: VIDEO MANAGEMENT */}
            {activeSubTab === 'videos' && (
              <div className="space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="font-extrabold text-[#1a3c6e] text-base uppercase flex items-center gap-2">
                    <span>🎥</span> Quản Lý Kho Video & Clip Thực Tế
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Quản lý tệp video tiến độ thực tế, flycam, livestream hoặc video giới thiệu dự án Phố Hiến
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Add Video Form */}
                  <div className="lg:col-span-5 bg-slate-50 border border-slate-150 p-5 rounded-2xl h-fit">
                    <form onSubmit={handleAddNewVideo} className="space-y-3">
                      <p className="font-bold text-xs uppercase tracking-wider text-slate-600 border-b pb-1.5 flex items-center gap-1.5 select-none">
                        <span>➕</span> Đăng Video Mới
                      </p>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Tiêu đề video *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ví dụ: Cập Nhật Tiến Độ Tháng 6/2026" 
                          value={newVidTitle} 
                          onChange={(e) => setNewVidTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block font-sans">Đường dẫn URL Video (Mã Nhúng / Youtube / MP4) *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ví dụ: https://www.youtube.com/embed/dQw4w9WgXcQ" 
                          value={newVidUrl} 
                          onChange={(e) => setNewVidUrl(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block font-sans">Mô tả ngắn gọn về video</label>
                        <textarea 
                          placeholder="Mô tả nội dung chính trong video này..." 
                          value={newVidDesc} 
                          onChange={(e) => setNewVidDesc(e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-[#1a3c6e] hover:bg-[#c9a227] text-white font-extrabold text-xs uppercase py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm mt-3"
                      >
                        <Plus size={14} />
                        <span>Đăng Lên Website</span>
                      </button>
                    </form>
                  </div>

                  {/* Video List View */}
                  <div className="lg:col-span-7 space-y-3">
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-450 flex items-center gap-1.5 select-none">
                      <span>📑</span> Danh sách video hiển thị ({videos.length})
                    </p>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {videos.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl text-slate-450 text-xs font-bold font-sans">
                          Chưa có video nào. Hãy đăng video flycam thực tế đầu tiên!
                        </div>
                      ) : (
                        videos.map((vid, idx) => (
                          <div key={idx} className="bg-white border border-slate-150 p-4 rounded-2xl flex justify-between items-start gap-4 hover:border-slate-350 transition-all shadow-sm">
                            <div className="space-y-1.5 font-sans">
                              <h5 className="font-extrabold text-xs text-[#1a3c6e] uppercase tracking-wide">
                                {idx + 1}. {vid.title}
                              </h5>
                              <p className="text-[10px] font-mono font-semibold text-blue-600 truncate max-w-sm" title={vid.url}>
                                🔗 {vid.url}
                              </p>
                              <p className="text-[11px] text-slate-500 leading-normal">{vid.desc}</p>
                            </div>

                            <button 
                              onClick={() => handleRemoveVideo(idx)}
                              className="text-rose-600 hover:text-white hover:bg-rose-600 w-7 h-7 rounded-lg border border-rose-100 flex items-center justify-center transition shrink-0 cursor-pointer"
                              title="Xóa video này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* SUB-TAB: WEBSITE MENU CONFIGURATION */}
            {activeSubTab === 'settings' && (
              <div className="space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="font-extrabold text-[#1a3c6e] text-base uppercase flex items-center gap-2">
                    <span>⚙️</span> Thiết Lập Danh Mục & Hiển Thị Trang Web
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Ẩn hoặc hiện các danh mục/tab trên thanh menu điều hướng chính của trang web để tối ưu thông tin
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
                  <p className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1 select-none">
                    <span>🎛️</span> Chọn các mục bạn muốn hiển thị trên thanh Menu chính:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {TABS.map((tab) => {
                      const isHidden = hiddenTabs.includes(tab);
                      return (
                        <div 
                           key={tab} 
                           onClick={() => handleToggleTabVisibility(tab)}
                           className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer select-none font-sans font-extrabold text-xs ${
                             !isHidden 
                               ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                               : 'bg-white border-slate-200 text-slate-400 opacity-60'
                           }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{!isHidden ? '🟢' : '⚫'}</span>
                            <span>{tab}</span>
                          </div>

                          <div>
                            {!isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-2 text-xs leading-relaxed text-amber-900 font-sans mt-2">
                    <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Lưu ý về trạng thái ẩn tab:</p>
                      <p>Tab bị ẩn sẽ không hiển thị trên menu điều hướng của khách hàng, nhưng thông tin của tab vẫn được giữ nguyên vẹn trong hệ thống. Bạn có thể bật lại hiển thị bất cứ lúc nào.</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB: ADMINS & ROLE PERMISSIONS */}
            {activeSubTab === 'admins' && isSuperAdmin && (
              <div className="space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h4 className="font-extrabold text-[#1a3c6e] text-base uppercase flex items-center gap-2">
                    <span>🛡️</span> Quản Lý & Phân Quyền Quản Trị Viên
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Cấp quyền quản trị cho bất kỳ email nào với mật khẩu tự sinh nhanh chóng. Gửi thông tin này để họ đăng nhập và quản lý hệ thống.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Create Admin Form */}
                  <div className="lg:col-span-5 bg-slate-50 border border-slate-150 p-5 rounded-2xl h-fit">
                    <form onSubmit={handleAddNewAdmin} className="space-y-4">
                      <p className="font-bold text-xs uppercase tracking-wider text-slate-600 border-b pb-2 flex items-center gap-2 select-none">
                        <span>➕</span> Thêm quản trị viên mới
                      </p>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Email người nhận *</label>
                        <input 
                          type="email" 
                          required
                          placeholder="Ví dụ: nhanvien@mdhome.com" 
                          value={newAdminEmail} 
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-700 font-sans"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Mật khẩu (Tự động nhảy hoặc tự nhập) *</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            required
                            placeholder="Mật khẩu của admin mới" 
                            value={newAdminPassword} 
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600 focus:border-[#1a3c6e] outline-none"
                          />
                          <button
                            type="button"
                            onClick={generatePass}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] px-3 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                            title="Tạo ngẫu nhiên mật khẩu khác"
                          >
                            <RefreshCw size={13} />
                            <span>Tự Nhảy</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Chức danh / Vai trò quản trị</label>
                        <select 
                          value={newAdminRole} 
                          onChange={(e) => setNewAdminRole(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-[#1a3c6e] outline-none text-slate-600 font-sans"
                        >
                          <option value="Quản trị viên thường">Quản trị viên thường</option>
                          <option value="Trưởng phòng kinh doanh">Trưởng phòng kinh doanh</option>
                          <option value="Chuyên viên tư vấn cao cấp">Chuyên viên tư vấn cao cấp</option>
                          <option value="Cộng tác viên tuyển dụng">Cộng tác viên tuyển dụng</option>
                        </select>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-[#1a3c6e] hover:bg-[#c9a227] text-white font-extrabold text-xs uppercase py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md mt-4"
                      >
                        <Plus size={14} />
                        <span>Cấp Quyền & Lưu 🔑</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: List of Admins */}
                  <div className="lg:col-span-7 space-y-3">
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-450 flex items-center gap-1.5 select-none">
                      <span>📑</span> Danh sách quản trị được cấp quyền ({adminUsers.length})
                    </p>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {adminUsers.map((user, idx) => (
                        <div 
                          key={user.email} 
                          className="bg-white border border-slate-150 p-4 rounded-2xl flex justify-between items-center gap-4 hover:border-slate-350 transition-all shadow-sm"
                        >
                          <div className="space-y-1.5 font-sans flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs text-[#1a3c6e] truncate" title={user.email}>
                                {idx + 1}. {user.email}
                              </span>
                              <span className="bg-amber-100 text-[#a18118] text-[9px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">
                                {user.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-sans">
                              <span className="font-medium select-none">Mật khẩu:</span>
                              {editingAdminEmail === user.email ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <input 
                                    type="text" 
                                    value={editingAdminPassword}
                                    onChange={(e) => setEditingAdminPassword(e.target.value)}
                                    className="bg-white border border-slate-300 px-2 py-0.5 rounded text-xs font-mono font-bold text-amber-700 outline-none w-28"
                                  />
                                  <button 
                                    onClick={() => handleSaveNewPassword(user.email)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Check size={10} />
                                    <span>Lưu</span>
                                  </button>
                                  <button 
                                    onClick={() => setEditingAdminEmail(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-amber-700 font-black tracking-wider select-all">
                                    {visiblePasswords[user.email] ? user.password : '••••••••'}
                                  </span>
                                  <button 
                                    type="button"
                                    onClick={() => togglePasswordVisibility(user.email)}
                                    className="text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer"
                                    title={visiblePasswords[user.email] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                  >
                                    {visiblePasswords[user.email] ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditPassword(user.email, user.password)}
                                    className="text-blue-500 hover:text-blue-700 text-[10px] font-bold hover:underline select-none ml-1 cursor-pointer"
                                  >
                                    [Sửa mật khẩu]
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyAdminInfo(user)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-2.5 py-1.5 rounded-xl border border-blue-100 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Sao chép thông tin tài khoản để gửi"
                            >
                              <span>📋 Gửi Pass</span>
                            </button>

                            <button 
                              onClick={() => handleRemoveAdmin(user.email)}
                              disabled={user.email === 'admin@mdhome.com'}
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                user.email === 'admin@mdhome.com'
                                  ? 'text-slate-300 border-slate-100 bg-slate-50/50 cursor-not-allowed'
                                  : 'text-rose-600 hover:text-white hover:bg-rose-600 border-rose-100 bg-white'
                              }`}
                              title="Thu hồi quyền quản trị"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50/40 border border-blue-100 p-3.5 rounded-2xl flex items-start gap-2.5 text-[11px] leading-relaxed text-blue-900 font-sans mt-3">
                      <span className="text-sm select-none shrink-0 mt-0.5">ℹ️</span>
                      <p>
                        <strong>Hướng dẫn:</strong> Bấm nút <strong>📋 Gửi Pass</strong> để tự động sao chép thông điệp đăng nhập hoàn chỉnh. Bạn chỉ cần mở Zalo/SMS và dán gửi ngay cho nhân sự được phân quyền để họ đăng nhập.
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>

        {/* Footer info bar inside Admin control */}
        <div className="bg-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs font-semibold text-slate-500 font-sans select-none border-t border-slate-200 gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <span>🛡️ Trực thuộc:</span>
            <span className="font-bold text-[#1a3c6e]">Chuyên Viên Quản Trị MD HOME Phố Hiến</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Phiên bản: <strong>v3.2 Cloud Sync</strong></span>
            <span>•</span>
            <span>Thiết kế đáp ứng 100% Mobile & PC</span>
          </div>
        </div>

      </div>
    </div>
  );
}
