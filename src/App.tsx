import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingButtons from './components/FloatingButtons';
import Chatbot from './components/Chatbot';
import AdminBar from './components/AdminBar';
import AdminDashboard from './components/AdminDashboard';
import LoginModal from './components/LoginModal';
import EditableImage from './components/EditableImage';
import EditableText from './components/EditableText';
import { MD_CONFIG } from './config';
import { PROJECTS, NEWS, JOBS, DEFAULT_VIDEOS } from './data/tabData';
import { db, storage } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyh3MsbMggV7fu8Jam1FtaT9AMM2xazk2F0P_Qk1n4bCuiDpfefJgCzudxzT0PDqHbe/exec';

const sendToSheet = async (payload: Record<string, string>) => {
  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script yêu cầu no-cors
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Lỗi gửi dữ liệu lên Sheet:', err);
    // Không throw – để website vẫn hiện thành công với user
  }
};

const TABS = [
  'Trang Chủ', 'Giới Thiệu', 'Dự Án', 'Đăng Ký Mua', 'Tin Tức', 'Tuyển Dụng', 'Liên Hệ', '🎥 Cộng Đồng & Video Chia Sẻ'
];

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  details: string;
  date: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [showZaloQrModal, setShowZaloQrModal] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'local' | 'sheets'>('local');
  const [sheetLeads, setSheetLeads] = useState<{ cols: string[], rows: any[], sheetId: string } | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickedImageRef = useRef<string | null>(null);

  // Đảm bảo tài khoản admin@mdhome.com luôn bị ẩn khỏi giao diện quản lý,
  // kể cả với dữ liệu cũ (localStorage/Firebase) được lưu trước khi có tính năng ẩn tài khoản.
  const HIDDEN_ADMIN_EMAILS = ['admin@mdhome.com'];
  const normalizeAdminUsers = (list: Array<{email: string; password: string; role: string; hidden?: boolean}>) => {
    if (!Array.isArray(list)) return list;
    return list.map(u =>
      HIDDEN_ADMIN_EMAILS.includes(u.email.toLowerCase()) ? { ...u, hidden: true } : u
    );
  };

  const [adminUsers, setAdminUsers] = useState<Array<{email: string; password: string; role: string; hidden?: boolean}>>(() => {
    const defaultList = [
      { email: 'admin@mdhome.com', password: 'mdhome2026', role: 'Quản trị viên tối cao (Super Admin)', hidden: true },
      { email: 'minhducphohiennoxh@gmail.com', password: 'mdhome2026', role: 'Quản trị viên tối cao (Super Admin)' }
    ];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminUsers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasMinhDuc = parsed.some(u => u.email.toLowerCase() === 'minhducphohiennoxh@gmail.com');
            if (!hasMinhDuc) {
              parsed.push({ email: 'minhducphohiennoxh@gmail.com', password: 'mdhome2026', role: 'Quản trị viên tối cao (Super Admin)' });
            }
            return normalizeAdminUsers(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultList;
  });
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>('');
  const cloudReadyRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    }
  }, [adminUsers]);

  // Unified Admin settings and lists
  const [hiddenTabs, setHiddenTabs] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenTabs');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobQty, setNewJobQty] = useState('');
  const [newJobSalary, setNewJobSalary] = useState('');
  const [newJobExp, setNewJobExp] = useState('');
  const [newJobType, setNewJobType] = useState('Toàn thời gian');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobBenefits, setNewJobBenefits] = useState('');

  const [positions, setPositions] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recruitmentPositions');
      if (saved) return JSON.parse(saved);
    }
    return [
      {
        title: 'Chuyên viên tư vấn NOXH',
        qty: '05 nhân sự',
        salary: '8 – 20 triệu/tháng',
        exp: 'Không yêu cầu kinh nghiệm',
        type: 'Toàn thời gian',
        desc: 'Tư vấn khách hàng có nhu cầu mua nhà ở xã hội, hỗ trợ hướng dẫn làm hồ sơ và đồng hành trong suốt quá trình giao dịch.',
        benefits: ['Đào tạo miễn phí từ chuyên gia', 'Hỗ trợ nguồn data khách hàng nét', 'Thưởng doanh số cực kỳ hấp dẫn', 'Môi trường làm việc trẻ trung, văn minh']
      },
      {
        title: 'Trưởng nhóm kinh doanh',
        qty: '02 nhân sự',
        salary: '15 – 35 triệu/tháng',
        exp: 'Từ 1 năm kinh nghiệm BĐS',
        type: 'Toàn thời gian',
        desc: 'Quản lý, đào tạo và định hướng cho các chuyên viên tư vấn; thúc đẩy chỉ tiêu doanh số và lên chiến dịch tìm kiếm khách hàng.',
        benefits: ['Lương cứng cao + Hoa hồng nhóm hấp dẫn', 'Cơ hội thăng tiến lên Giám đốc dự án', 'Thưởng nóng ngay khi phát sinh giao dịch', 'Du lịch nghỉ dưỡng định kỳ với công ty']
      },
      {
        title: 'CTV bán hàng (Cộng tác viên)',
        qty: 'Không giới hạn',
        salary: 'Theo doanh số (Hoa hồng cực tốt)',
        exp: 'Không yêu cầu',
        type: 'Tự do / Bán thời gian',
        desc: 'Tìm kiếm, kết nối và giới thiệu các khách hàng tiềm năng có nhu cầu mua Nhà ở xã hội tại địa bàn Phố Hiến - Hưng Yên.',
        benefits: ['Thời gian làm việc tự do, không kén chọn', 'Mức chiết khấu hoa hồng cao bậc nhất', 'Hỗ trợ cung cấp toàn bộ tài liệu dự án', 'Được chỉ dẫn nghiệp vụ tư vấn chi tiết']
      }
    ];
  });

  const [leads, setLeads] = useState<Lead[]>([]);

  // States for Community & Video Sharing tab
  const [videos, setVideos] = useState<any[]>([]);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [isEditingVideoModalOpen, setIsEditingVideoModalOpen] = useState(false);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [editingVideoData, setEditingVideoData] = useState({ title: '', url: '', desc: '' });

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNeeds, setRegNeeds] = useState<string[]>([]);
  const [regSuccess, setRegSuccess] = useState(false);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactNeeds, setContactNeeds] = useState<string[]>([]);
  const [contactNote, setContactNote] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone) return;

    const needsText = regNeeds.length > 0 ? regNeeds.join(', ') : 'Tư vấn chung';
    const projectName = PROJECTS[selectedProjectIndex]?.name || 'MD HOME SMART';

    // Ghi vào state local (giữ nguyên như cũ)
    const detailsVal = `Dự Án: ${projectName}. Nhu cầu: ${needsText}`;
    const newL: Lead = {
      id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
      name: regName,
      phone: regPhone,
      source: 'Đăng Ký Mua',
      details: detailsVal,
      date: new Date().toLocaleString('vi-VN'),
    };
    const updated = [newL, ...leads];
    setLeads(updated);
    localStorage.setItem('adminLeads', JSON.stringify(updated));

    // ✅ GỬI LÊN GOOGLE SHEET
    await sendToSheet({
      source: 'Đăng Ký Mua',
      name: regName,
      phone: regPhone,
      project: projectName,
      needs: needsText,
    });

    setRegSuccess(true);
  };

  // Xử lý lead thu được từ Chatbot AI — trước đây chatbot chỉ lưu localStorage riêng của trình duyệt,
  // KHÔNG hề gửi lên Google Sheet hay danh sách leads chung của Admin. Nay đồng bộ đầy đủ như 3 form kia.
  const handleChatbotLead = async (payload: { name: string; phone: string; needs: string; needsLoan: string }) => {
    const detailsVal = `Nhu cầu: ${payload.needs}. Cần tư vấn vay vốn: ${payload.needsLoan}`;
    const newL: Lead = {
      id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
      name: payload.name || 'Khách qua Chatbot AI',
      phone: payload.phone,
      source: 'Liên Hệ',
      details: detailsVal,
      date: new Date().toLocaleString('vi-VN'),
    };
    const updated = [newL, ...leads];
    setLeads(updated);
    localStorage.setItem('adminLeads', JSON.stringify(updated));

    // ✅ GỬI LÊN GOOGLE SHEET
    await sendToSheet({
      source: 'Liên Hệ',
      name: payload.name || 'Khách qua Chatbot AI',
      phone: payload.phone,
      interests: payload.needs,
      note: `Cần tư vấn vay vốn: ${payload.needsLoan} (gửi từ Chatbot AI)`,
    });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone) return;

    const interestsText = contactNeeds.length > 0 ? contactNeeds.join(', ') : 'Khác';

    // Ghi vào state local (giữ nguyên như cũ)
    const detailsVal = `Mối quan tâm: ${interestsText}. Ghi chú: ${contactNote || 'Không có'}`;
    const newL: Lead = {
      id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
      name: contactName,
      phone: contactPhone,
      source: 'Liên Hệ',
      details: detailsVal,
      date: new Date().toLocaleString('vi-VN'),
    };
    const updated = [newL, ...leads];
    setLeads(updated);
    localStorage.setItem('adminLeads', JSON.stringify(updated));

    // ✅ GỬI LÊN GOOGLE SHEET
    await sendToSheet({
      source: 'Liên Hệ',
      name: contactName,
      phone: contactPhone,
      interests: interestsText,
      note: contactNote,
    });

    setContactSuccess(true);
  };

  const [careerName, setCareerName] = useState('');
  const [careerPhone, setCareerPhone] = useState('');
  const [careerEmail, setCareerEmail] = useState('');
  const [careerPosition, setCareerPosition] = useState('Chuyên viên tư vấn NOXH');
  const [careerExp, setCareerExp] = useState('Chưa có');
  const [careerFile, setCareerFile] = useState<File | null>(null);
  const [careerSuccess, setCareerSuccess] = useState(false);

  const handleCareerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerName || !careerPhone) return;

    // Ghi vào state local (giữ nguyên như cũ)
    const detailsVal = `Ứng tuyển: ${careerPosition}. Kinh nghiệm: ${careerExp}. Email: ${careerEmail || 'Không có'}`;
    const newL: Lead = {
      id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
      name: careerName,
      phone: careerPhone,
      email: careerEmail,
      source: 'Tuyển Dụng',
      details: detailsVal,
      date: new Date().toLocaleString('vi-VN'),
    };
    const updated = [newL, ...leads];
    setLeads(updated);
    localStorage.setItem('adminLeads', JSON.stringify(updated));

    // ✅ GỬI LÊN GOOGLE SHEET
    await sendToSheet({
      source: 'Tuyển Dụng',
      name: careerName,
      phone: careerPhone,
      email: careerEmail,
      position: careerPosition,
      exp: careerExp,
    });

    setCareerSuccess(true);
  };

  // Save settings back to Firebase Cloud with safe fallback
  const saveToFirebaseCloud = async (newData: {
    customImages?: any;
    customText?: any;
    videos?: any;
    positions?: any;
    hiddenTabs?: any;
    leads?: any;
    adminUsers?: any;
  }) => {
    try {
      const docRef = doc(db, 'md_home_config', 'settings');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      
      await setDoc(docRef, {
        ...existingData,
        ...newData,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      console.log('✓ Đồng bộ dữ liệu lên Firebase thành công!');
    } catch (err) {
      console.error('Lỗi đồng bộ dữ liệu lên Firebase:', err);
    }
  };

  useEffect(() => {
    const savedImages = localStorage.getItem('customImages');
    if (savedImages) setCustomImages(JSON.parse(savedImages));
    const savedText = localStorage.getItem('customText');
    if (savedText) setCustomText(JSON.parse(savedText));
    const savedVideos = localStorage.getItem('customVideos');
    if (savedVideos) {
      setVideos(JSON.parse(savedVideos));
    } else {
      setVideos(DEFAULT_VIDEOS);
    }

    // Load Leads
    const savedLeads = localStorage.getItem('adminLeads');
    if (savedLeads) {
      setLeads(JSON.parse(savedLeads));
    } else {
      const initialLeads: Lead[] = [
        {
          id: 'lead_1',
          name: 'Nguyễn Văn Hùng',
          phone: '0912345678',
          email: 'vinhung92@gmail.com',
          source: 'Đăng Ký Mua',
          details: 'Dự Án: MD HOME SMART PHỐ HIẾN. Nhu cầu: Tìm hiểu điều kiện mua, Tư vấn hồ sơ vay vốn 70%',
          date: '22/06/2026, 10:15:30'
        },
        {
          id: 'lead_2',
          name: 'Lê Thị Thu Hương',
          phone: '0987654321',
          email: 'huonglt.bds@gmail.com',
          source: 'Tuyển Dụng',
          details: 'Ứng tuyển: Chuyên viên tư vấn NOXH. Kinh nghiệm: Dưới 1 năm.',
          date: '22/06/2026, 11:42:05'
        },
        {
          id: 'lead_3',
          name: 'Phạm Minh Toàn',
          phone: '0905678912',
          source: 'Liên Hệ',
          details: 'Mối quan tâm: Nhận bảng giá & chính sách chiết khấu. Ghi chú: Cần tư vấn gấp căn 2PN',
          date: '22/06/2026, 13:02:18'
        }
      ];
      setLeads(initialLeads);
      localStorage.setItem('adminLeads', JSON.stringify(initialLeads));
    }

    // Load and Sync from Firebase Cloud doc
    const syncFromFirebase = async () => {
      try {
        const docRef = doc(db, 'md_home_config', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData.customImages) {
            setCustomImages(cloudData.customImages);
            localStorage.setItem('customImages', JSON.stringify(cloudData.customImages));
          }
          if (cloudData.customText) {
            setCustomText(cloudData.customText);
            localStorage.setItem('customText', JSON.stringify(cloudData.customText));
          }
          if (cloudData.videos) {
            setVideos(cloudData.videos);
            localStorage.setItem('customVideos', JSON.stringify(cloudData.videos));
          }
          if (cloudData.positions) {
            setPositions(cloudData.positions);
            localStorage.setItem('recruitmentPositions', JSON.stringify(cloudData.positions));
          }
          if (cloudData.hiddenTabs) {
            setHiddenTabs(cloudData.hiddenTabs);
            localStorage.setItem('hiddenTabs', JSON.stringify(cloudData.hiddenTabs));
          }
          if (cloudData.leads) {
            setLeads(cloudData.leads);
            localStorage.setItem('adminLeads', JSON.stringify(cloudData.leads));
          }
          if (Array.isArray(cloudData.adminUsers) && cloudData.adminUsers.length > 0) {
            const normalized = normalizeAdminUsers(cloudData.adminUsers);
            setAdminUsers(normalized);
            localStorage.setItem('adminUsers', JSON.stringify(normalized));
          }
        }
      } catch (err) {
        console.error('Không thể tải dữ liệu đồng bộ từ Firebase:', err);
      } finally {
        cloudReadyRef.current = true;
      }
    };
    syncFromFirebase();
  }, []);

  useEffect(() => {
    localStorage.setItem('customImages', JSON.stringify(customImages));
    localStorage.setItem('customText', JSON.stringify(customText));
    if (videos.length > 0) {
      localStorage.setItem('customVideos', JSON.stringify(videos));
    }
    localStorage.setItem('recruitmentPositions', JSON.stringify(positions));
    localStorage.setItem('hiddenTabs', JSON.stringify(hiddenTabs));
  }, [customImages, customText, videos, positions, hiddenTabs]);

  // Debounced Cloud Sync trigger
  useEffect(() => {
    if (Object.keys(customText).length === 0 && Object.keys(customImages).length === 0) return;
    if (!cloudReadyRef.current) return; // chờ tải xong dữ liệu cloud lần đầu, tránh ghi đè admin thật bằng dữ liệu mặc định

    const delayDebounceFn = setTimeout(() => {
      saveToFirebaseCloud({
        customImages,
        customText,
        videos,
        positions,
        hiddenTabs,
        leads,
        adminUsers
      });
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [customImages, customText, videos, positions, hiddenTabs, leads, adminUsers]);

  const fetchSheetLeads = async () => {
    setSheetLoading(true);
    setSheetError(null);
    try {
      const res = await fetch('/api/sheet-leads');
      if (!res.ok) {
        throw new Error('Không thể kết nối đến máy chủ API Google Sheet');
      }
      const data = await res.json();
      if (data.error) {
        setSheetError(data.error);
      }
      setSheetLeads(data);
    } catch (err: any) {
      setSheetError(err.message || 'Lỗi kết nối server');
    } finally {
      setSheetLoading(false);
    }
  };

  useEffect(() => {
    if (adminLoggedIn) {
      fetchSheetLeads();
    }
  }, [adminLoggedIn]);

  const handleImageClick = (id: string) => {
    if (!isEditingImages) return;
    clickedImageRef.current = id;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clickedImageRef.current) return;
    
    setIsUploadingImage(true);
    let downloadURL = '';
    
    // Tải trực tiếp lên ImgBB (Miễn phí, không yêu cầu thẻ tín dụng, an toàn tuyệt đối)
    try {
      const imgbbKey = (import.meta as any).env?.VITE_IMGBB_API_KEY || '710a97f02ac38dd01de794696fa2e943';
      console.log('Đang chuẩn bị tải ảnh lên đám mây ImgBB...');
      
      const formData = new FormData();
      formData.append('image', file);
      
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData
      });
      
      if (imgbbRes.ok) {
        const imgbbData = await imgbbRes.json();
        if (imgbbData && imgbbData.data && imgbbData.data.url) {
          downloadURL = imgbbData.data.url;
          console.log('✓ Tải ảnh lên ImgBB thành công:', downloadURL);
        }
      } else {
        const errorText = await imgbbRes.text();
        console.warn('Yêu cầu ImgBB trả về mã lỗi:', errorText);
      }
    } catch (imgbbErr) {
      console.warn('Không thể tải lên ImgBB:', imgbbErr);
    }

    // Xử lý kết quả lưu trữ
    if (downloadURL) {
      setCustomImages(prev => ({ ...prev, [clickedImageRef.current!]: downloadURL }));
      setIsUploadingImage(false);
    } else {
      // Dự phòng: Chuyển đổi sang base64 lưu trữ cục bộ nếu máy chủ ImgBB lỗi hoặc chưa cấu hình
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImages(prev => ({ ...prev, [clickedImageRef.current!]: event.target?.result as string }));
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
      alert('Hệ thống tạm thời chuyển sang lưu trữ cục bộ (Base64) trên trình duyệt của bạn do sự cố mạng.');
    }
  };

  const handleSaveText = (id: string, text: string) => {
    setCustomText(prev => ({ ...prev, [id]: text }));
  };

  const getUnifiedLeadsList = () => {
    const chatBotS = localStorage.getItem('chatBotLeads');
    const list2 = chatBotS ? JSON.parse(chatBotS) : [];
    
    const formattedChatLeads = list2.map((c: any, i: number) => ({
      id: `chatbot_${i}_${c.date}`,
      name: c.name || 'Khách Trợ Lý AI',
      phone: c.phone,
      email: c.email || 'N/A',
      source: 'Trợ Lý AI Chatbot',
      details: c.interest ? `Mối quan tâm: ${c.interest}.` : 'Khách quan tâm tìm hiểu NOXH qua tư vấn tự động.',
      date: c.date || 'N/A'
    }));
    
    return [...leads, ...formattedChatLeads];
  };

  const handleDeleteLead = (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách hàng này khỏi danh sách?")) return;
    if (id.startsWith('chatbot_')) {
      // Delete from chatbotLeads in localStorage
      const chatBotS = localStorage.getItem('chatBotLeads');
      if (chatBotS) {
        const list = JSON.parse(chatBotS);
        // Extract date from id (which is chatbot_index_date)
        const parts = id.split('_');
        const datePart = parts.slice(2).join('_');
        const updated = list.filter((item: any) => item.date !== datePart);
        localStorage.setItem('chatBotLeads', JSON.stringify(updated));
        // Trigger state refresh
        setCustomText(prev => ({ ...prev, '_chatbot_force_tick': Date.now().toString() }));
      }
    } else {
      // Delete from standard leads
      const updated = leads.filter(l => l.id !== id);
      setLeads(updated);
      localStorage.setItem('adminLeads', JSON.stringify(updated));
    }
  };

  const handleExcelDownload = () => {
    let csvContent = "\uFEFF"; // Add UTF-8 BOM for Excel Vietnamese formatting!
    csvContent += "Họ và Tên,Số Điện Thoại,Email,Nguồn Đăng Ký,Nội Dung Chi Tiết,Thời Gian Đăng Ký\n";
    const currentLeads = getUnifiedLeadsList();
    currentLeads.forEach(row => {
      const line = [
        `"${(row.name || '').replace(/"/g, '""')}"`,
        `"${(row.phone || '').replace(/"/g, '""')}"`,
        `"${(row.email || 'N/A').replace(/"/g, '""')}"`,
        `"${(row.source || '').replace(/"/g, '""')}"`,
        `"${(row.details || '').replace(/"/g, '""')}"`,
        `"${(row.date || '').replace(/"/g, '""')}"`
      ].join(",");
      csvContent += line + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_Sach_Khach_Hang_MDHome_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Video Utilities & Handlers
  const getYouTubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : '';
  };

  const getYouTubeThumbnail = (url: string) => {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
  };

  const handleOpenAddVideo = () => {
    setEditingVideoIndex(null);
    setEditingVideoData({ title: '', url: '', desc: '' });
    setIsEditingVideoModalOpen(true);
  };

  const handleOpenEditVideo = (index: number) => {
    setEditingVideoIndex(index);
    setEditingVideoData({
      title: videos[index].title,
      url: videos[index].url,
      desc: videos[index].desc
    });
    setIsEditingVideoModalOpen(true);
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoData.title || !editingVideoData.url) return;

    if (editingVideoIndex !== null) {
      const updated = [...videos];
      updated[editingVideoIndex] = { ...editingVideoData };
      setVideos(updated);
    } else {
      setVideos([...videos, { ...editingVideoData }]);
    }
    setIsEditingVideoModalOpen(false);
  };

  const handleDeleteVideo = (index: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa video này không?')) {
      const updated = videos.filter((_, i) => i !== index);
      setVideos(updated);
    }
  };

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const renderContent = (isEditing: boolean) => {
    switch(activeTab) {
      case 'Trang Chủ':
        return (
          <div className="space-y-12 md:space-y-20 font-sans">
            {/* Hero Section */}
            <div className="relative h-[450px] sm:h-[550px] md:h-[600px] flex items-center justify-center rounded-3xl overflow-hidden bg-slate-900 shadow-xl border border-slate-150/50">
              <EditableImage id="hero" isEditing={isEditingImages} onClick={handleImageClick} customImages={customImages} src="/luxury_apartment_hero.jpg" alt="Apartment Complex" className="absolute w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-slate-950/40" />
              <div className="relative text-center text-white space-y-4 md:space-y-6 p-4 sm:p-8 max-w-4xl mx-auto">
                <EditableText id="hero_subtitle" text={customText.hero_subtitle || 'KIẾN TẠO CỘNG ĐỒNG SỐNG HIỆN ĐẠI - VĂN MINH - BỀN VỮNG'} isEditing={isEditing} onSave={handleSaveText} className="text-xs sm:text-sm md:text-base lg:text-lg uppercase text-amber-400 font-extrabold leading-relaxed tracking-widest block drop-shadow" as="p" />
                <EditableText id="hero_title" text={customText.hero_title || 'MD HOME SMART PHỐ HIẾN'} isEditing={isEditing} onSave={handleSaveText} className="text-[13px] xs:text-[16px] sm:text-2xl md:text-4xl lg:text-[44px] xl:text-5xl font-black leading-tight tracking-wide text-white drop-shadow-md uppercase whitespace-nowrap" as="h1" />
                <EditableText id="hero_tagline" text={customText.hero_tagline || 'Không gian sống xanh, tiện ích đồng bộ, kết nối thuận tiện và cơ hội sở hữu nhà ở với chi phí hợp lý.'} isEditing={isEditing} onSave={handleSaveText} className="text-xs sm:text-sm md:text-base font-medium max-w-2xl mx-auto text-slate-200/90 leading-relaxed drop-shadow-sm animate-pulse" as="p" />
                <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center w-full max-w-md mx-auto sm:max-w-none">
                  <button 
                    onClick={() => {
                      setActiveTab('Dự Án');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-[#c9a227] hover:from-[#c9a227] hover:to-amber-500 text-white px-8 py-3.5 rounded-full font-black text-sm md:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 cursor-pointer uppercase tracking-wider font-sans text-center flex items-center justify-center gap-2"
                  >
                    <span>🏠</span> Khám phá dự án
                  </button>
                  <a 
                    href={`tel:${MD_CONFIG.hotline1}`} 
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-sm px-8 py-3.5 rounded-full font-black text-sm md:text-base hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 text-center flex items-center justify-center gap-2 shadow"
                  >
                    <span>📞</span> Hotline: {MD_CONFIG.hotline1}
                  </a>
                </div>
              </div>
            </div>

            {/* Introduction & Stats */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <EditableText id="home_intro_title" text={customText.home_intro_title || 'MD HOME SMART PHỐ HIẾN'} isEditing={isEditing} onSave={handleSaveText} className="text-4xl font-bold text-[#1a3c6e]" as="h2" />
                <EditableText id="home_intro_desc1" text={customText.home_intro_desc1 || `Nhà ở xã hội Phố Hiến Hưng Yên – Chất lượng, An tâm và Bền vững. Giá cả hợp lý, thủ tục đơn giản, hỗ trợ tư vấn ${MD_CONFIG.workingHours} từ đội ngũ chuyên nghiệp.`} isEditing={isEditing} onSave={handleSaveText} className="text-lg text-gray-700 leading-relaxed" as="p" />
                <EditableText id="home_intro_desc2" text={customText.home_intro_desc2 || `${MD_CONFIG.subtitle}, MD HOME SMART tự hào kiến tạo những căn nhà chất lượng, bề vững cho cộng đồng cư dân Phố Hiến – Hưng Yên.`} isEditing={isEditing} onSave={handleSaveText} className="text-lg text-gray-700" as="p" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { id: 'stat_1', n: '5+', d: 'Dự án đang triển khai' },
                  { id: 'stat_2', n: '2K+', d: 'Căn hộ đang mở bán' },
                  { id: 'stat_3', n: '24/7', d: 'Hỗ trợ tư vấn' },
                  { id: 'stat_4', n: '100%', d: 'Chất lượng đảm bảo' }
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border text-center flex flex-col justify-center items-center gap-1">
                    <EditableText 
                      id={`${s.id}_val`} 
                      text={customText[`${s.id}_val`] || s.n} 
                      isEditing={isEditing} 
                      onSave={handleSaveText} 
                      className="text-3xl font-black text-[#1a3c6e]" 
                      as="div" 
                    />
                    <EditableText 
                      id={`${s.id}_lbl`} 
                      text={customText[`${s.id}_lbl`] || s.d} 
                      isEditing={isEditing} 
                      onSave={handleSaveText} 
                      className="text-xs text-gray-500 font-medium" 
                      as="div" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Section */}
            <div className="space-y-8 bg-gray-50 p-6 md:p-12 rounded-3xl" id="Du_an_mo_ban_section">
              <EditableText id="projects_section_title" text={customText.projects_section_title || 'DỰ ÁN MỞ BÁN'} isEditing={isEditing} onSave={handleSaveText} className="text-4xl font-bold text-[#1a3c6e] text-center" as="h3" />
              <EditableText id="projects_section_desc" text={customText.projects_section_desc || 'Các dự án MD HOME SMART tại Phố Hiến, Hưng Yên sở hữu vị trí đắc địa, hạ tầng hiện đại, quy hoạch đồng bộ, dịch vụ đẳng cấp và không gian sống trong lành.'} isEditing={isEditing} onSave={handleSaveText} className="text-lg text-gray-700 max-w-3xl mx-auto text-center leading-relaxed" as="p" />
              
              {adminLoggedIn && (
                <p className="text-sm font-semibold text-center text-slate-500 animate-pulse">💡 Nhấp chọn từng dự án dưới đây để xem thông tin chi tiết và tùy chỉnh nội dung!</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {PROJECTS.map((p, i) => {
                    const isActive = selectedProjectIndex === i;
                    return (
                       <div 
                          key={i} 
                          onClick={() => setSelectedProjectIndex(i)}
                          className={`bg-white p-4 rounded-2xl shadow-sm border transition-all duration-300 cursor-pointer transform relative ${
                            isActive 
                              ? 'ring-4 ring-[#c9a227] border-transparent shadow-lg scale-[1.03] bg-amber-50/10' 
                              : 'hover:shadow-md hover:scale-[1.01] border-slate-100 hover:border-slate-300'
                          }`}
                       >
                         {isActive && (
                           <span className="absolute -top-2 -right-1 bg-[#c9a227] text-white text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shadow-sm animate-bounce z-10">
                             Đang xem
                           </span>
                         )}
                         <EditableImage id={`project_${i}`} isEditing={isEditingImages} onClick={handleImageClick} customImages={customImages} src={p.image} alt={p.name} className="w-full h-24 sm:h-32 object-cover rounded-xl mb-2" />
                         <h4 className="text-xs sm:text-sm font-bold text-[#1a3c6e] truncate">{p.name}</h4>
                         <p className="text-[11px] sm:text-xs text-[#c9a227] font-semibold">{p.price}</p>
                       </div>
                    );
                 })}
              </div>

              {/* Selected Project Dynamic Detail View */}
              {PROJECTS[selectedProjectIndex] && (() => {
                 const p = PROJECTS[selectedProjectIndex];
                 const idx = selectedProjectIndex;
                 return (
                   <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden mt-8 transition-all duration-500 animate-fadeIn">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-10">
                       {/* Image Left */}
                       <div className="lg:col-span-5 relative group">
                         <EditableImage 
                           id={`project_detail_img_${idx}`} 
                           isEditing={isEditingImages} 
                           onClick={handleImageClick} 
                           customImages={customImages} 
                           src={p.image} 
                           alt={p.name} 
                           className="w-full h-64 sm:h-80 object-cover rounded-2xl shadow-md border" 
                         />
                         <div className="absolute top-4 left-4 bg-[#1a3c6e] text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-md uppercase">
                           Ảnh Dự Án {idx + 1}
                         </div>
                       </div>

                       {/* Text Right */}
                       <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                         <div>
                           <div className="flex flex-wrap items-center gap-2 mb-3">
                             <span className="bg-[#1a3c6e]/10 text-[#1a3c6e] text-xs font-bold px-3 py-1 rounded-full uppercase">
                               Loại: {p.type}
                             </span>
                             <span className="bg-amber-100 text-[#b08d20] text-xs font-bold px-3 py-1 rounded-full">
                               Căn hộ {p.bedrooms}
                             </span>
                           </div>
                           
                           <h4 className="text-2xl md:text-3xl font-bold text-[#1a3c6e] leading-snug mb-4">
                             {p.name}
                           </h4>

                           {/* Mô tả ngắn (80-120 từ) */}
                           <div className="text-slate-700 leading-relaxed text-base bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80 mb-6 font-sans">
                             <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Mô tả dự án (Sổ Đỏ / Tiện ích / Vị trí)</span>
                             <EditableText 
                               id={`project_detail_desc_${idx}`} 
                               text={customText[`project_detail_desc_${idx}`] || p.description} 
                               isEditing={isEditing} 
                               onSave={handleSaveText} 
                               className="text-slate-700 text-sm whitespace-pre-line" 
                               as="p" 
                             />
                           </div>

                           {/* SEO Spec Grid */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Giá bán dự kiến</span>
                               <EditableText 
                                 id={`project_detail_price_${idx}`} 
                                 text={customText[`project_detail_price_${idx}`] || p.price} 
                                 isEditing={isEditing} 
                                 onSave={handleSaveText} 
                                 className="text-base font-bold text-[#c9a227]" 
                                 as="p" 
                                />
                             </div>

                             <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Diện tích</span>
                               <EditableText 
                                 id={`project_detail_area_${idx}`} 
                                 text={customText[`project_detail_area_${idx}`] || p.area} 
                                 isEditing={isEditing} 
                                 onSave={handleSaveText} 
                                 className="text-base font-bold text-[#1a3c6e]" 
                                 as="p" 
                               />
                             </div>

                             <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tình trạng pháp lý</span>
                               <EditableText 
                                 id={`project_detail_legal_${idx}`} 
                                 text={customText[`project_detail_legal_${idx}`] || p.legalStatus} 
                                 isEditing={isEditing} 
                                 onSave={handleSaveText} 
                                 className="text-sm font-semibold text-slate-700" 
                                 as="p" 
                               />
                             </div>

                             <div className="flex flex-col p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loại hình sản phẩm</span>
                               <EditableText 
                                 id={`project_detail_type_${idx}`} 
                                 text={customText[`project_detail_type_${idx}`] || p.type} 
                                 isEditing={isEditing} 
                                 onSave={handleSaveText} 
                                 className="text-sm font-semibold text-slate-700" 
                                 as="p" 
                               />
                             </div>
                           </div>

                           <div className="mt-4 flex flex-col p-3.5 bg-[#1a3c6e]/5 rounded-xl border border-[#1a3c6e]/10">
                             <span className="text-xs text-[#1a3c6e] font-bold uppercase tracking-wider mb-1">Kiểu căn hộ / Số phòng ngủ</span>
                             <EditableText 
                               id={`project_detail_beds_${idx}`} 
                               text={customText[`project_detail_beds_${idx}`] || p.bedrooms} 
                               isEditing={isEditing} 
                               onSave={handleSaveText} 
                               className="text-sm text-slate-700 leading-relaxed font-semibold text-[#1a3c6e]" 
                               as="p" 
                             />
                           </div>

                           <div className="mt-4 flex flex-col p-3.5 bg-[#1a3c6e]/5 rounded-xl border border-[#1a3c6e]/10">
                             <span className="text-xs text-[#1a3c6e] font-bold uppercase tracking-wider mb-1">Điều kiện sở hữu & mua bán</span>
                             <EditableText 
                               id={`project_detail_cond_${idx}`} 
                               text={customText[`project_detail_cond_${idx}`] || p.conditions} 
                               isEditing={isEditing} 
                               onSave={handleSaveText} 
                               className="text-sm text-slate-700 leading-relaxed font-medium" 
                               as="p" 
                             />
                           </div>
                         </div>

                         {/* Action Buttons */}
                         <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                           <button 
                             onClick={() => {
                               setActiveTab('Dự Án');
                               setTimeout(() => {
                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                               }, 100);
                             }}
                             className="flex-1 bg-white text-[#1a3c6e] border-2 border-[#1a3c6e] hover:bg-[#1a3c6e]/5 px-6 py-3 rounded-full font-bold text-center transition"
                            >
                              Xem chi tiết bộ sưu tập 📊
                            </button>
                            <button 
                              onClick={() => {
                               setActiveTab('Đăng Ký Mua');
                                setTimeout(() => {
                                  window.scrollTo({ top: 150, behavior: 'smooth' });
                                }, 100);
                              }}
                              className="flex-1 bg-[#c9a227] hover:bg-yellow-600 text-white px-6 py-3 rounded-full font-bold text-center transition shadow-md"
                            >
                              Đăng ký tư vấn trực tiếp 📞
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
               })()}
            </div>

            {/* Service Highlights */}
            <div className="bg-[#1a3c6e] p-6 sm:p-10 md:p-14 lg:p-16 rounded-3xl text-white shadow-xl border border-blue-950/45">

                <EditableText id="consulting_section_title" text={customText.consulting_section_title || 'ĐỒNG HÀNH CHUYÊN NGHIỆP'} isEditing={isEditing} onSave={handleSaveText} className="text-[#c9a227] font-extrabold uppercase tracking-widest text-xs md:text-sm mb-2" as="p" />
                <EditableText id="consulting_section_subtitle" text={customText.consulting_section_subtitle || 'TƯ VẤN CHUYÊN NGHIỆP – ĐỒNG HÀNH TỪ HỒ SƠ ĐẾN NHẬN NHÀ'} isEditing={isEditing} onSave={handleSaveText} className="text-2xl md:text-4xl font-black mb-6 leading-tight uppercase tracking-tight" as="h3" />
                
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
                  <div className="flex-1 space-y-6 md:space-y-8">
                     <EditableText id="consulting_section_desc" text={customText.consulting_section_desc || 'MD HOME SMART cam kết đồng hành cùng khách hàng trong toàn bộ quá trình mua nhà ở xã hội, từ tư vấn điều kiện đăng ký, hoàn thiện hồ sơ xét duyệt, hỗ trợ vay vốn ngân hàng đến hướng dẫn thanh toán và bàn giao căn hộ. Mọi thắc mắc đều được đội ngũ chuyên viên giải đáp nhanh chóng, minh bạch và tận tâm, giúp khách hàng tiết kiệm thời gian và dễ dàng hiện thực hóa kế hoạch an cư.'} isEditing={isEditing} onSave={handleSaveText} className="text-sm md:text-base text-blue-100 leading-relaxed font-sans" as="p" />
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {[
                           {
                             t: 'Tư vấn hồ sơ NOXH 24/7',
                             d: 'Hỗ trợ kiểm tra điều kiện mua nhà ở xã hội, hướng dẫn chuẩn bị hồ sơ và hoàn thiện các giấy tờ cần thiết theo quy định mới nhất.'
                           },
                           {
                             t: 'Hỗ trợ vay vốn ưu đãi',
                             d: 'Tư vấn các gói vay lãi suất ưu đãi, hỗ trợ chuẩn bị hồ sơ ngân hàng và xây dựng phương án tài chính phù hợp với từng khách hàng.'
                           },
                           {
                             t: 'Thanh toán linh hoạt nhiều đợt',
                             d: 'Chính sách thanh toán rõ ràng, chia thành nhiều giai đoạn giúp khách hàng chủ động nguồn tài chính và giảm áp lực chi trả.'
                           },
                           {
                             t: 'Đồng hành đến khi nhận nhà',
                             d: 'Đội ngũ chuyên viên theo sát tiến độ hồ sơ, hỗ trợ giải quyết các thủ tục phát sinh và cập nhật thông tin dự án thường xuyên.'
                           }
                        ].map((item, idx_item) => (
                            <div key={idx_item} className="bg-[#15305c]/90 p-5 rounded-2xl border border-blue-800/80 hover:border-amber-500/50 transition duration-300 flex items-start gap-4 shadow-sm group">
                                <div className="text-[#c9a227] text-xl mt-1 select-none">✅</div>
                                <div className="space-y-1.5 flex-1 select-none">
                                    <h5 className="font-bold text-white text-base group-hover:text-amber-300 transition duration-300">{item.t}</h5>
                                    <p className="text-xs text-blue-200/90 leading-relaxed font-sans">{item.d}</p>
                                </div>
                            </div>
                        ))}
                     </div>
                     
                     <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button 
                           onClick={() => setShowZaloQrModal(true)} 
                           className="flex-1 bg-white hover:bg-slate-100 text-[#1a3c6e] py-4 px-6 rounded-2xl text-center font-bold text-base sm:text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 shadow-md cursor-pointer font-sans flex items-center justify-center gap-3"
                        >
                           <span className="text-2xl">💬</span>
                           <span className="text-left leading-tight">
                             <span className="block text-xs uppercase text-slate-400 font-extrabold">Hỗ trợ nhanh qua Zalo</span>
                             <span className="block font-black text-sm sm:text-base">Zalo {MD_CONFIG.hotline1}</span>
                           </span>
                        </button>
                        <a href={`tel:${MD_CONFIG.hotline1}`} 
                           className="flex-1 bg-gradient-to-r from-[#c9a227] to-amber-600 hover:from-amber-600 hover:to-[#c9a227] text-white py-4 px-6 rounded-2xl text-center font-bold text-base sm:text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-250 shadow-md flex items-center justify-center gap-3 animate-pulse"
                        >
                           <span className="text-2xl">📞</span>
                           <span className="text-left leading-tight">
                             <span className="block text-xs uppercase text-amber-200 font-extrabold">Hotline tư vấn 24/7</span>
                             <span className="block font-black text-sm sm:text-base">{MD_CONFIG.hotline1}</span>
                           </span>
                        </a>
                     </div>
                  </div>

                  
                  <div className="lg:w-1/3">
                    <EditableImage id="consulting" isEditing={isEditingImages} onClick={handleImageClick} customImages={customImages} src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80" alt="Consulting App" className="rounded-3xl shadow-2xl rotate-3" />
                  </div>
                </div>
            </div>

            {/* News Preview */}
            <div className="space-y-8">
               <EditableText id="news_preview_title" text={customText.news_preview_title || 'TIN TỨC MỚI NHẤT'} isEditing={isEditing} onSave={handleSaveText} className="text-4xl font-bold text-[#1a3c6e] text-center" as="h3" />
               <div className="grid md:grid-cols-3 gap-8">
               {NEWS.slice(0, 3).map((item, i) => (
                   <div key={i} className="bg-white border rounded-3xl overflow-hidden hover:shadow-lg transition">
                       <EditableImage id={`news_teaser_${i}`} isEditing={isEditingImages} onClick={handleImageClick} customImages={customImages} src={item.image} alt={item.title} className="w-full h-48 object-cover" />
                       <div className="p-6 space-y-3 font-sans">
                           <EditableText id={`news_title_${i}`} text={customText[`news_title_${i}`] || item.title} isEditing={isEditing} onSave={handleSaveText} className="font-bold text-lg text-[#1a3c6e] leading-tight" as="p" />
                           <EditableText id={`news_date_${i}`} text={customText[`news_date_${i}`] || item.date} isEditing={isEditing} onSave={handleSaveText} className="text-gray-500 text-sm" as="p" />
                           <button onClick={() => { setActiveTab('Tin Tức'); setSelectedNews(item); }} className="text-[#c9a227] hover:text-amber-600 transition-colors font-bold text-base flex items-center gap-2 cursor-pointer">Đọc tiếp bài viết →</button>
                       </div>
                   </div>
               ))}
               </div>
            </div>

          </div>
        );
      case 'Giới Thiệu':
        return (
          <div className="space-y-10">
             <div className="space-y-4">
                <EditableText id="about_title" text={customText.about_title || 'VỀ MD HOME SMART'} isEditing={isEditing} onSave={handleSaveText} className="text-3xl font-bold text-[#1a3c6e]" as="h3" />
                <EditableText id="about_desc" text={customText.about_desc || 'MD HOME SMART là đơn vị đồng hành tư vấn và hỗ trợ khách hàng tiếp cận các dự án Nhà ở Xã hội tại Phố Hiến. Với đội ngũ chuyên viên giàu kinh nghiệm, chúng tôi hỗ trợ từ khâu kiểm tra điều kiện mua, hoàn thiện hồ sơ, tư vấn vay vốn ưu đãi đến hướng dẫn các thủ tục pháp lý cần thiết. Mục tiêu của MD HOME SMART là giúp khách hàng tiếp cận thông tin minh bạch, tiết kiệm thời gian và nâng cao cơ hội sở hữu căn hộ phù hợp nhu cầu an cư lâu dài.'} isEditing={isEditing} onSave={handleSaveText} className="text-gray-700 leading-relaxed text-lg whitespace-pre-line font-sans" as="p" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center bg-[#1a3c6e] text-white p-6 md:p-10 rounded-3xl shadow-inner">
                <div className="space-y-2">
                   <div className="text-5xl md:text-6xl font-extrabold text-[#c9a227]">500+</div>
                   <p className="font-bold text-lg text-amber-300">Khách hàng được tư vấn thành công</p>
                   <p className="text-xs text-blue-100 max-w-[260px] mx-auto leading-relaxed">Hồ sơ khách hàng được hỗ trợ tư vấn và hướng dẫn hoàn thiện.</p>
                </div>
                <div className="space-y-2 border-t md:border-t-0 md:border-x border-blue-900/40 pt-4 md:pt-0">
                   <div className="text-5xl md:text-6xl font-extrabold text-[#c9a227]">1</div>
                   <p className="font-bold text-lg text-amber-300">Dự án trọng điểm tại Phố Hiến</p>
                   <p className="text-xs text-blue-100 max-w-[260px] mx-auto leading-relaxed">Dự án Nhà ở xã hội trọng điểm đang được giới thiệu tại Phố Hiến.</p>
                </div>
                <div className="space-y-2 border-t md:border-t-0 border-[#1a3c6e] pt-4 md:pt-0">
                   <div className="text-5xl md:text-6xl font-extrabold text-[#c9a227]">100%</div>
                   <p className="font-bold text-lg text-amber-300">Hỗ trợ thủ tục pháp lý miễn phí</p>
                   <p className="text-xs text-blue-100 max-w-[260px] mx-auto leading-relaxed">Miễn phí tư vấn thông tin, điều kiện mua và quy trình hồ sơ.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {[
                    {
                      t: 'THÔNG TIN CHÍNH THỐNG', 
                      d: 'Cập nhật liên tục bảng giá, chính sách bán hàng, tiến độ xây dựng và các thông báo mới nhất từ chủ đầu tư.',
                      v: '⭐'
                    },
                    {
                      t: 'TƯ VẤN CHUYÊN SÂU 24/7', 
                      d: 'Hỗ trợ đánh giá điều kiện mua NOXH, giải đáp hồ sơ pháp lý và tư vấn phương án tài chính phù hợp.',
                      v: '📞'
                    },
                    {
                      t: 'HỖ TRỢ A-Z', 
                      d: 'Đồng hành cùng khách hàng từ bước đăng ký, hoàn thiện hồ sơ đến ký hợp đồng và nhận bàn giao căn hộ.',
                      v: '🤝'
                    },
                    {
                       t: 'HỖ TRỢ VAY VỐN ƯU ĐÃI', 
                       d: 'Tư vấn các gói vay nhà ở xã hội, hướng dẫn hồ sơ ngân hàng và dự kiến khoản trả góp hàng tháng.',
                       v: '🏦'
                    },
                    {
                      t: 'BẢO MẬT THÔNG TIN', 
                      d: 'Mọi thông tin cá nhân và hồ sơ khách hàng được bảo mật theo quy trình nghiêm ngặt, đảm bảo an toàn tuyệt đối.',
                      v: '🛡️'
                    }
                ].map(item => (
                   <div key={item.t} className="p-6 border border-slate-100 rounded-3xl bg-white hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group h-full">
                      <div className="space-y-4">
                         <span className="text-3xl block filter drop-shadow select-none">{item.v}</span>
                         <h4 className="font-bold text-base text-[#1a3c6e] group-hover:text-amber-600 transition-colors duration-300 uppercase tracking-wide">{item.t}</h4>
                         <p className="text-sm text-gray-600 leading-relaxed font-sans">{item.d}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        );
      case 'Dự Án':
        return (
            <div className="space-y-12">
                <div className="text-center max-w-3xl mx-auto space-y-4">
                  <EditableText id="projects_title" text={customText.projects_title || 'DỰ ÁN NHÀ Ở XÃ HỘI MD HOME SMART'} isEditing={isEditing} onSave={handleSaveText} className="text-3xl md:text-4xl font-bold text-[#1a3c6e]" as="h3" />
                  <EditableText id="projects_subtitle_tab" text={customText.projects_subtitle_tab || 'Danh sách đầy đủ các tầng, tòa hộ, NOXH và chung cư cao cấp thuộc dự án MD HOME SMART tại trung tâm Hưng Yên.'} isEditing={isEditing} onSave={handleSaveText} className="text-slate-600 leading-relaxed text-base" as="p" />
                </div>

                <div className="space-y-16">
                  {PROJECTS.map((p, idx) => (
                      <div key={idx} className="border border-slate-100 p-6 md:p-10 rounded-3xl shadow-xl hover:shadow-2xl transition bg-white relative overflow-hidden">
                          <span className="absolute top-0 left-0 h-2 w-full bg-[#1a3c6e]"></span>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Collapsible Details/Photo */}
                            <div className="lg:col-span-5 space-y-4">
                              <EditableImage id={`project_full_${idx}`} isEditing={isEditingImages} onClick={handleImageClick} customImages={customImages} src={p.image} alt={p.name} className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-md" referrerPolicy="no-referrer" />
                              <div className="flex flex-wrap gap-2">
                                  {p.features.map(f => (
                                    <span key={f} className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200">
                                      ✨ {f}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            {/* Right Dynamic Form/Text */}
                            <div className="lg:col-span-7 space-y-6">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="bg-[#1a3c6e] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                                  {p.type}
                                </span>
                                <span className="bg-[#c9a227]/10 text-[#b08d20] text-xs font-bold px-3 py-1 rounded-full uppercase">
                                  {p.bedrooms}
                                </span>
                              </div>

                              <h4 className="text-3xl font-bold text-[#1a3c6e]">{p.name}</h4>
                              <p className="text-gray-500 font-semibold text-sm -mt-2">📍 Địa điểm: {p.address}</p>
                              
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Mô tả chi tiết sản phẩm</span>
                                <EditableText 
                                  id={`project_detail_desc_${idx}`} 
                                  text={customText[`project_detail_desc_${idx}`] || p.description} 
                                  isEditing={isEditing} 
                                  onSave={handleSaveText} 
                                  className="text-gray-700 leading-relaxed text-sm whitespace-pre-line font-sans" 
                                  as="p" 
                                />
                              </div>

                              {/* Spec table */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Giá bán dự kiến</span>
                                  <EditableText 
                                    id={`project_detail_price_${idx}`} 
                                    text={customText[`project_detail_price_${idx}`] || p.price} 
                                    isEditing={isEditing} 
                                    onSave={handleSaveText} 
                                    className="text-base font-bold text-[#c9a227]" 
                                    as="p" 
                                  />
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Diện tích căn hộ</span>
                                  <EditableText 
                                    id={`project_detail_area_${idx}`} 
                                    text={customText[`project_detail_area_${idx}`] || p.area} 
                                    isEditing={isEditing} 
                                    onSave={handleSaveText} 
                                    className="text-base font-bold text-[#1a3c6e]" 
                                    as="p" 
                                  />
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Tình trạng pháp lý</span>
                                  <EditableText 
                                    id={`project_detail_legal_${idx}`} 
                                    text={customText[`project_detail_legal_${idx}`] || p.legalStatus} 
                                    isEditing={isEditing} 
                                    onSave={handleSaveText} 
                                    className="text-sm font-semibold text-slate-700" 
                                    as="p" 
                                  />
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/80">
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Nhóm / Loại hình</span>
                                  <EditableText 
                                    id={`project_detail_type_${idx}`} 
                                    text={customText[`project_detail_type_${idx}`] || p.type} 
                                    isEditing={isEditing} 
                                    onSave={handleSaveText} 
                                    className="text-sm font-semibold text-slate-700" 
                                    as="p" 
                                  />
                                </div>
                              </div>

                              <div className="bg-[#1a3c6e]/5 p-4 rounded-xl border border-[#1a3c6e]/10">
                                <span className="text-xs text-[#1a3c6e] font-bold uppercase tracking-wider block mb-1">Kiểu bàn giao / Phòng ngủ</span>
                                <EditableText 
                                  id={`project_detail_beds_${idx}`} 
                                  text={customText[`project_detail_beds_${idx}`] || p.bedrooms} 
                                  isEditing={isEditing} 
                                  onSave={handleSaveText} 
                                  className="text-sm text-slate-700 font-semibold" 
                                  as="p" 
                                />
                              </div>

                              <div className="bg-[#1a3c6e]/5 p-4 rounded-xl border border-[#1a3c6e]/10">
                                <span className="text-xs text-[#1a3c6e] font-bold uppercase tracking-wider block mb-1">Điều kiện tham gia mua dự án</span>
                                <EditableText 
                                  id={`project_detail_cond_${idx}`} 
                                  text={customText[`project_detail_cond_${idx}`] || p.conditions} 
                                  isEditing={isEditing} 
                                  onSave={handleSaveText} 
                                  className="text-sm text-slate-700 leading-relaxed font-medium" 
                                  as="p" 
                                />
                              </div>

                              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                                <button 
                                  onClick={() => {
                                    setActiveTab('Đăng Ký Mua');
                                    setTimeout(() => {
                                      window.scrollTo({ top: 150, behavior: 'smooth' });
                                    }, 100);
                                  }}
                                  className="flex-1 bg-[#c9a227] hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-full text-center transition shadow-md"
                                >
                                  Đăng ký tư vấn dự án này 📞
                                </button>
                                <a 
                                  href={`tel:${MD_CONFIG.hotline1}`}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-bold py-3 px-6 rounded-full text-center transition border"
                                >
                                  Gọi hotline đặt chỗ ngay 📞
                                </a>
                              </div>
                            </div>
                          </div>
                      </div>
                  ))}
                </div>
            </div>
        );
      case 'Đăng Ký Mua':
        const toggleNeed = (need: string) => {
          setRegNeeds(prev => 
            prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
          );
        };

        const registrationOptions = [
          'Tìm hiểu điều kiện mua',
          'Tư vấn vay vốn',
          'Nhận bảng giá',
          'Đăng ký tham quan dự án'
        ];

        return (
            <div className="space-y-10">
                <div className="border-b border-slate-100 pb-8 space-y-3">
                  <EditableText 
                    id="registration_title" 
                    text={customText.registration_title || 'ĐĂNG KÝ NHẬN TƯ VẤN NHÀ Ở XÃ HỘI PHỐ HIẾN'} 
                    isEditing={isEditing} 
                    onSave={handleSaveText} 
                    className="text-3xl md:text-4xl font-extrabold text-[#1a3c6e] tracking-tight leading-tight" 
                    as="h3" 
                  />
                  <EditableText 
                    id="registration_desc" 
                    text={customText.registration_desc || 'Kiểm tra điều kiện mua, hồ sơ vay vốn và nhận bảng giá mới nhất từ đội ngũ chuyên viên.'} 
                    isEditing={isEditing} 
                    onSave={handleSaveText} 
                    className="text-gray-600 font-sans text-base leading-relaxed md:text-lg max-w-4xl" 
                    as="p" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                  {/* Left Column: Benefits */}
                  <div className="space-y-8">
                    <EditableText 
                      id="registration_subtitle" 
                      text={customText.registration_subtitle || 'Quyền lợi khi đăng ký'} 
                      isEditing={isEditing} 
                      onSave={handleSaveText} 
                      className="font-bold text-2xl text-[#c9a227] tracking-wide uppercase" 
                      as="p" 
                    />
                    
                    <div className="space-y-4">
                      {[
                        'Kiểm tra điều kiện mua NOXH miễn phí',
                        'Tư vấn vay vốn ngân hàng ưu đãi',
                        'Nhận bảng giá và chính sách mới nhất',
                        'Hỗ trợ hoàn thiện hồ sơ từ A-Z',
                        'Đồng hành đến khi nhận nhà'
                      ].map((benefit, b_idx) => (
                        <div 
                          key={b_idx} 
                          className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/60 hover:bg-slate-100/50 hover:border-slate-200 transition-all duration-200 shadow-sm"
                        >
                          <span className="text-xl text-emerald-500 shrink-0 select-none">✅</span>
                          <span className="font-semibold text-slate-700 font-sans text-base leading-relaxed">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: High-conv Form OR Success message */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl relative overflow-hidden">
                    <span className="absolute top-0 left-0 w-full h-2 bg-[#c9a227]"></span>

                    {regSuccess ? (
                      <div className="text-center py-8 space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md border border-emerald-100">
                          <span className="text-4xl">🎉</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black text-[#1a3c6e]">Gửi thông tin thành công!</h4>
                          <p className="text-slate-600 font-medium font-sans">Cảm ơn <span className="font-bold text-[#c9a227]">{regName}</span> đã tin tưởng lựa chọn MD HOME SMART PHỐ HIẾN.</p>
                          <p className="text-sm text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">Đội ngũ chuyên viên sẽ chủ động liên hệ hỗ trợ bạn qua số điện thoại <span className="font-bold text-[#1a3c6e]">{regPhone}</span> trong vòng 15 phút tới.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setRegSuccess(false);
                            setRegName('');
                            setRegPhone('');
                            setRegNeeds([]);
                          }} 
                          className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-bold text-sm transition-colors duration-200 border border-slate-200 animate-pulse"
                        >
                          Quay lại form đăng ký
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h4 className="font-extrabold text-2xl text-[#1a3c6e] tracking-tight uppercase">NHẬN TƯ VẤN MIỄN PHÍ</h4>
                          <p className="text-sm text-gray-500 font-sans leading-relaxed">Điền thông tin để được chuyên viên liên hệ hỗ trợ trong thời gian sớm nhất.</p>
                        </div>

                        <form onSubmit={handleRegSubmit} className="space-y-5">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên</label>
                            <input 
                              type="text" 
                              placeholder="Nhập họ và tên của bạn" 
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-[#c9a227] focus:outline-none transition-all duration-200 font-sans font-medium text-[#1a3c6e]" 
                              required 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại</label>
                            <input 
                              type="tel" 
                              placeholder="Nhập số điện thoại nhận tư vấn" 
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-[#c9a227] focus:outline-none transition-all duration-200 font-sans font-medium text-[#1a3c6e]" 
                              required 
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nhu cầu quan tâm của bạn</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {registrationOptions.map((opt) => {
                                const isSelected = regNeeds.includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleNeed(opt)}
                                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold transition-all duration-200 select-none ${
                                      isSelected 
                                        ? 'border-[#c9a227] bg-[#c9a227]/5 text-[#c9a227]' 
                                        : 'border-slate-100 bg-slate-50/75 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                                      isSelected ? 'border-[#c9a227] bg-[#c9a227]' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isSelected && <span className="text-[10px] text-white">✓</span>}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="bg-[#c9a227] text-white p-4 rounded-2xl w-full font-bold text-lg hover:bg-yellow-600 hover:shadow-lg focus:ring-4 focus:ring-yellow-600/30 transition-all duration-300 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                          >
                            <span>📋</span>
                            <span>NHẬN TƯ VẤN MIỄN PHÍ</span>
                          </button>
                        </form>

                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 border-t border-slate-50 pt-4">
                          <span>🔒</span>
                          <span>Cam kết bảo mật thông tin khách hàng 100%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </div>
        );
      case 'Tin Tức':
        return (
            <div className="space-y-10">
               <EditableText id="news_section_title" text={customText.news_section_title || 'TIN TỨC BẤT ĐỘNG SẢN & CAM KẾT PHÁP LÝ'} isEditing={isEditing} onSave={handleSaveText} className="text-3xl font-extrabold text-[#1a3c6e] border-l-4 border-[#c9a227] pl-4" as="h3" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {NEWS.map((item, i) => (
                   <div key={i} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:border-amber-500/20 transition-all duration-300 flex flex-col justify-between group">
                       <div className="space-y-4">
                           <div className="relative overflow-hidden rounded-2xl h-56 w-full">
                               <EditableImage id={`news_full_${i}`} isEditing={isEditingImages} onClick={handleImageClick} customImages={customImages} src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                               <span className="absolute top-4 left-4 bg-[#1a3c6e] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                                   {item.date}
                               </span>
                           </div>
                           <div className="space-y-2 font-sans">
                               <h4 className="font-extrabold text-lg md:text-xl text-[#1a3c6e] group-hover:text-[#c9a227] transition-colors duration-300 line-clamp-2 leading-snug uppercase tracking-tight">
                                   {item.title}
                               </h4>
                               <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mt-1">
                                  <span>🗓️ Ngày đăng:</span> {item.date}
                               </p>
                               <p className="text-[#1a3c6e]/85 leading-relaxed text-sm font-medium line-clamp-3 pt-2 border-t border-slate-50">
                                   {item.desc}
                               </p>
                           </div>
                       </div>
                       <button 
                           onClick={() => setSelectedNews(item)}
                           className="bg-amber-500/10 hover:bg-[#c9a227] text-[#1a3c6e] hover:text-white font-extrabold text-sm py-3 px-5 rounded-2xl mt-5 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-amber-500/20 hover:border-transparent w-full"
                       >
                           <span>Đọc chi tiết bài viết 📄</span>
                           <span>→</span>
                       </button>
                   </div>
               ))}
               </div>
            </div>
        );
      case 'Tuyển Dụng':
        const handleApplyNow = (posTitle: string) => {
          setCareerPosition(posTitle);
          setTimeout(() => {
            document.getElementById('recruitment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        };

        return (
            <div className="space-y-12 animate-fade-in font-sans">
                {/* 1. Recruitment Banner */}
                <div className="relative bg-[#1a3c6e] text-white rounded-3xl p-8 md:p-12 overflow-hidden shadow-xl text-center md:text-left">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="relative max-w-3xl space-y-4">
                    <span className="bg-[#c9a227] text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">Cơ hội bứt phá 🚀</span>
                    <EditableText id="jobs_title" text={customText.jobs_title || 'GIA NHẬP ĐỘI NGŨ MD HOME SMART'} isEditing={isEditing} onSave={handleSaveText} className="text-2xl md:text-3xl font-extrabold tracking-normal leading-normal" as="h3" />
                    <p className="text-blue-100 text-sm md:text-lg leading-relaxed font-sans">Môi trường làm việc chuyên nghiệp, thu nhập hấp dẫn, cơ hội phát triển lâu dài trong lĩnh vực tư vấn và phân phối bất động sản Nhà ở Xã hội uy tín hàng đầu.</p>
                    
                    <div className="pt-4 flex flex-wrap gap-4 md:gap-6 justify-center md:justify-start font-bold text-xs md:text-sm text-amber-300">
                      <div className="flex items-center gap-2 bg-blue-950/40 px-4 py-2 rounded-2xl border border-blue-800/30">
                        <span>📍</span>
                        <span>Hưng Yên</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-950/40 px-4 py-2 rounded-2xl border border-blue-800/30">
                        <span>👥</span>
                        <span>Đang tuyển nhiều vị trí</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-950/40 px-4 py-2 rounded-2xl border border-blue-800/30">
                        <span>💰</span>
                        <span>Thu nhập cạnh tranh</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dynamic Career List */}
                <div className="space-y-6">
                  <div className="text-center md:text-left space-y-2">
                    <h4 className="font-extrabold text-[#1a3c6e] text-2xl tracking-tight uppercase">CÁC VỊ TRÍ ĐANG TUYỂN DỤNG</h4>
                    <p className="text-gray-500 font-sans text-sm max-w-2xl">Lựa chọn vị trí phù hợp với năng lực và mục tiêu sự nghiệp của bạn để đồng hành cùng chúng tôi. Nhấp trực tiếp để sửa thông tin tuyển dụng.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {positions.map((pos, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <span className="text-2xl shrink-0">📌</span>
                            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-nowrap select-none">Đang tuyển</span>
                          </div>
                          <div>
                            <h5 className="font-bold text-lg text-[#1a3c6e] group-hover:text-amber-600 transition-colors duration-300">
                              <EditableText id={`pos_title_${idx}`} text={pos.title} isEditing={isEditing} onSave={(id, text) => {
                                const updated = [...positions];
                                updated[idx] = { ...updated[idx], title: text };
                                setPositions(updated);
                              }} as="span" />
                            </h5>
                            <p className="text-xs font-semibold text-slate-400 mt-1 font-sans">
                              <EditableText id={`pos_type_b_${idx}`} text={pos.type} isEditing={isEditing} onSave={(id, text) => {
                                const updated = [...positions];
                                updated[idx] = { ...updated[idx], type: text };
                                setPositions(updated);
                              }} as="span" />
                            </p>
                          </div>

                          <div className="space-y-2 text-xs font-bold font-sans text-slate-600 pt-2 border-t border-slate-50">
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-slate-400">Số lượng:</span>
                              <span className="text-[#1a3c6e]">
                                <EditableText id={`pos_qty_${idx}`} text={pos.qty} isEditing={isEditing} onSave={(id, text) => {
                                  const updated = [...positions];
                                  updated[idx] = { ...updated[idx], qty: text };
                                  setPositions(updated);
                                }} as="span" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-slate-400">Hình thức:</span>
                              <span className="text-[#1a3c6e]">
                                <EditableText id={`pos_type_${idx}`} text={pos.type} isEditing={isEditing} onSave={(id, text) => {
                                  const updated = [...positions];
                                  updated[idx] = { ...updated[idx], type: text };
                                  setPositions(updated);
                                }} as="span" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-slate-400">Thu nhập:</span>
                              <span className="text-amber-600 font-extrabold">
                                <EditableText id={`pos_salary_${idx}`} text={pos.salary} isEditing={isEditing} onSave={(id, text) => {
                                  const updated = [...positions];
                                  updated[idx] = { ...updated[idx], salary: text };
                                  setPositions(updated);
                                }} as="span" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-slate-400">Kinh nghiệm:</span>
                              <span className="text-slate-700">
                                <EditableText id={`pos_exp_${idx}`} text={pos.exp} isEditing={isEditing} onSave={(id, text) => {
                                  const updated = [...positions];
                                  updated[idx] = { ...updated[idx], exp: text };
                                  setPositions(updated);
                                }} as="span" />
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider select-none">Mô tả công việc</p>
                            <div className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                              <EditableText id={`pos_desc_${idx}`} text={pos.desc} isEditing={isEditing} onSave={(id, text) => {
                                const updated = [...positions];
                                updated[idx] = { ...updated[idx], desc: text };
                                setPositions(updated);
                              }} as="p" />
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2 select-none">Quyền lợi nổi bật</p>
                            {pos.benefits && pos.benefits.map((b: string, bIdx: number) => (
                              <div key={bIdx} className="flex items-center gap-2 text-xs text-slate-700 font-sans font-semibold">
                                <span className="text-emerald-500">✓</span>
                                <EditableText id={`pos_benefit_${idx}_${bIdx}`} text={b} isEditing={isEditing} onSave={(id, text) => {
                                  const updated = [...positions];
                                  const updatedB = [...updated[idx].benefits];
                                  updatedB[bIdx] = text;
                                  updated[idx] = { ...updated[idx], benefits: updatedB };
                                  setPositions(updated);
                                }} as="span" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleApplyNow(pos.title)}
                          className="w-full bg-[#1a3c6e] hover:bg-[#c9a227] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl mt-6 transition-all duration-300 shadow-sm cursor-pointer"
                        >
                          Ứng tuyển ngay 📝
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Form and Perks Section */}
                <div id="recruitment-form" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 border-t border-slate-100">
                  {/* Left panel: Why join us */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100/80 space-y-6">
                      <h4 className="font-extrabold text-[#1a3c6e] text-xl tracking-tight uppercase">Tại sao nên làm việc tại MD HOME SMART?</h4>
                      <p className="text-sm font-sans text-gray-500 leading-relaxed">Chúng tôi cam kết kiến tạo một không gian làm việc chuyên nghiệp, nhân văn, hỗ trợ đắc lực giúp bạn phát triển tốt nhất tiềm năng bản thân.</p>
                      
                      <div className="space-y-4 font-sans">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <span className="text-3xl shrink-0 select-none">🏆</span>
                          <div>
                            <h5 className="font-bold text-[#1a3c6e] text-sm">Thu nhập theo năng lực</h5>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">Lương cứng xuất sắc, hoa hồng vô hạn và các khoản thưởng nóng bứt phá doanh số.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <span className="text-3xl shrink-0 select-none">🎓</span>
                          <div>
                            <h5 className="font-bold text-[#1a3c6e] text-sm">Được đào tạo bài bản</h5>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">Học hỏi quy trình làm hồ sơ, luật nhà ở, kỹ năng trực tiếp từ các quản lý kinh nghiệm.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <span className="text-3xl shrink-0 select-none">🤝</span>
                          <div>
                            <h5 className="font-bold text-[#1a3c6e] text-sm">Môi trường làm việc chuyên nghiệp</h5>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">Gắn kết bền chặt, cơ chế văn minh, cơ sở hạ tầng hiện đại, đầy đủ thông tin pháp lý.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <span className="text-3xl shrink-0 select-none">🚀</span>
                          <div>
                            <h5 className="font-bold text-[#1a3c6e] text-sm">Cơ hội thăng tiến rõ ràng</h5>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">Lộ trình nâng cấp từ Nhân viên lên Nhóm trưởng và Giám đốc kinh doanh dự án minh bạch.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right panel: High-converting Recruitment Form */}
                  <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl relative overflow-hidden">
                    <span className="absolute top-0 left-0 w-full h-2 bg-[#c9a227]"></span>

                    {careerSuccess ? (
                      <div className="text-center py-12 space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md border border-emerald-100">
                          <span className="text-4xl">🎉</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black text-[#1a3c6e]">Nộp hồ sơ ứng tuyển thành công!</h4>
                          <p className="text-slate-600 font-medium font-sans">Cảm ơn <span className="font-bold text-[#c9a227]">{careerName}</span> đã lựa chọn nộp đơn ứng tuyển vào vị trí <span className="font-bold text-[#1a3c6e]">{careerPosition}</span>.</p>
                          <p className="text-sm text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">Bộ phận Tuyển dụng nhân sự sẽ nhanh chóng xét duyệt CV và chủ động liên hệ đặt lịch phỏng vấn với bạn qua SĐT <span className="font-bold text-[#1a3c6e]">{careerPhone}</span> hoặc Email sớm nhất.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setCareerSuccess(false);
                            setCareerName('');
                            setCareerPhone('');
                            setCareerEmail('');
                            setCareerFile(null);
                          }} 
                          className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-bold text-sm transition-colors duration-200 border border-slate-200"
                        >
                          Nộp tiếp hồ sơ khác
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-2xl text-[#1a3c6e] tracking-tight uppercase">GỬI YÊU CẦU ỨNG TUYỂN</h4>
                          <p className="text-xs text-gray-500 font-sans leading-relaxed">Điền thông tin và đính kèm CV tốt nhất của bạn. Chúng tôi sẽ phản hồi lịch hẹn trong vòng 24 giờ làm việc.</p>
                        </div>

                        <form onSubmit={handleCareerSubmit} className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Họ và tên *</label>
                              <input 
                                type="text" 
                                placeholder="Nhập họ và tên" 
                                value={careerName}
                                onChange={(e) => setCareerName(e.target.value)}
                                className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none transition-all duration-200 font-sans font-semibold text-[#1a3c6e]" 
                                required 
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Số điện thoại *</label>
                              <input 
                                type="tel" 
                                placeholder="Nhập số điện thoại liên lạc" 
                                value={careerPhone}
                                onChange={(e) => setCareerPhone(e.target.value)}
                                className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none transition-all duration-200 font-sans font-semibold text-[#1a3c6e]" 
                                required 
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Địa chỉ Email *</label>
                            <input 
                              type="email" 
                              placeholder="Nhập địa chỉ email cá nhân" 
                              value={careerEmail}
                              onChange={(e) => setCareerEmail(e.target.value)}
                              className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none transition-all duration-200 font-sans font-semibold text-[#1a3c6e]" 
                              required 
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Vị trí ứng tuyển</label>
                              <select 
                                value={careerPosition}
                                onChange={(e) => setCareerPosition(e.target.value)}
                                className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none bg-white cursor-pointer transition-all duration-200 font-sans font-semibold text-[#1a3c6e]"
                              >
                                <option value="Chuyên viên tư vấn NOXH">Chuyên viên tư vấn NOXH</option>
                                <option value="Trưởng nhóm kinh doanh">Trưởng nhóm kinh doanh</option>
                                <option value="CTV bán hàng (Cộng tác viên)">Cộng tác viên Kinh doanh</option>
                                <option value="Khác (Marketing, v.v.)">Vị trí Khác</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Kinh nghiệm làm việc</label>
                              <select 
                                value={careerExp}
                                onChange={(e) => setCareerExp(e.target.value)}
                                className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none bg-white cursor-pointer transition-all duration-200 font-sans font-semibold text-[#1a3c6e]"
                              >
                                <option value="Chưa có">Chưa có kinh nghiệm</option>
                                <option value="Dưới 1 năm">Dưới 1 năm kinh nghiệm</option>
                                <option value="Trên 1 năm">Trên 1 năm kinh nghiệm</option>
                              </select>
                            </div>
                          </div>

                          {/* CV Attachment Drag and Drop */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Tải hồ sơ / CV đính kèm</label>
                            <div 
                              className="border-2 border-dashed border-slate-200 hover:border-[#1a3c6e] active:border-[#c9a227] rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all duration-200"
                              onClick={() => document.getElementById('career-cv-upload')?.click()}
                            >
                              <input 
                                id="career-cv-upload" 
                                type="file" 
                                accept=".pdf,.doc,.docx" 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setCareerFile(e.target.files[0]);
                                  }
                                }}
                              />
                              <div className="space-y-2">
                                <span className="text-3xl block">📎</span>
                                {careerFile ? (
                                  <div className="space-y-1">
                                    <p className="text-sm font-bold text-emerald-600 truncate">{careerFile.name}</p>
                                    <p className="text-[10px] text-slate-400">{(careerFile.size / 1024 / 1024).toFixed(2)} MB • Nhấp để đổi file</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <p className="text-sm font-bold text-[#1a3c6e]">Chọn file PDF/DOC</p>
                                    <p className="text-[11px] text-slate-400">Kéo thả hoặc nhấp để tải lên (Tối đa 10MB)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="bg-[#c9a227] text-white p-4 rounded-2xl w-full font-bold text-lg hover:bg-yellow-600 hover:shadow-lg focus:ring-4 focus:ring-yellow-600/30 transition-all duration-300 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                          >
                            <span>📋</span>
                            <span>GỬI HỒ SƠ ỨNG TUYỂN</span>
                          </button>
                        </form>

                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 border-t border-slate-50 pt-4">
                          <span>🔒</span>
                          <span>Hồ sơ và thông tin ứng viên được cam kết bảo mật tuyệt đối</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </div>
        );
      case 'Liên Hệ':
        const contactOptions = [
          'Tìm hiểu điều kiện mua NOXH',
          'Tư vấn vay vốn ngân hàng',
          'Nhận bảng giá mới nhất',
          'Đăng ký tham quan dự án',
          'Hỗ trợ hoàn thiện hồ sơ',
          'Khác'
        ];
        const toggleContactNeed = (need: string) => {
          setContactNeeds(prev =>
            prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
          );
        };

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="border-b border-slate-100 pb-6">
                  <EditableText id="contact_title" text={customText.contact_title || 'LIÊN HỆ & ĐĂNG KÝ TƯ VẤN'} isEditing={isEditing} onSave={handleSaveText} className="text-3xl md:text-4xl font-extrabold text-[#1a3c6e]" as="h3" />
                  <p className="text-gray-500 font-sans mt-2">Để lại thông tin - nhận tư vấn miễn phí tức thì từ chuyên viên giàu kinh nghiệm.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Contact info */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100/80 space-y-6">
                      <h4 className="font-extrabold text-[#1a3c6e] text-xl tracking-tight">THÔNG TIN ĐẠI DIỆN</h4>
                      
                      <div className="space-y-4 font-sans text-base">
                        <div className="flex items-start gap-4">
                          <span className="text-2xl shrink-0 select-none">📞</span>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Hotline/Zalo hỗ trợ</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <a href={`tel:${MD_CONFIG.hotline1}`} className="font-extrabold text-[#1a3c6e] hover:text-[#c9a227] transition-all text-lg">{MD_CONFIG.hotline1}</a>
                              <span className="text-slate-300">|</span>
                              <a href={`tel:${MD_CONFIG.hotline2}`} className="font-extrabold text-[#1a3c6e] hover:text-[#c9a227] transition-all text-lg">{MD_CONFIG.hotline2}</a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <span className="text-2xl shrink-0 select-none">✉️</span>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email tiếp nhận hồ sơ</p>
                            <a href={`mailto:${MD_CONFIG.email}`} className="font-semibold text-[#1a3c6e] hover:text-[#c9a227] transition-all break-all">{MD_CONFIG.email}</a>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <span className="text-2xl shrink-0 select-none">📍</span>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Địa chỉ văn phòng</p>
                            <p className="font-semibold text-slate-700 leading-relaxed text-sm md:text-base">{MD_CONFIG.address}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <span className="text-2xl shrink-0 select-none">⏰</span>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Thời gian hoạt động</p>
                            <p className="font-semibold text-slate-700 text-sm md:text-base">Hỗ trợ 24/7 kể cả cuối tuần và ngày lễ</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <span className="text-2xl shrink-0 select-none">🎬</span>
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Kênh YouTube chính thức</p>
                            <a 
                              href="https://youtube.com/@ducxuan4021?si=TPwMUucjoUhXfdWD" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-bold text-rose-600 hover:text-rose-700 hover:underline transition-all flex items-center gap-1.5 text-sm md:text-base"
                            >
                              Nhà Ở Xã Hội - MĐ
                              <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">Sub 🔔</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Bản đồ vị trí dự án</p>
                      <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.923838383838!2d106.0486!3d20.65028!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135b1aa9c2ea2ef%3A0xe54d5d3ce9d1d3df!2zUXXhuqNuZyB0csaw4budbmcgTmd1eeG7hW4gVOG6pXQgVGjDoG5oLCBIxrFuZyBZZW4!5e0!3m2!1svi!2s!4v1688647702581!5m2!1svi!2s" width="100%" height="240" style={{border:0}} allowFullScreen loading="lazy" className="rounded-2xl border shadow-sm"></iframe>
                    </div>
                  </div>

                  {/* Right Column: Contact form */}
                  <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl relative overflow-hidden">
                    <span className="absolute top-0 left-0 w-full h-2 bg-[#1a3c6e]"></span>

                    {contactSuccess ? (
                      <div className="text-center py-10 space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md border border-emerald-100">
                          <span className="text-4xl">🎉</span>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black text-[#1a3c6e]">Gửi yêu cầu thành công!</h4>
                          <p className="text-slate-600 font-medium font-sans">Cảm ơn <span className="font-bold text-[#c9a227]">{contactName}</span> đã liên hệ với chúng tôi.</p>
                          <p className="text-sm text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">Bộ phận tư vấn hồ sơ sẽ chủ động gọi điện hỗ trợ bạn theo số <span className="font-bold text-[#1a3c6e]">{contactPhone}</span> trong vòng 15 phút tới.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setContactSuccess(false);
                            setContactName('');
                            setContactPhone('');
                            setContactNeeds([]);
                            setContactNote('');
                          }} 
                          className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-bold text-sm transition-colors duration-200 border border-slate-200"
                        >
                          Gửi yêu cầu mới
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h4 className="font-extrabold text-2xl text-[#1a3c6e] tracking-tight uppercase">ĐỂ LẠI THÔNG TIN - NHẬN TƯ VẤN MIỄN PHÍ</h4>
                          <p className="text-sm text-gray-500 font-sans leading-relaxed">Chuyên viên MD HOME SMART sẽ liên hệ hỗ trợ trong vòng 15 phút.</p>
                        </div>

                        <form onSubmit={handleContactSubmit} className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Họ và tên *</label>
                              <input 
                                type="text" 
                                placeholder="Họ tên của bạn" 
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none transition-all duration-200 font-sans font-semibold text-[#1a3c6e]" 
                                required 
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Số điện thoại *</label>
                              <input 
                                type="tel" 
                                placeholder="SĐT của bạn" 
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none transition-all duration-200 font-sans font-semibold text-[#1a3c6e]" 
                                required 
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Nhu cầu quan tâm</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {contactOptions.map((opt) => {
                                const isSelected = contactNeeds.includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleContactNeed(opt)}
                                    className={`flex items-center gap-2 p-3 rounded-2xl border text-left text-xs font-bold transition-all duration-200 select-none ${
                                      isSelected 
                                        ? 'border-[#1a3c6e] bg-[#1a3c6e]/5 text-[#1a3c6e]' 
                                        : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                      isSelected ? 'border-[#1a3c6e] bg-[#1a3c6e]' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isSelected && <span className="text-[10px] text-white">✓</span>}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Ghi chú thêm (không bắt buộc)</label>
                            <textarea 
                              placeholder="Lời nhắn hoặc mô tả cụ thể nhu cầu của bạn..." 
                              value={contactNote}
                              onChange={(e) => setContactNote(e.target.value)}
                              rows={2}
                              className="w-full border-2 border-slate-100 p-3.5 rounded-2xl focus:border-[#1a3c6e] focus:outline-none transition-all duration-200 font-sans text-sm font-medium text-[#1a3c6e] resize-none"
                            />
                          </div>

                          <button 
                            type="submit" 
                            className="bg-[#c9a227] text-white p-4 rounded-2xl w-full font-bold text-lg hover:bg-yellow-600 hover:shadow-lg focus:ring-4 focus:ring-yellow-600/30 transition-all duration-300 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                          >
                            <span>📋</span>
                            <span>NHẬN TƯ VẤN NGAY</span>
                          </button>
                        </form>

                        {/* Trust indicators under the button */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-[11px] font-bold text-slate-400">
                          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                            <span>🔒</span>
                            <span className="truncate">Bảo mật thông tin khách hàng</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-center">
                            <span>📞</span>
                            <span className="truncate">Hotline: {MD_CONFIG.hotline1}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-center sm:justify-end">
                            <span>👨‍💼</span>
                            <span className="truncate">Hơn 500 khách hàng đã được hỗ trợ</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </div>
        );
      case '🎥 Cộng Đồng & Video Chia Sẻ':
        return (
          <div className="space-y-10 animate-fade-in font-sans">
            {/* Header section with editable titles */}
            <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <EditableText 
                  id="video_sec_title" 
                  text={customText.video_sec_title || 'VIDEO HƯỚNG DẪN & CỘNG ĐỒNG CHIA SẺ'} 
                  isEditing={isEditing} 
                  onSave={handleSaveText} 
                  className="text-3xl md:text-4xl font-extrabold text-[#1a3c6e] uppercase tracking-tight" 
                  as="h3" 
                />
                <EditableText 
                  id="video_sec_subtitle" 
                  text={customText.video_sec_subtitle || 'Tổng hợp các video giới thiệu dự án, điều kiện mua Nhà ở Xã hội, hướng dẫn hồ sơ vay vốn và cập nhật tiến độ mới nhất.'} 
                  isEditing={isEditing} 
                  onSave={handleSaveText} 
                  className="text-slate-500 font-sans mt-2" 
                  as="p" 
                />
              </div>
              
              {/* Add Video Button for Admin */}
              {adminLoggedIn && (
                <button 
                  onClick={handleOpenAddVideo}
                  className="bg-[#c9a227] hover:bg-yellow-600 text-white font-extrabold px-6 py-3 rounded-2xl transition shadow-md flex items-center gap-2 cursor-pointer text-sm shrink-0 uppercase tracking-wider"
                >
                  <span>📺 Thêm Video Mới</span>
                </button>
              )}
            </div>

            {/* YouTube Channel Featured Banner */}
            <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-rose-500/30 relative overflow-hidden group">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20 group-hover:bg-white/10 transition-all duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/20 rounded-full blur-xl"></div>
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 z-10">
                <div className="space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 text-rose-100 shadow-sm">
                    <svg className="w-4 h-4 fill-current text-white animate-pulse" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span>Kênh YouTube Độc Quyền</span>
                  </div>
                  
                  <h4 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                    NHÀ Ở XÃ HỘI - MĐ
                  </h4>
                  
                  <p className="text-sm sm:text-base text-rose-50/90 max-w-2xl font-medium font-sans leading-relaxed">
                    Theo dõi kênh YouTube chính thức <strong className="text-white underline decoration-amber-400 decoration-2">Nhà Ở Xã Hội - MĐ</strong> để cập nhật nhanh nhất tiến độ xây dựng thực tế, phân tích điều kiện xét duyệt hồ sơ mua Nhà ở xã hội Phố Hiến, và hướng dẫn thủ tục ngân hàng chi tiết.
                  </p>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-sans text-rose-100 pt-1">
                    <span className="flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-xl font-bold">
                      🔔 Cập nhật liên tục 24/7
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-xl font-bold">
                      🎬 Chất lượng hình ảnh Full HD / 4K
                    </span>
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto text-center">
                  <a 
                    href="https://youtube.com/@ducxuan4021?si=TPwMUucjoUhXfdWD" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-rose-50 text-rose-700 font-extrabold text-sm sm:text-base px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97] shadow-lg hover:shadow-xl uppercase tracking-wider cursor-pointer font-sans"
                  >
                    <svg className="w-5 h-5 fill-current text-rose-600" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span>Truy cập YouTube Channel</span>
                  </a>
                  <p className="text-[11px] text-rose-200 mt-2.5 font-bold font-sans tracking-wide uppercase">@ducxuan4021</p>
                </div>
              </div>
            </div>

            {/* Video List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((item, i) => (
                <div 
                  key={i} 
                  className="bg-white border border-slate-150/80 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:border-amber-500/20 transition-all duration-300 flex flex-col justify-between group h-full"
                >
                  <div className="space-y-4">
                    {/* Interactive YouTube Thumbnail */}
                    <div 
                      onClick={() => setPlayingVideoUrl(item.url)}
                      className="relative overflow-hidden rounded-2xl h-48 w-full cursor-pointer"
                    >
                      <img 
                        src={getYouTubeThumbnail(item.url)} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors duration-300">
                        <div className="w-14 h-14 bg-red-600 group-hover:bg-[#c9a227] group-hover:scale-110 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform">
                          <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-extrabold text-base md:text-lg text-[#1a3c6e] group-hover:text-[#c9a227] transition-all line-clamp-2 leading-snug uppercase tracking-tight">
                        {item.title}
                      </h4>
                      <p className="text-[#1a3c6e]/85 leading-relaxed text-sm font-medium line-clamp-3 pt-1 border-t border-slate-50 font-sans">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <button 
                      onClick={() => setPlayingVideoUrl(item.url)}
                      className="bg-amber-50/50 hover:bg-[#c9a227] text-[#1a3c6e] hover:text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/10 hover:border-transparent"
                    >
                      <span>Xem trực tiếp 🎥</span>
                    </button>

                    {adminLoggedIn && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button 
                          onClick={() => handleOpenEditVideo(i)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl transition cursor-pointer text-center"
                        >
                          ✏️ Sửa Video
                        </button>
                        <button 
                          onClick={() => handleDeleteVideo(i)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2 rounded-xl transition cursor-pointer text-center border border-red-100"
                        >
                          🗑️ Xóa Video
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {videos.length === 0 && (
              <div className="text-center py-16 space-y-4">
                <span className="text-6xl text-slate-300">📹</span>
                <p className="text-slate-500 font-semibold font-sans">Chưa có video hướng dẫn nào được thêm.</p>
                {adminLoggedIn && (
                  <button 
                    onClick={handleOpenAddVideo}
                    className="bg-[#c9a227] text-white font-bold px-6 py-2.5 rounded-full hover:bg-yellow-600 transition"
                  >
                    Thêm video đầu tiên
                  </button>
                )}
              </div>
            )}
          </div>
        );
      case '⚙️ Quản Trị Hệ Thống':
        if (!adminLoggedIn) {
          return (
            <div className="text-center py-16 space-y-4">
              <span className="text-5xl select-none">🔒</span>
              <h3 className="text-2xl font-bold text-[#1a3c6e]">Vui lòng đăng nhập quyền quản trị</h3>
              <p className="text-slate-500 font-sans text-sm max-w-sm mx-auto">Khu vực này chứa dữ liệu bảo mật, chỉ dành riêng cho chuyên viên quản lý nội dung của MD HOME SMART.</p>
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="bg-[#1a3c6e] hover:bg-[#c9a227] text-white px-6 py-2.5 rounded-xl font-bold transition-all duration-300 cursor-pointer"
              >
                Đăng Nhập Quản Trị 🔑
              </button>
            </div>
          );
        }

        const unifiedLeads = getUnifiedLeadsList();
        
        // Filter leads
        const filteredLeads = unifiedLeads.filter(lead => {
          const s = leadSearchTerm.toLowerCase();
          return (
            (lead.name && lead.name.toLowerCase().includes(s)) ||
            (lead.phone && lead.phone.includes(s)) ||
            (lead.source && lead.source.toLowerCase().includes(s)) ||
            (lead.details && lead.details.toLowerCase().includes(s))
          );
        });

        const handleAddJob = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newJobTitle || !newJobQty || !newJobSalary) {
            alert("Vui lòng điền đầy đủ các trường thông tin cơ bản!");
            return;
          }
          const benefitArray = newJobBenefits ? newJobBenefits.split(',').map(b => b.trim()).filter(Boolean) : ['Đào tạo bài bản từ đầu', 'Hỗ trợ tệp khách hàng chất lượng', 'Thu nhập hoa hồng cực cao'];
          const newPos = {
            title: newJobTitle,
            qty: newJobQty,
            salary: newJobSalary,
            exp: newJobExp || 'Không yêu cầu',
            type: newJobType,
            desc: newJobDesc || 'Sẽ được quản lý trao đổi trực tiếp trong buổi phỏng vấn.',
            benefits: benefitArray
          };
          const updated = [...positions, newPos];
          setPositions(updated);
          localStorage.setItem('recruitmentPositions', JSON.stringify(updated));
          
          // Reset fields
          setNewJobTitle('');
          setNewJobQty('');
          setNewJobSalary('');
          setNewJobExp('');
          setNewJobDesc('');
          setNewJobBenefits('');
          alert("✓ Thêm vị trí tuyển dụng mới thành công!");
        };

        const handleDeleteJob = (index: number) => {
          if (!window.confirm(`Bạn có chắc chắn muốn xóa vị trí tuyển dụng "${positions[index].title}"?`)) return;
          const updated = positions.filter((_, i) => i !== index);
          setPositions(updated);
          localStorage.setItem('recruitmentPositions', JSON.stringify(updated));
        };

        const handleToggleTab = (tabName: string) => {
          if (hiddenTabs.includes(tabName)) {
            setHiddenTabs(hiddenTabs.filter(t => t !== tabName));
          } else {
            setHiddenTabs([...hiddenTabs, tabName]);
          }
        };

        return (
          <div className="space-y-8 animate-fade-in font-sans">
            {/* Admin Banner */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-2xl select-none">⚙️</span>
                  <h3 className="text-xl md:text-2xl font-black uppercase text-yellow-400 select-none">Hệ Thống Quản Trị Dự Án</h3>
                </div>
                <p className="text-slate-400 text-xs md:text-sm font-sans max-w-2xl">
                  Quản lý bảng data khách hàng tiềm năng, bật/tắt hiển thị danh mục và cập nhật tức thì các vị trí tuyển dụng của MD HOME SMART.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button 
                  onClick={() => {
                    setIsEditingText(!isEditingText);
                  }}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                    isEditingText ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>✍️</span> {isEditingText ? 'Tắt sửa Text' : 'Sửa Text Nhanh'}
                </button>
                <button 
                  onClick={() => {
                    setIsEditingImages(!isEditingImages);
                  }}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                    isEditingImages ? 'bg-blue-500 text-white ring-2 ring-blue-300 font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>🖼️</span> {isEditingImages ? 'Tắt sửa Ảnh' : 'Sửa Ảnh Nhanh'}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans select-none">Tổng Khách Đăng Ký</span>
                <span className="text-[#1a3c6e] text-2xl font-black mt-2">{unifiedLeads.length}</span>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans select-none">Đang Đăng Tuyển</span>
                <span className="text-emerald-700 text-2xl font-black mt-2">{positions.length} vị trí</span>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans select-none font-extrabold">Số Lượng Mục Ẩn</span>
                <span className="text-amber-700 text-2xl font-black mt-2">{hiddenTabs.length} mục</span>
              </div>
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-sans select-none">Hệ Thống</span>
                <span className="text-purple-700 text-2xl font-black mt-2">Đang Chạy</span>
              </div>
            </div>

            {/* Tab/Section Display Configuration */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="font-extrabold text-[#1a3c6e] text-md uppercase flex items-center gap-1.5">
                  <span>👁️</span> Cấu Hình Ẩn / Hiện Mục Điều Hướng Website
                </h4>
                <span className="text-[11px] text-slate-400 font-sans">Tick chọn ô đỏ để ẩn danh mục khỏi người xem</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 pt-1">
                {TABS.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => handleToggleTab(tab)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-left font-bold text-[11px] uppercase cursor-pointer select-none ${
                      hiddenTabs.includes(tab)
                        ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/50 hover:scale-[1.02]'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50 hover:scale-[1.02]'
                    }`}
                  >
                    <span className="truncate">{tab}</span>
                    <span className="text-xs font-black">{hiddenTabs.includes(tab) ? '❌' : '✓'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sheets-Style Lead Master Database */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-[#1a3c6e] text-md uppercase flex items-center gap-1.5">
                    <span>📊</span> Hệ Thống Đồng Bộ & Quản Lý Khách Hàng Đăng Ký
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">Đồng bộ hoàn hảo giữa lưu trữ cục bộ, Trợ Lý AI Chatbot và trang tính Google Sheet của bạn.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {adminSubTab === 'local' && (
                    <button 
                      onClick={handleExcelDownload}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 shadow-sm cursor-pointer font-sans"
                    >
                      <span>📥</span> Xuất File Excel / CSV
                    </button>
                  )}
                  {adminSubTab === 'sheets' && (
                    <button 
                      onClick={fetchSheetLeads}
                      disabled={sheetLoading}
                      className="bg-[#1a3c6e] hover:bg-[#c9a227] disabled:bg-slate-300 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 shadow-sm cursor-pointer font-sans"
                    >
                      <span>{sheetLoading ? '🔄' : '🔄'}</span> {sheetLoading ? 'Đang tải...' : 'Tải lại trang tính'}
                    </button>
                  )}
                </div>
              </div>

              {/* View Selector Tabs */}
              <div className="flex border-b border-slate-100 select-none">
                <button
                  onClick={() => setAdminSubTab('local')}
                  className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider transition-all border-b-2 -mb-[1px] cursor-pointer ${
                    adminSubTab === 'local'
                      ? 'border-[#c9a227] text-[#c9a227]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  📂 Khách Hàng Local & AI Chatbot ({unifiedLeads.length})
                </button>
                <button
                  onClick={() => {
                    setAdminSubTab('sheets');
                    fetchSheetLeads();
                  }}
                  className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider transition-all border-b-2 -mb-[1px] cursor-pointer ${
                    adminSubTab === 'sheets'
                      ? 'border-[#c9a227] text-[#c9a227]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  🟢 Live Google Sheet ({sheetLeads ? sheetLeads.rows.length : '0'})
                </button>
              </div>

              {adminSubTab === 'local' ? (
                <>
                  {/* Filtering Search Bar */}
                  <div className="flex items-center bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-xl">
                    <span className="text-sm mr-2 select-none">🔍</span>
                    <input 
                      type="text" 
                      value={leadSearchTerm}
                      onChange={(e) => setLeadSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm khách đăng ký theo Tên, Số điện thoại, Nguồn..." 
                      className="bg-transparent text-xs w-full focus:outline-none placeholder-slate-400 font-sans font-medium text-slate-700"
                    />
                  </div>

                  {/* Local Table */}
                  <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-[#1a3c6e] uppercase text-[10px] tracking-wider font-black select-none">
                          <th className="p-3 border-b border-slate-200">Họ và Tên</th>
                          <th className="p-3 border-b border-slate-200">Số Điện Thoại</th>
                          <th className="p-3 border-b border-slate-200 text-center">Nguồn Bản Ghi</th>
                          <th className="p-3 border-b border-slate-200">Nội Dung Chi Tiết Nhu Cầu</th>
                          <th className="p-3 border-b border-slate-200">Thời Gian Nhận</th>
                          <th className="p-3 border-b border-slate-200 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-bold font-sans">
                              Không tìm thấy dữ liệu khách hàng đăng ký nào phù hợp.
                            </td>
                          </tr>
                        ) : (
                          filteredLeads.map((row) => (
                            <tr key={row.id} className="hover:bg-amber-500/5 bg-white border-b border-slate-100 transition-all font-sans font-semibold text-slate-600">
                              <td className="p-3 font-bold text-[#1a3c6e]">{row.name}</td>
                              <td className="p-3 text-emerald-700 font-bold">{row.phone}</td>
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
                              <td className="p-3 max-w-xs md:max-w-md truncate hover:text-clip hover:whitespace-normal transition-all" title={row.details}>
                                {row.details}
                              </td>
                              <td className="p-3 text-slate-400 text-nowrap">{row.date}</td>
                              <td className="p-3 text-center">
                                <button 
                                  onClick={() => handleDeleteLead(row.id)}
                                  className="text-rose-600 hover:text-white hover:bg-rose-600 px-2 py-1 rounded border border-rose-200 transition font-extrabold text-[10px] uppercase cursor-pointer"
                                  title="Xóa dòng đăng ký khách hàng lẻ"
                                >
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Google Sheets Live Header Info */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Trạng thái Google Sheet:</span>
                        {sheetLoading ? (
                          <span className="inline-flex items-center bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-blue-100 font-sans">🔄 Đang cập nhật dữ liệu...</span>
                        ) : sheetError ? (
                          <span className="inline-flex items-center bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-100 font-sans">🔴 Lỗi kết nối</span>
                        ) : (
                          <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 font-sans">🟢 Đang đồng bộ trực tuyến</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#1a3c6e] font-sans">
                        Sheet ID liên kết: <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded select-all">1RihHFmMVFbncctAWoDTe3c0Y_CVV5CDRqDCHRD0FIg0</span>
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        const elem = document.getElementById('sheet_setup_guide_block');
                        if (elem) elem.classList.toggle('hidden');
                      }}
                      className="text-[#1a3c6e] hover:text-[#c9a227] font-bold text-xs flex items-center gap-1.5 cursor-pointer underline"
                    >
                      <span>💡</span> Hướng dẫn thiết lập 2 phút
                    </button>
                  </div>

                  {/* Hidden Step-by-Step setup instructions */}
                  <div id="sheet_setup_guide_block" className="hidden bg-amber-50/50 border border-amber-100 p-5 rounded-2xl space-y-4 text-xs leading-relaxed text-slate-700 font-sans">
                    <p className="font-black text-[#1a3c6e] text-sm uppercase">🛠️ HƯỚNG DẪN ĐỒNG BỘ GOOGLE SHEET CHO NGƯỜI KHÔNG CHUYÊN IT</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <p className="font-semibold"><span className="text-amber-600 font-bold">Bước 1:</span> Truy cập Google Sheet của bạn qua ID ở trên.</p>
                        <p className="font-semibold"><span className="text-amber-600 font-bold">Bước 2:</span> Click vào <span className="font-bold">Tiện ích mở rộng (Extensions)</span> → <span className="font-bold">Apps Script</span>.</p>
                        <p className="font-semibold"><span className="text-amber-600 font-bold">Bước 3:</span> Xóa sạch toàn bộ code mặc định có sẵn.</p>
                        <p className="font-semibold"><span className="text-amber-600 font-bold">Bước 4:</span> Copy đoạn code bên phải và dán trực tiếp vào Apps Script.</p>
                        <p className="font-semibold"><span className="text-amber-600 font-bold">Bước 5:</span> Click <span className="font-bold">Lưu (Save)</span> → <span className="font-bold">Triển khai (Deploy)</span> → <span className="font-bold">Triển khai mới (New deployment)</span>.</p>
                        <p className="font-semibold"><span className="text-amber-600 font-bold">Bước 6:</span> Chọn loại hình là <span className="font-bold">Ứng dụng Web (Web app)</span>. Đặt quyền truy cập <span className="font-bold">"Bất kỳ ai" (Anyone)</span>. Bấm Triển khai và copy đường link URL kết quả dán vào file cấu hình!</p>
                      </div>

                      <div className="space-y-2">
                        <p className="font-black text-slate-500 uppercase">Mã nguồn Google Apps Script (Copy bên dưới):</p>
                        <textarea
                          readOnly
                          onClick={(e) => {
                            (e.target as HTMLTextAreaElement).select();
                            alert("Đã chọn toàn bộ mã nguồn! Hãy bấm Ctrl+C để copy.");
                          }}
                          value={`function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById("1RihHFmMVFbncctAWoDTe3c0Y_CVV5CDRqDCHRD0FIg0").getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.name || "N/A",
      "'" + (data.phone || "N/A"),
      data.email || "N/A",
      data.source || "N/A",
      data.details || "N/A",
      data.date || new Date().toLocaleString("vi-VN")
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                          rows={11}
                          className="w-full bg-slate-900 text-amber-400 p-3 rounded-xl font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500 border border-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {sheetError && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-700 text-xs font-semibold font-sans">
                      ⚠️ Lỗi: {sheetError}. Vui lòng kiểm tra xem bạn đã chia sẻ quyền xem Google Sheet của bạn thành "Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view) chưa!
                    </div>
                  )}

                  {/* Google Sheet Live Report Table */}
                  <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-[#1a3c6e] uppercase text-[10px] tracking-wider font-black select-none">
                          {sheetLeads && sheetLeads.cols && sheetLeads.cols.length > 0 ? (
                            sheetLeads.cols.map((col, idx) => (
                              <th key={idx} className="p-3 border-b border-slate-200">{col || `Cột ${idx + 1}`}</th>
                            ))
                          ) : (
                            <>
                              <th className="p-3 border-b border-slate-200">Cột A</th>
                              <th className="p-3 border-b border-slate-200">Cột B</th>
                              <th className="p-3 border-b border-slate-200">Cột C</th>
                              <th className="p-3 border-b border-slate-200">Cột D</th>
                              <th className="p-3 border-b border-slate-200">Cột E</th>
                              <th className="p-3 border-b border-slate-200">Cột F</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetLoading ? (
                          <tr>
                            <td colSpan={sheetLeads && sheetLeads.cols ? sheetLeads.cols.length : 6} className="p-12 text-center text-[#1a3c6e] font-bold font-sans">
                              <span className="inline-block animate-spin mr-2">🔄</span> Đang nạp dữ liệu từ Google Sheet...
                            </td>
                          </tr>
                        ) : sheetLeads && sheetLeads.rows && sheetLeads.rows.length > 0 ? (
                          sheetLeads.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-amber-500/5 bg-white border-b border-slate-100 transition-all font-sans font-semibold text-slate-600">
                              {row.map((cell: any, cIdx: number) => (
                                <td key={cIdx} className="p-3">{cell || 'N/A'}</td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={sheetLeads && sheetLeads.cols ? sheetLeads.cols.length : 6} className="p-12 text-center text-slate-400 font-bold font-sans">
                              Chưa tải dữ liệu từ Google Sheet. Bấm nút "Tải lại trang tính" ở góc trên để nạp dữ liệu trực tiếp.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Recruiting Management Board */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-[#1a3c6e] text-md uppercase flex items-center gap-1.5">
                  <span>💼</span> Danh Sách Vị Trí Đang Đăng Tuyển Nhân Sự
                </h4>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">Xóa bớt hoặc thêm mới vị trí tuyển dụng nhanh chóng và cập nhật trực tiếp lên tab tuyển dụng.</p>
              </div>

              {/* Current Job Positions Table */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {positions.length === 0 ? (
                    <div className="col-span-full bg-slate-50 p-6 text-center text-slate-400 rounded-2xl font-bold border border-dashed text-xs">
                      Không có vị trí tuyển dụng nào đang chạy.
                    </div>
                  ) : (
                    positions.map((pos, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex justify-between items-start gap-4">
                        <div className="space-y-1 font-sans">
                          <p className="font-bold text-slate-800 text-xs leading-tight">{pos.title}</p>
                          <div className="flex flex-wrap gap-1 text-[9px] font-bold text-slate-400 uppercase select-none">
                            <span className="bg-amber-100 text-amber-800 px-1 rounded">{pos.qty}</span>
                            <span className="bg-slate-200 text-slate-700 px-1 rounded">{pos.salary}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteJob(index)}
                          className="bg-white hover:bg-rose-600 border border-slate-200 hover:border-rose-600 hover:text-white text-rose-500 p-1.5 rounded-lg transition text-xs font-black cursor-pointer shadow-sm"
                          title="Xóa tin đăng tuyển"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Job Form */}
              <form onSubmit={handleAddJob} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-[11px] font-extrabold text-[#1a3c6e] uppercase tracking-wider select-none">➕ ĐĂNG BÀI TUYỂN DỤNG MỚI</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tên vị trí tuyển</label>
                    <input 
                      type="text" 
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      placeholder="VD: Chuyên viên tư vấn NOXH" 
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Số lượng tuyển</label>
                    <input 
                      type="text" 
                      value={newJobQty}
                      onChange={(e) => setNewJobQty(e.target.value)}
                      placeholder="VD: 05 nhân viên" 
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mức thu nhập</label>
                    <input 
                      type="text" 
                      value={newJobSalary}
                      onChange={(e) => setNewJobSalary(e.target.value)}
                      placeholder="VD: 10 - 25 triệu/tháng" 
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Yêu cầu kinh nghiệm</label>
                    <input 
                      type="text" 
                      value={newJobExp}
                      onChange={(e) => setNewJobExp(e.target.value)}
                      placeholder="VD: Có 6 tháng trở lên" 
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Hình thức làm việc</label>
                    <select 
                      value={newJobType}
                      onChange={(e) => setNewJobType(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                    >
                      <option value="Toàn thời gian">Toàn thời gian</option>
                      <option value="Bán thời gian">Bán thời gian / CTV</option>
                      <option value="Thực tập sinh">Thực tập sinh</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Quyền lợi (cách nhau bằng dấu phẩy ",")</label>
                    <input 
                      type="text" 
                      value={newJobBenefits}
                      onChange={(e) => setNewJobBenefits(e.target.value)}
                      placeholder="VD: Thưởng nóng, Du lịch nghỉ dưỡng, Cầm tay chỉ việc" 
                      className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mô tả tóm tắt quyền lợi & công việc</label>
                  <textarea 
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    placeholder="VD: Tìm kiếm, chăm sóc tệp khách hàng mua nhà ở xã hội tại Hưng Yên. Hỗ trợ học việc từ đầu..." 
                    rows={2}
                    className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-amber-500 font-sans font-bold text-slate-700 shadow-sm"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    type="submit"
                    className="bg-[#1a3c6e] hover:bg-[#c9a227] text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition duration-300 shadow-sm cursor-pointer"
                  >
                    Đăng tin mới 🚀
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const visibleTabs = TABS.filter(tab => !hiddenTabs.includes(tab));
  const headerTabs = adminLoggedIn ? [...visibleTabs, '⚙️ Quản Trị Hệ Thống'] : visibleTabs;

  // Auto-redirect if activeTab is hidden
  useEffect(() => {
    if (!headerTabs.includes(activeTab) && headerTabs.length > 0) {
      setActiveTab('Trang Chủ');
    }
  }, [headerTabs, activeTab]);

  // Cuộn lên đầu trang mỗi khi chuyển đổi Tab để nội dung luôn hiển thị hoàn hảo trên mọi thiết bị
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50/50">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
      
      {isUploadingImage && (
        <div className="fixed top-24 right-6 bg-slate-900 text-white font-sans text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-2.5 z-[2100] animate-bounce">
          <span className="inline-block animate-spin text-amber-400 text-sm">🔄</span>
          <span>Đang tải ảnh lên đám mây (ImgBB)...</span>
        </div>
      )}

      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogin={handleLogin} 
        tabs={headerTabs} 
        adminLoggedIn={adminLoggedIn} 
        onLogout={() => {
          setAdminLoggedIn(false);
          setIsEditingText(false);
          setIsEditingImages(false);
        }}
        isEditingText={isEditingText}
        setIsEditingText={setIsEditingText}
        isEditingImages={isEditingImages}
        setIsEditingImages={setIsEditingImages}
      />
      {activeTab === 'Trang Chủ' ? (
        <main className="flex-grow max-w-[1536px] mx-auto w-full px-2 xs:px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-10">
          {renderContent(isEditingText)}
        </main>
      ) : (
        <main className="flex-grow max-w-[1536px] mx-auto w-full px-2 xs:px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-10">
          {activeTab !== '⚙️ Quản Trị Hệ Thống' && (
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-4 sm:mb-6 text-[#1a3c6e] border-l-4 border-[#c9a227] pl-3 sm:pl-4 leading-normal">{activeTab}</h2>
          )}
          <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl p-3 xs:p-5 sm:p-8 md:p-10 text-[#1a3c6e] border border-slate-100/80">
            {renderContent(isEditingText)}
          </div>
        </main>
      )}
      <Footer setActiveTab={setActiveTab} onLogin={handleLogin} hiddenTabs={hiddenTabs} />
      <FloatingButtons onZaloClick={() => setShowZaloQrModal(true)} />
      <Chatbot onLeadSubmit={handleChatbotLead} />
      {/* Admin Panel */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          adminUsers={adminUsers}
          onLoginSuccess={(email) => {
            setAdminLoggedIn(true);
            setCurrentAdminEmail(email);
            setIsEditingText(true);
            setIsEditingImages(true);
          }} 
        />
      )}
      {adminLoggedIn && (
        <AdminBar 
          onClose={() => {
            setAdminLoggedIn(false);
            setCurrentAdminEmail('');
            setIsEditingText(false);
            setIsEditingImages(false);
          }} 
          editText={isEditingText}
          setEditText={setIsEditingText}
          editImages={isEditingImages}
          setEditImages={setIsEditingImages}
          onOpenDashboard={() => setIsAdminDashboardOpen(true)}
        />
      )}

      {/* Full-featured Administration Dashboard Overlay */}
      {adminLoggedIn && (
        <AdminDashboard 
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          isEditingText={isEditingText}
          setIsEditingText={setIsEditingText}
          isEditingImages={isEditingImages}
          setIsEditingImages={setIsEditingImages}
          customText={customText}
          setCustomText={setCustomText}
          customImages={customImages}
          setCustomImages={setCustomImages}
          leads={leads}
          setLeads={setLeads}
          unifiedLeads={getUnifiedLeadsList()}
          handleDeleteLead={handleDeleteLead}
          leadSearchTerm={leadSearchTerm}
          setLeadSearchTerm={setLeadSearchTerm}
          handleExcelDownload={handleExcelDownload}
          sheetLeads={sheetLeads}
          sheetLoading={sheetLoading}
          sheetError={sheetError}
          fetchSheetLeads={fetchSheetLeads}
          positions={positions}
          setPositions={setPositions}
          videos={videos}
          setVideos={setVideos}
          hiddenTabs={hiddenTabs}
          setHiddenTabs={setHiddenTabs}
          TABS={TABS}
          adminUsers={adminUsers}
          setAdminUsers={setAdminUsers}
          currentAdminEmail={currentAdminEmail}
        />
      )}

      {/* Zalo QR Code Modal */}
      {showZaloQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 relative shadow-2xl border border-slate-100 flex flex-col items-center">
            {/* Close button */}
            <button 
              onClick={() => setShowZaloQrModal(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-250 text-slate-700 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xl transition-all cursor-pointer shadow-sm select-none"
              title="Đóng"
            >
              ×
            </button>
            
            {/* Mascot Icon / Header */}
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl shadow mb-3 select-none">
              💬
            </div>
            
            <h3 className="text-xl font-extrabold text-[#1a3c6e] text-center uppercase tracking-wide">
              KẾT NỐI QUA ZALO
            </h3>
            <p className="text-[11px] text-[#c9a227] font-black uppercase tracking-wider text-center mt-1 select-none">
              Trưởng Phòng Kinh Doanh MD HOME Phố Hiến
            </p>
            
            {/* QR Code Container */}
            <div className="my-6 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner flex flex-col items-center justify-center relative group">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https://zalo.me/${MD_CONFIG.hotline1.replace(/^0/, '84')}`}
                alt="Zalo QR Code 0904031123"
                className="w-48 h-48 rounded-xl object-contain shadow-md border border-white"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-1 bg-blue-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow select-none uppercase tracking-wider">
                Quét mã QR để nhắn tin
              </span>
            </div>

            {/* Direct Contact info */}
            <div className="w-full space-y-2.5 text-center mb-6">
              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                <p className="text-xs text-slate-400 font-bold select-none uppercase tracking-wider">Số điện thoại Zalo của Trưởng phòng:</p>
                <p className="text-xl font-black text-blue-800 tracking-wide mt-1 select-all">{MD_CONFIG.hotline1}</p>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5 select-none">(Hỗ trợ 24/7 từ kiểm tra điều kiện đến hoàn thiện hồ sơ)</p>
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="flex flex-col gap-2.5 w-full">
              <a 
                href={`https://zalo.me/${MD_CONFIG.hotline1.replace(/^0/, '84')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#0068FF] hover:bg-[#0055d0] text-white font-extrabold text-sm text-center py-3.5 rounded-full transition-all duration-300 shadow-md hover:scale-[1.01] flex items-center justify-center gap-2 select-none"
              >
                <span>💬</span>
                <span>Mở Chat Zalo Trực Tiếp</span>
              </a>
              <button 
                onClick={() => setShowZaloQrModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center py-3 rounded-full transition-all select-none"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Detailed News Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-300">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative p-6 md:p-8 shadow-2xl border border-slate-100 transform transition-transform duration-300 scale-100">
            <button 
              onClick={() => setSelectedNews(null)} 
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center text-slate-700 transition font-extrabold text-xl cursor-pointer z-10"
              title="Đóng"
            >
              ×
            </button>
            <div className="space-y-6">
              <div>
                <span className="bg-[#c9a227]/10 text-[#c9a227] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-3 select-none">
                  📰 Tin tức dự án
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-[#1a3c6e] leading-snug uppercase">
                  {selectedNews.title}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5 select-none">
                  <span>🗓️ Ngày công bố:</span> {selectedNews.date}
                </p>
              </div>

              <img 
                src={selectedNews.image} 
                alt={selectedNews.title} 
                className="w-full h-64 md:h-96 object-cover rounded-2xl shadow-md"
                referrerPolicy="no-referrer"
              />

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-600 text-sm font-semibold leading-relaxed font-sans shadow-inner border-l-4 border-[#c9a227]">
                "{selectedNews.desc}"
              </div>

              <div className="space-y-4 text-slate-700 leading-relaxed text-sm md:text-base font-sans font-medium">
                {selectedNews.content ? (
                  selectedNews.content.split('\n\n').map((paragraph: string, idx: number) => (
                    <p key={idx} className="leading-relaxed whitespace-pre-wrap">{paragraph}</p>
                  ))
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{selectedNews.desc}</p>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    setActiveTab('Đăng Ký Mua');
                    setSelectedNews(null);
                    setTimeout(() => {
                      window.scrollTo({ top: 150, behavior: 'smooth' });
                    }, 100);
                  }}
                  className="flex-1 bg-[#c9a227] hover:bg-yellow-600 text-white font-extrabold py-3.5 px-6 rounded-2xl text-center transition shadow-md cursor-pointer text-sm"
                >
                  Đăng ký nhận tư vấn dự án này 📞
                </button>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-extrabold py-3.5 px-6 rounded-2xl text-center transition border cursor-pointer text-sm"
                >
                  Đóng bài viết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic YouTube Theater Mode Modal */}
      {playingVideoUrl && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden relative shadow-2xl">
            <button 
              onClick={() => setPlayingVideoUrl(null)} 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 hover:scale-105 text-white w-10 h-10 rounded-full flex items-center justify-center transition font-extrabold text-xl cursor-pointer z-10"
              title="Đóng trình xem"
            >
              ×
            </button>
            <div className="aspect-video w-full">
              <iframe
                src={getYouTubeEmbedUrl(playingVideoUrl)}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Admin Video Modal Form */}
      {isEditingVideoModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="text-xl font-bold text-[#1a3c6e] uppercase">
                {editingVideoIndex !== null ? '✏️ Chỉnh Sửa Video' : '➕ Thêm Video Hướng Dẫn'}
              </h3>
              <button 
                onClick={() => setIsEditingVideoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveVideo} className="space-y-4 mt-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Tiêu đề video *</label>
                <input 
                  type="text" 
                  value={editingVideoData.title}
                  onChange={(e) => setEditingVideoData({ ...editingVideoData, title: e.target.value })}
                  placeholder="Ví dụ: Giới thiệu tổng quan MD HOME SMART"
                  className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-[#1a3c6e] focus:outline-none font-semibold text-[#1a3c6e]" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Link YouTube hoặc ID *</label>
                <input 
                  type="text" 
                  value={editingVideoData.url}
                  onChange={(e) => setEditingVideoData({ ...editingVideoData, url: e.target.value })}
                  placeholder="Ví dụ: https://www.youtube.com/watch?v=7uV8ZclqD0o"
                  className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-[#1a3c6e] focus:outline-none font-semibold text-[#1a3c6e]" 
                  required 
                />
                <span className="text-[10px] text-slate-400 font-medium leading-relaxed block pl-1">
                  Chấp nhận URL đầy đủ, rút gọn (youtu.be), dạng nhúng hoặc ID video gồm 11 ký tự.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Mô tả ngắn</label>
                <textarea 
                  value={editingVideoData.desc}
                  onChange={(e) => setEditingVideoData({ ...editingVideoData, desc: e.target.value })}
                  placeholder="Tóm tắt ngắn gọn nội dung video..."
                  rows={3}
                  className="w-full border-2 border-slate-100 p-3 rounded-2xl focus:border-[#1a3c6e] focus:outline-none text-sm font-semibold text-[#1a3c6e]" 
                />
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-[#c9a227] hover:bg-yellow-600 text-white font-extrabold py-3 rounded-2xl transition cursor-pointer text-sm uppercase tracking-wider text-center"
                >
                  {editingVideoIndex !== null ? 'Lưu chỉnh sửa' : 'Thêm video'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditingVideoModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#1a3c6e] font-extrabold py-3 rounded-2xl transition cursor-pointer text-sm text-center"
                >
                  Hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
