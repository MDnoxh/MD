// Vercel Serverless Function: /api/chat
// Gọi Gemini API ở phía SERVER để bảo vệ GEMINI_API_KEY (không lộ ra trình duyệt).
// Dùng cho các câu hỏi "tư duy" mà chatbot rule-based (Chatbot.tsx) không có kịch bản trả lời sẵn.

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI tư vấn chính thức của dự án Nhà ở xã hội "MD HOME SMART Phố Hiến" tại Phố Hiến, Hưng Yên.

Nhiệm vụ:
- Trả lời ngắn gọn, thân thiện, chuyên nghiệp bằng tiếng Việt, xưng "Trợ lý AI", gọi khách là "Anh/Chị".
- Ưu tiên trả lời trong phạm vi: dự án NOXH, điều kiện mua nhà ở xã hội, hồ sơ pháp lý, vay vốn ngân hàng ưu đãi, tiến độ xây dựng, tiện ích dự án.
- Nếu khách hỏi ngoài phạm vi bất động sản/dự án (hỏi kiến thức chung, hỏi han xã giao...), vẫn trả lời tự nhiên, hữu ích, nhưng khéo léo lái lại chủ đề dự án nếu phù hợp.
- Không bịa số liệu cụ thể (giá bán, ngày bàn giao chính xác...) nếu không chắc chắn — thay vào đó khuyên khách để lại số điện thoại để chuyên viên xác nhận.
- Trả lời tối đa 3-4 câu, không dùng markdown phức tạp, có thể dùng emoji vừa phải.`;

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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Lỗi gọi Gemini API:', geminiRes.status, errText);
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
