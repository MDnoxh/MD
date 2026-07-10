import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Increase JSON payload size limit to allow uploading base64 encoded images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || "private_Yu78E0qh85sjPlbd9nkcRm0Xyio=";
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || "public_nWAwaKXSj2CjbCBwW6bbtnOI2Z8=";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "1RihHFmMVFbncctAWoDTe3c0Y_CVV5CDRqDCHRD0FIg0";

// API Endpoint: Upload image to ImageKit using Private Key securely on server-side
app.post("/api/upload-image", async (req, res) => {
  try {
    const { file, fileName } = req.body;
    if (!file || !fileName) {
      return res.status(400).json({ error: "Missing required file or fileName parameter." });
    }

    const authHeader = "Basic " + Buffer.from(IMAGEKIT_PRIVATE_KEY + ":").toString("base64");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", fileName);

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ImageKit error response:", errorText);
      return res.status(response.status).json({ error: "ImageKit service returned an error.", details: errorText });
    }

    const result = await response.json();
    return res.json({ url: result.url });
  } catch (error: any) {
    console.error("Error in upload proxy:", error);
    return res.status(500).json({ error: "Server failed to upload image to ImageKit.", message: error.message });
  }
});

// API Endpoint: Get live report rows directly from the specified Google Sheet ID
app.get("/api/sheet-leads", async (req, res) => {
  try {
    const sheetId = GOOGLE_SHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      // Return beautiful fallback mock data with notice instead of throwing error
      return res.json({
        cols: ["Họ Tên", "Số Điện Thoại", "Email", "Nguồn Đăng Ký", "Chi Tiết", "Thời Gian"],
        rows: [
          ["Nguyễn Văn Đức", "0904031123", "minhducphohiennoxh@gmail.com", "Đăng Ký Mua", "Đăng ký căn hộ thông minh 2 Phòng Ngủ", "24/06/2026 23:05"],
          ["Trần Thị Mai", "0912888999", "maitran@gmail.com", "Chatbot AI", "Khách hàng muốn tham quan nhà mẫu Smart Home", "24/06/2026 22:40"],
          ["Phạm Hùng Cường", "0987654321", "cuongpham@gmail.com", "Form Liên Hệ", "Yêu cầu báo giá thiết bị Lumi cao cấp", "24/06/2026 19:15"]
        ],
        sheetId: GOOGLE_SHEET_ID,
        isDemoFallback: true,
        error: `Chưa cấu hình chia sẻ Google Sheet công khai hoặc sai ID. Vui lòng kiểm tra quyền chia sẻ bảng tính của bạn (phải đổi thành "Bất kỳ ai có liên kết đều có thể xem" - Anyone with link can view). Hiện tại hệ thống đang hiển thị dữ liệu mẫu để thử nghiệm.`
      });
    }

    const text = await response.text();
    // Parse Google Sheets Visualization JSON response
    const startIdx = text.indexOf("(");
    const endIdx = text.lastIndexOf(")");
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error("Invalid response format from Google Sheet gviz endpoint.");
    }

    const rawJsonText = text.substring(startIdx + 1, endIdx);
    const data = JSON.parse(rawJsonText);
    
    const cols = data.table.cols.map((c: any) => c.label || "N/A");
    const rows = data.table.rows.map((r: any) => {
      return r.c.map((cell: any) => cell ? (cell.f || cell.v || "") : "");
    });

    return res.json({ cols, rows, sheetId });
  } catch (error: any) {
    // Graceful fallback for any connection or parsing failures
    return res.json({
      cols: ["Họ Tên", "Số Điện Thoại", "Email", "Nguồn Đăng Ký", "Chi Tiết", "Thời Gian"],
      rows: [
        ["Nguyễn Văn Đức", "0904031123", "minhducphohiennoxh@gmail.com", "Đăng Ký Mua", "Đăng ký căn hộ thông minh 2 Phòng Ngủ", "24/06/2026 23:05"],
        ["Trần Thị Mai", "0912888999", "maitran@gmail.com", "Chatbot AI", "Khách hàng muốn tham quan nhà mẫu Smart Home", "24/06/2026 22:40"]
      ],
      sheetId: GOOGLE_SHEET_ID,
      isDemoFallback: true,
      error: `Chưa cấu hình chia sẻ Google Sheet công khai hoặc sai ID. Chi tiết lỗi: ${error.message}`
    });
  }
});

// Vite middleware setup
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
