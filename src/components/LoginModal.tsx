import React, { useState } from 'react';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (email: string) => void;
    adminUsers: Array<{email: string; password: string; role: string; hidden?: boolean}>;
}

export default function LoginModal({ onClose, onLoginSuccess, adminUsers }: LoginModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const enteredEmail = email.trim().toLowerCase();
        
        // Check matching email & password in the registered administrators
        const foundUser = adminUsers.find(user => user.email.toLowerCase() === enteredEmail);
        
        if (foundUser && foundUser.password === password) {
            onLoginSuccess(foundUser.email);
            onClose();
        } else {
            setError('Sai Email hoặc Mật khẩu đăng nhập!');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl space-y-5 w-96 border border-slate-100 font-sans animate-fade-in">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-[#1a3c6e] uppercase tracking-wider">ĐĂNG NHẬP ADMIN</h2>
                    <p className="text-[11px] text-slate-400 font-medium">MD HOME SMART PHỐ HIẾN</p>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-rose-600 text-xs font-bold text-center">
                        ⚠️ {error}
                    </div>
                )}

                <div className="space-y-3.5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email quản trị viên</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full border border-slate-200 p-3 rounded-xl font-medium focus:border-[#1a3c6e] outline-none text-xs text-slate-700" 
                            placeholder="V dụ: admin@mdhome.com" 
                            required 
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mật khẩu</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full border border-slate-200 p-3 rounded-xl font-mono font-bold focus:border-[#1a3c6e] outline-none text-xs text-slate-700" 
                            placeholder="Nhập mật khẩu" 
                            required 
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-1">
                    <button type="submit" className="flex-1 bg-[#1a3c6e] hover:bg-[#c9a227] text-white p-3.5 rounded-xl font-extrabold uppercase tracking-wider text-xs transition cursor-pointer shadow-md">Đăng Nhập</button>
                    <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-3.5 rounded-xl font-bold text-xs transition cursor-pointer">Hủy</button>
                </div>
            </form>
        </div>
    );
}
