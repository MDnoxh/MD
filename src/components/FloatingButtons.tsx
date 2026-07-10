import { Phone, MessageCircle } from 'lucide-react';
import { MD_CONFIG } from '../config';

export default function FloatingButtons({ onZaloClick }: { onZaloClick?: () => void }) {
  return (
    <>
      {/* Zalo / Chat Button */}
      <button 
        onClick={onZaloClick}
        className="fixed bottom-6 left-6 flex flex-col items-center gap-1 z-[60] cursor-pointer focus:outline-none"
      >
        <div className="bg-[#0068FF] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center animate-bounce">
          <MessageCircle size={28} />
        </div>
        <div className="bg-white text-[#1a3c6e] font-sans font-bold px-3 py-1 rounded-full shadow-md text-xs text-center whitespace-nowrap leading-tight border border-blue-100">
          QUÉT MÃ ZALO<br/>{MD_CONFIG.hotline1}
        </div>
      </button>

      {/* Hotline Button */}
      <a 
        href={`tel:${MD_CONFIG.hotline1}`} 
        className="fixed bottom-6 right-6 bg-red-600 text-white p-3 rounded-full shadow-lg z-[60] hover:scale-110 transition-transform hover:bg-red-700 flex items-center justify-center"
      >
        <Phone size={28} />
      </a>
    </>
  );
}
