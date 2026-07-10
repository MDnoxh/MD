import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Phone, User, Check, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MD_CONFIG } from '../config';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  isForm?: boolean;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là Trợ lý AI chính thức của dự án MD HOME SMART Phố Hiến 🌟. Tôi sẵn sàng hỗ trợ Anh/Chị tìm hiểu thông tin dự án, tư vấn điều kiện mua Nhà ở Xã hội (NOXH), hướng dẫn hồ sơ pháp lý & thủ tục vay vốn ngân hàng bảo lãnh.\n\nAnh/chị có thể nhập câu hỏi trực tiếp hoặc nhấn nhanh các phím gợi ý bên dưới để được phản hồi ngay lập tức!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Lead Collection State
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    needs: 'Tư vấn mua căn hộ',
    needsLoan: 'Có'
  });
  const [activeFormIndex, setActiveFormIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const QUICK_REPLIES = [
    { label: '📋 Điều kiện mua NOXH', value: 'điều kiện mua' },
    { label: '📂 Hồ sơ đăng ký', value: 'hồ sơ đăng ký' },
    { label: '💰 Hỗ trợ vay vốn', value: 'vay ngân hàng' },
    { label: '📊 Bảng giá mới nhất', value: 'bảng giá' },
    { label: '🏗️ Tiến độ dự án', value: 'tiến độ thực tế' },
    { label: '✍️ Đăng ký tư vấn', value: 'đăng ký tư vấn trực tiếp' },
    { label: '👨‍💼 Liên hệ chuyên viên', value: 'gặp người thật' }
  ];

  const handleSendText = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const newMessages = [...messages, { sender: 'user' as const, text }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const lowercaseMsg = text.toLowerCase();
    let botResponse = '';
    let shouldShowInlineForm = false;

    // Rule-based matching logic following the detailed system prompt
    if (
      lowercaseMsg.includes('điều kiện') || 
      lowercaseMsg.includes('tiêu chí') ||
      lowercaseMsg.includes('đối tượng') ||
      lowercaseMsg.includes('ai được mua') || 
      lowercaseMsg.includes('tôi có mua được') || 
      lowercaseMsg.includes('độc thân') || 
      lowercaseMsg.includes('hộ khẩu tỉnh') || 
      lowercaseMsg.includes('ngoại tỉnh')
    ) {
      botResponse = `Để đăng ký mua Nhà ở xã hội (NOXH) MD HOME SMART Phố Hiến năm 2026, Quý khách cần đáp ứng các điều kiện pháp lý chung của Nhà nước.

Trợ lý AI muốn xin thêm thông tin để tư vấn chuẩn xác nhất:
1. 🏠 Anh/Chị hiện đã đứng tên sở hữu bất kỳ nhà ở hay đất thổ cư nào chưa?
2. 💼 Anh/Chị hiện đang làm cán bộ, công chức, viên chức hay người lao động tự do/doanh nghiệp?
3. 🏦 Anh/Chị có nhu cầu được hỗ trợ hồ sơ vay vốn ngân hàng ưu đãi (chính sách của gói NOXH) hay không?

Để được kiểm tra điều kiện chi tiết và tư vấn chính xác 100%, Anh/Chị hãy điền nhanh biểu mẫu để chuyên viên kiểm tra ngay lập tức!`;
      shouldShowInlineForm = true;
    } 
    else if (
      lowercaseMsg.includes('hồ sơ') || 
      lowercaseMsg.includes('giấy tờ') || 
      lowercaseMsg.includes('thủ tục') || 
      lowercaseMsg.includes('chuẩn bị')
    ) {
      botResponse = `Theo quy định của dự án MD HOME SMART Phố Hiến, một bộ hồ sơ đăng ký mua Nhà ở xã hội bao gồm các giấy tờ cơ bản sau:

1. 📂 Căn cước công dân (CCCD) có gắn chip của toàn bộ thành viên trong hộ gia đình.
2. 📄 Giấy xác nhận thông tin cư trú hợp lệ (thay thế Sổ hộ khẩu giấy cũ).
3. 🏠 Giấy xác nhận tình trạng nhà ở (mẫu theo quy định của Bộ Xây dựng).
4. 💼 Giấy xác nhận mức thu nhập chịu thuế (không thuộc diện nộp thuế thu nhập cá nhân thường xuyên).
5. 📝 Đơn đăng ký mua nhà ở xã hội theo mẫu chuẩn của chủ đầu tư.

👉 Để nhận trọn bộ file mẫu hồ sơ, hướng dẫn điền chi tiết từ A-Z và hạn chế sai lệch để duyệt hồ sơ nhanh nhất, Anh/Chị vui lòng nhập thông tin bên dưới, bộ phận pháp lý của chúng tôi sẽ gửi tài liệu ngay lập tức!`;
      shouldShowInlineForm = true;
    } 
    else if (
      lowercaseMsg.includes('vay') || 
      lowercaseMsg.includes('ngân hàng') || 
      lowercaseMsg.includes('lãi suất') || 
      lowercaseMsg.includes('gói vay') || 
      lowercaseMsg.includes('góp') || 
      lowercaseMsg.includes('trả góp')
    ) {
      botResponse = `Dự án MD HOME SMART Phố Hiến được ngân hàng bảo lãnh và hỗ trợ tối đa cho vay vốn ưu đãi, giúp giảm thiểu đáng kể áp lực tài chính cho quý cư dân.

Để hỗ trợ xây dựng lộ trình trả góp chi tiết nhất, Anh/Chị vui lòng chia sẻ thêm:
1. 💰 Giá trị căn hộ dự kiến Anh/Chị mong muốn hướng tới là bao nhiêu?
2. 💵 Tổng thu nhập ổn định hàng tháng của hai vợ chồng là khoảng bao nhiêu?
3. 🗓️ Anh/Chị muốn trả góp/vay ưu đãi trong thời gian bao lâu (tối đa 20 - 25 năm)?

👉 Vui lòng điền thông tin để chuyên viên chuẩn bị bảng tính dòng tiền trả góp hàng tháng chi tiết và kết nối với đầu mối ngân hàng hỗ trợ hồ sơ nhanh nhất!`;
      shouldShowInlineForm = true;
    } 
    else if (
      lowercaseMsg.includes('giá') || 
      lowercaseMsg.includes('bao nhiêu') || 
      lowercaseMsg.includes('tiền') || 
      lowercaseMsg.includes('m2') || 
      lowercaseMsg.includes('báo giá') || 
      lowercaseMsg.includes('bảng giá')
    ) {
      botResponse = 'Giá bán căn hộ MD HOME SMART Phố Hiến luôn được cập nhật chính xác theo từng thời điểm và chính sách ưu đãi của chủ đầu tư.\n\nThông tin này cần được xác nhận từ bộ phận tư vấn. Anh/chị vui lòng để lại số điện thoại và họ tên để nhận bảng giá & các phương án dòng tiền thanh toán mới nhất.';
      shouldShowInlineForm = true;
    } 
    else if (
      lowercaseMsg.includes('tiến độ') || 
      lowercaseMsg.includes('xây dựng') || 
      lowercaseMsg.includes('xây tới đâu') || 
      lowercaseMsg.includes('thực tế') || 
      lowercaseMsg.includes('bao giờ giao')
    ) {
      botResponse = 'Tiến độ đang được cập nhật liên tục tại thực tế công trường MD HOME SMART Phố Hiến để bảo đảm bàn giao đúng thời hạn cam kết.\n\nAnh/chị có thể để lại thông tin số điện thoại để nhận ngay bộ sưu tập hình ảnh, video trực quan từ flycam mới nhất tuần này.';
      shouldShowInlineForm = true;
    } 
    else if (
      lowercaseMsg.includes('đăng ký') || 
      lowercaseMsg.includes('tư vấn') || 
      lowercaseMsg.includes('liên hệ') || 
      lowercaseMsg.includes('chuyên viên') || 
      lowercaseMsg.includes('gọi điện') || 
      lowercaseMsg.includes('sđt') || 
      lowercaseMsg.includes('số điện thoại') || 
      lowercaseMsg.includes('gặp người') || 
      lowercaseMsg.includes('nhân viên')
    ) {
      botResponse = 'Tôi sẽ chuyển yêu cầu trực tiếp này của Anh/Chị tới bộ phận tư vấn và chuyên viên pháp lý của ban quản lý dự án MD HOME SMART Phố Hiến.\n\nAnh/chị vui lòng để lại thông tin Liên Hệ nhanh theo bảng đăng ký tư vấn chính thức dưới đây, chuyên viên sẽ gọi hỗ trợ giải đáp trực tiếp ngay lập tức!';
      shouldShowInlineForm = true;
    } 
    // Phone Number Detection
    else if (/\b(0[35789]\d{8})\b/.test(lowercaseMsg)) {
      const matchedPhone = lowercaseMsg.match(/\b(0[35789]\d{8})\b/)?.[0] || '';
      // Save lead
      const savedLeads = JSON.parse(localStorage.getItem('chatBotLeads') || '[]');
      savedLeads.push({ phone: matchedPhone, name: 'Khách hàng quan tâm', date: new Date().toLocaleString() });
      localStorage.setItem('chatBotLeads', JSON.stringify(savedLeads));

      botResponse = `Dạ tuyệt vời ạ! Hệ thống đã ghi nhận số điện thoại của Anh/Chị là: **${matchedPhone}**. 

Bộ phận chuyên viên tư vấn chính thức của dự án MD HOME SMART Phố Hiến sẽ liên hệ trực tiếp cho Anh/Chị trong vòng tối đa 10 phút để gửi bảng giá, hướng dẫn hồ sơ NOXH & phương án vay ngân hàng chi tiết nhất. Cảm ơn Anh/Chị! 🤝`;
    }
    // Out of scope requests
    else {
      botResponse = `Cảm ơn Anh/Chị đã trao đổi. Là trợ lý AI chính thức chuyên biệt của dự án **MD HOME SMART Phố Hiến**, tôi tập trung hỗ trợ các vấn đề xoay quanh Nhà ở xã hội, quy trình mua nhà, hồ sơ chuẩn bị và hỗ trợ vay vốn của dự án.\n\nThông tin này cụ thể chi tiết hơn cần được xác nhận từ bộ phận trực tiếp. Anh/chị vui lòng cập nhật nhanh thông tin số điện thoại cùng họ tên dưới đây để nhận phản hồi từ chuyên viên tư vấn nhanh nhất.`;
      shouldShowInlineForm = true;
    }

    setTimeout(() => {
      setIsTyping(false);
      const updatedMessages = [...newMessages, { sender: 'bot' as const, text: botResponse }];
      
      if (shouldShowInlineForm) {
        // Embed the lead form to be active on this specific message
        setMessages([...newMessages, { sender: 'bot' as const, text: botResponse }, { sender: 'bot' as const, text: '', isForm: true }]);
        setActiveFormIndex(updatedMessages.length);
      } else {
        setMessages(updatedMessages);
      }
    }, 1000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.phone.trim()) return;

    // Save lead to simulated database in localStorage
    const savedLeads = JSON.parse(localStorage.getItem('chatBotLeads') || '[]');
    const newLead = {
      ...leadForm,
      date: new Date().toLocaleString(),
      source: 'Chatbox Smart Form'
    };
    savedLeads.push(newLead);
    localStorage.setItem('chatBotLeads', JSON.stringify(savedLeads));

    // Clear active form and show confirmation
    setActiveFormIndex(null);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `🎉 **Đăng ký nhận thông tin thành công!**

Cảm ơn Anh/Chị **${leadForm.name || 'khách hàng'}** đã tin tưởng lựa chọn MD HOME SMART Phố Hiến. 
- 📞 **Số điện thoại:** ${leadForm.phone}
- 💼 **Nhu cầu:** ${leadForm.needs}
- 🏦 **Cố vấn vay ngân hàng:** ${leadForm.needsLoan}

Hệ thống đã chuyển dữ liệu đến phòng kinh doanh dự án. Trưởng phòng tư vấn của chúng tôi sẽ gọi điện hoặc kết nối Zalo cho Anh/Chị trong vòng 10 phút tới. Hotline đại diện: ${MD_CONFIG.hotline1}. Chúc Anh/Chị chọn được căn hộ ưng ý!`
        }
      ]);
      // Reset input form
      setLeadForm({
        name: '',
        phone: '',
        needs: 'Tư vấn mua căn hộ',
        needsLoan: 'Có'
      });
    }, 800);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            key="chat-trigger"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
            transition={{ 
              y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
              scale: { duration: 0.2 },
              opacity: { duration: 0.2 }
            }}
            onClick={() => setIsOpen(true)} 
            className="fixed bottom-24 right-6 flex flex-col items-center gap-1.5 z-50 group hover:scale-105 transition-all duration-300"
            id="chatbot-trigger-btn"
          >
            <div className="bg-[#1a3c6e] p-4 rounded-full text-white shadow-2xl relative border-2 border-amber-500/50 group-hover:bg-[#c9a227] transition-all duration-300">
              <MessageSquare size={26} className="text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white animate-pulse">
                1
              </span>
            </div>
            <div className="bg-white/95 backdrop-blur-sm text-[#1a3c6e] border border-slate-100 font-extrabold px-3 py-1.5 rounded-full shadow-lg text-xs whitespace-nowrap flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              <span>Hỗ trợ AI 24/7</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="chat-window"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 right-4 md:right-8 w-[380px] sm:w-[420px] h-[580px] bg-white border border-slate-150 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden leading-relaxed"
            id="chatbot-container"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a3c6e] to-[#25528f] text-white p-4 flex justify-between items-center border-b border-white/5 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center relative shadow-inner">
                  <Bot size={22} className="text-amber-400" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#1a3c6e] rounded-full"></span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm tracking-wide uppercase flex items-center gap-1.5">
                    <span>CHUYÊN VIÊN TƯ VẤN AI</span>
                    <Sparkles size={12} className="text-amber-400 animate-spin" />
                  </h4>
                  <p className="text-[10px] text-amber-200/90 font-bold uppercase tracking-wider">MD HOME SMART PHỐ HIẾN</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
                title="Đóng Chat"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map((m, i) => {
                if (m.isForm && i === activeFormIndex) {
                  return (
                    <div key={i} className="bg-white border-2 border-[#c9a227]/40 rounded-2xl p-4 shadow-md space-y-3 font-sans animate-fade-in max-w-[90%]">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <span className="text-lg">📋</span>
                        <h5 className="font-extrabold text-xs text-[#1a3c6e] uppercase tracking-wider">ĐĂNG KÝ NHẬN TÀI LIỆU CHÍNH THỨC</h5>
                      </div>
                      <form onSubmit={handleFormSubmit} className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Họ tên của anh/chị</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={leadForm.name}
                              onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                              placeholder="Trần Văn A..." 
                              className="w-full text-xs font-semibold pl-8 pr-3 py-2 border rounded-xl focus:border-[#1a3c6e] outline-none"
                            />
                            <User className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Số điện thoại *</label>
                          <div className="relative">
                            <input 
                              type="tel" 
                              value={leadForm.phone}
                              onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                              placeholder="0912xxxxxx..." 
                              className="w-full text-xs font-semibold pl-8 pr-3 py-2 border-2 border-amber-500/20 focus:border-[#1a3c6e] outline-none rounded-xl bg-amber-500/5"
                              required
                            />
                            <Phone className="absolute left-2.5 top-2.5 text-[#c9a227]" size={13} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nhu cầu</label>
                            <select 
                              value={leadForm.needs} 
                              onChange={(e) => setLeadForm({ ...leadForm, needs: e.target.value })}
                              className="w-full text-[11px] font-bold p-1.5 border rounded-xl bg-white focus:outline-none"
                            >
                              <option>Tư vấn mua căn hộ</option>
                              <option>Hướng dẫn hồ sơ NOXH</option>
                              <option>Xem bảng giá chi tiết</option>
                              <option>Đăng ký xem căn hộ mẫu</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cần vay vốn?</label>
                            <select 
                              value={leadForm.needsLoan} 
                              onChange={(e) => setLeadForm({ ...leadForm, needsLoan: e.target.value })}
                              className="w-full text-[11px] font-bold p-1.5 border rounded-xl bg-white focus:outline-none"
                            >
                              <option>Có</option>
                              <option>Không</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          type="submit" 
                          className="w-full bg-[#1a3c6e] hover:bg-[#c9a227] text-white font-extrabold text-xs py-2 rounded-xl transition shadow-md flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider"
                        >
                          <Check size={12} />
                          <span>GỬI ĐĂNG KÝ NGAY</span>
                        </button>
                      </form>
                    </div>
                  );
                }

                return (
                  <div 
                    key={i} 
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex gap-2.5 max-w-[85%]">
                      {m.sender === 'bot' && (
                        <div className="w-8 h-8 rounded-full bg-[#1a3c6e]/10 flex items-center justify-center shrink-0 shadow-inner">
                          <Bot size={15} className="text-[#1a3c6e]" />
                        </div>
                      )}
                      <div 
                        className={`p-3.5 rounded-2xl font-sans text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                          m.sender === 'user' 
                            ? 'bg-[#c9a227] text-white rounded-tr-none shadow-md font-semibold' 
                            : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2.5 max-w-[85%] items-center">
                    <div className="w-8 h-8 rounded-full bg-[#1a3c6e]/10 flex items-center justify-center shrink-0">
                      <Bot size={15} className="text-[#1a3c6e]" />
                    </div>
                    <div className="bg-white border border-slate-100 p-3 px-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Scroll List */}
            <div className="p-2 bg-white border-t border-slate-100/50 flex gap-2 overflow-x-auto select-none no-scrollbar shadow-inner shrink-0">
              {QUICK_REPLIES.map((btn, index) => (
                <button
                  key={index}
                  onClick={() => handleSendText(btn.label)}
                  className="bg-slate-50 hover:bg-[#1a3c6e]/5 hover:border-[#1a3c6e] text-[#1a3c6e] font-extrabold border border-slate-100 px-3.5 py-1.5 rounded-full text-xs cursor-pointer whitespace-nowrap transition-all duration-300 transform active:scale-95"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <div className="p-3 bg-white border-t flex gap-2 shrink-0">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && handleSendText(input)} 
                className="border-2 border-slate-100 flex-grow p-3 rounded-2xl text-xs md:text-sm font-semibold focus:border-[#1a3c6e] focus:outline-none placeholder-slate-400" 
                placeholder="Hỏi về điều kiện mua, hồ sơ, vay vốn..."
              />
              <button 
                onClick={() => handleSendText(input)} 
                className="bg-[#1a3c6e] hover:bg-[#c9a227] text-white p-3.5 rounded-2xl flex items-center justify-center transition shadow-md shrink-0 cursor-pointer"
              >
                <Send size={15}/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
