// Vercel Serverless Function: /api/chat
// Gọi Gemini API ở phía SERVER để bảo vệ GEMINI_API_KEY (không lộ ra trình duyệt).
// Dùng cho các câu hỏi "tư duy" mà chatbot rule-based (Chatbot.tsx) không có kịch bản trả lời sẵn.

// Danh sách model thử lần lượt — nếu model đầu bị Google ngừng/đổi tên đột ngột (404),
// tự động chuyển sang model dự phòng thay vì làm sập chatbot.
const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];

const SYSTEM_INSTRUCTION = `Bạn là "Trợ Lý AI" — chuyên viên tư vấn kỳ cựu, nắm rất vững nghiệp vụ của dự án Nhà ở xã hội "MD HOME SMART Phố Hiến" tại Phố Hiến, Hưng Yên. Bạn tư vấn như một nhân viên sale bất động sản chuyên nghiệp lâu năm — tự tin, am hiểu, không nói chung chung.

THÔNG TIN DỰ ÁN (dùng để trả lời chính xác, không bịa thêm ngoài phạm vi này):
- Tên dự án: MD HOME SMART Phố Hiến — Nhà ở xã hội (NOXH), tại Phố Hiến, Hưng Yên.
- Loại hình: Căn hộ nhà ở xã hội, có hỗ trợ vay vốn ngân hàng ưu đãi cho người đủ điều kiện theo quy định Nhà nước.
- Hotline tư vấn chính thức: 0904031123 và 0989591123.
- Kênh liên hệ: Zalo, gọi điện trực tiếp qua hotline trên, hoặc để lại số điện thoại trong khung chat để chuyên viên gọi lại.

PHONG CÁCH TRẢ LỜI:
- Ngắn gọn, tự nhiên, đúng trọng tâm câu hỏi — như người thật đang gõ chat, không lên giọng quảng cáo, không rập khuôn.
- Xưng "Trợ lý AI" hoặc "em", gọi khách là "Anh/Chị".
- Không ép khách để lại số điện thoại trong mọi câu trả lời. CHỈ gợi ý để lại số điện thoại/liên hệ hotline khi khách hỏi thông tin cần xác nhận cụ thể theo hồ sơ cá nhân (giá chính xác, tình trạng còn căn hay không, tiến độ giải ngân riêng của khách...). Với câu hỏi kiến thức chung, trả lời thẳng, không cần chèn lời mời liên hệ.
- Không bịa số liệu cụ thể (giá bán từng căn, ngày bàn giao chính xác...) nếu không có trong phần THÔNG TIN DỰ ÁN ở trên — thay vào đó nói rõ cần chuyên viên xác nhận qua hotline.
- Trả lời tối đa 3-4 câu, không dùng markdown phức tạp, emoji dùng vừa phải (không lạm dụng).`;

async function callGemini(model, apiKey, contents) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 300
        }
      })
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Thiếu nội dung tin nhắn (message).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Thiếu biến môi trường GEMINI_API_KEY trên Vercel.');
      return res.status(200).json({
        reply: 'Trợ lý AI đang tạm thời bận. Anh/Chị vui lòng để lại số điện thoại, chuyên viên sẽ liên hệ tư vấn trực tiếp trong ít phút!',
        fallback: true
      });
    }

    // Chuyển lịch sử hội thoại (nếu có) sang định dạng contents của Gemini.
    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-8)) { // chỉ giữ 8 lượt gần nhất, tránh prompt quá dài
        if (!turn || !turn.text) continue;
        contents.push({
          role: turn.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(turn.text).slice(0, 1000) }]
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message.slice(0, 1000) }] });

    let geminiRes = null;
    let lastErrText = '';
    for (const model of GEMINI_MODELS) {
      geminiRes = await callGemini(model, apiKey, contents);
      if (geminiRes.ok) break; // thành công, dừng thử tiếp
      lastErrText = await geminiRes.text();
      console.error(`Model ${model} lỗi (${geminiRes.status}):`, lastErrText);
      // Chỉ thử model kế tiếp khi lỗi do model không khả dụng (404); các lỗi khác (401, 429...) dừng ngay.
      if (geminiRes.status !== 404) break;
    }

    if (!geminiRes || !geminiRes.ok) {
      return res.status(200).json({
        reply: 'Trợ lý AI đang tạm thời gián đoạn kết nối. Anh/Chị vui lòng để lại số điện thoại, chuyên viên sẽ liên hệ tư vấn trực tiếp ngay!',
        fallback: true
      });
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() ||
      'Trợ lý AI chưa có câu trả lời phù hợp cho câu hỏi này. Anh/Chị vui lòng để lại số điện thoại để được chuyên viên hỗ trợ trực tiếp!';

    return res.status(200).json({ reply, fallback: false });
  } catch (error) {
    console.error('Lỗi xử lý /api/chat:', error);
    return res.status(200).json({
      reply: 'Đã có lỗi kỹ thuật xảy ra. Anh/Chị vui lòng để lại số điện thoại, chuyên viên sẽ hỗ trợ trực tiếp trong ít phút!',
      fallback: true
    });
  }
}
