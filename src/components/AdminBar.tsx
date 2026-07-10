import { useState } from 'react';
import { Save, Image as ImageIcon, Type, LogOut, ChevronDown, ChevronUp, ShieldAlert, Layout } from 'lucide-react';

export default function AdminBar({ 
    onClose, 
    editText,
    setEditText, 
    editImages,
    setEditImages,
    onOpenDashboard
}: {
    onClose: () => void,
    editText: boolean,
    setEditText: (val: boolean) => void,
    editImages: boolean,
    setEditImages: (val: boolean) => void,
    onOpenDashboard: () => void
}) {
    const [isMinimized, setIsMinimized] = useState(false);

    const toggleEditImages = () => {
        setEditImages(!editImages);
    };

    const toggleEditText = () => {
        setEditText(!editText);
    };

    const handleSave = () => {
        alert('✓ Đã lưu tất cả thay đổi nội dung trực tiếp thành công!');
    };

    return (
        <div className={`fixed bottom-0 left-0 w-full z-[1000] transition-all duration-300 font-sans shadow-[0_-10px_40px_rgba(0,0,0,0.35)] ${isMinimized ? 'translate-y-[calc(100%-40px)]' : 'translate-y-0'}`}>
            {/* Header top handle tab */}
            <div className="bg-slate-900 border-t border-slate-700/60 text-slate-400 h-10 px-4 flex justify-between items-center text-xs select-none">
                <div className="flex items-center gap-1.5 font-bold text-amber-500">
                    <ShieldAlert size={14} className="animate-pulse" />
                    <span>CHẾ ĐỘ TỰ CHỈNH SỬA TRỰC TIẾP (ADMIN LIVE EDITOR)</span>
                </div>
                <button 
                    onClick={() => setIsMinimized(!isMinimized)} 
                    className="flex items-center gap-1 hover:text-white transition cursor-pointer font-bold bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded"
                >
                    {isMinimized ? (
                        <div className="flex items-center gap-1"><span>Mở rộng thanh công cụ</span> <ChevronUp size={14}/></div>
                    ) : (
                        <div className="flex items-center gap-1"><span>Thu nhỏ</span> <ChevronDown size={14}/></div>
                    )}
                </button>
            </div>

            {/* Core Controls */}
            <div className="bg-slate-950/95 backdrop-blur-md text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-800">
                <div className="flex flex-wrap gap-3 items-center">
                    
                    {/* Big Open Dashboard Button */}
                    <button 
                        onClick={onOpenDashboard}
                        className="bg-gradient-to-r from-amber-500 to-[#c9a227] hover:from-[#c9a227] hover:to-amber-500 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer"
                    >
                        <Layout size={15} />
                        <span>⚙️ BẢNG QUẢN TRỊ CHUYÊN SÂU</span>
                    </button>

                    <div className="h-6 w-px bg-slate-800 hidden sm:block" />

                    <button 
                        onClick={toggleEditText} 
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 border cursor-pointer ${
                            editText 
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg shadow-amber-500/20' 
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                    >
                        <Type size={16}/> 
                        <span>{editText ? 'Đang BẬT sửa chữ ✓' : 'Sửa Chữ Trực Tiếp'}</span>
                    </button>

                    <button 
                        onClick={toggleEditImages} 
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 border cursor-pointer ${
                            editImages 
                                ? 'bg-blue-500 text-white border-blue-400 font-black shadow-lg shadow-blue-500/20' 
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                    >
                        <ImageIcon size={16}/> 
                        <span>{editImages ? 'Đang BẬT sửa ảnh ✓' : 'Sửa Ảnh Trực Tiếp'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSave} 
                        className="bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] border border-emerald-500 text-white font-extrabold text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                        <Save size={16}/>
                        <span>Lưu nội dung</span>
                    </button>

                    <button 
                        onClick={onClose} 
                        className="bg-rose-700 hover:bg-rose-800 hover:scale-[1.02] border border-rose-600 text-white font-extrabold text-xs uppercase px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                        <LogOut size={16}/>
                        <span>Thoát Admin</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
