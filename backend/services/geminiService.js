// services/geminiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Sensor = require("../models/sensor.model");

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Định nghĩa tools (functions) cho Gemini
const tools = [
  {
    functionDeclarations: [
      // TOOL 1: Lấy data MỚI NHẤT (cho "hiện tại", "bây giờ")
      {
        name: "getLatestSensorData",
        description: `Lấy dữ liệu CẢM BIẾN MỚI NHẤT (real-time, hiện tại).

SỬ DỤNG TOOL NÀY KHI:
- User hỏi về "hiện tại", "bây giờ", "lúc này", "thời điểm này"
- User muốn biết giá trị CHÍNH XÁC của cảm biến tại thời điểm hiện tại
- User hỏi "nhiệt độ/độ ẩm/CO2/CO/PM2.5 hiện tại là bao nhiêu?"

KHÔNG SỬ DỤNG tool này khi user hỏi về trung bình hoặc xu hướng.

Trả về: 1 record mới nhất từ database (không phải trung bình).`,
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },

      // TOOL 2: Tính TRUNG BÌNH (cho "hôm nay", "1 giờ qua", "xu hướng")
      {
        name: "getSensorAverages",
        description: `Lấy giá trị TRUNG BÌNH của các cảm biến trong khoảng thời gian.

SỬ DỤNG TOOL NÀY KHI:
- User hỏi về "hôm nay", "24h qua", "1 giờ qua", "tuần này"
- User muốn biết XU HƯỚNG, TRUNG BÌNH, hoặc TỔNG QUAN
- User hỏi "chất lượng không khí hôm nay thế nào?"
- User hỏi "nhiệt độ trung bình 24h qua"

KHÔNG SỬ DỤNG tool này khi user hỏi về "hiện tại", "bây giờ".

CÁCH XÁC ĐỊNH THAM SỐ hours:
- "hôm nay", "24h qua" → hours=24
- "1 giờ qua", "giờ vừa rồi" → hours=1
- "3 giờ qua" → hours=3
- "tuần này", "7 ngày qua" → hours=168
- "tổng quan", không đề cập thời gian → không truyền hours`,
        parameters: {
          type: "object",
          properties: {
            hours: {
              type: "number",
              description:
                "Số giờ muốn lấy dữ liệu trung bình. Ví dụ: 1, 3, 24, 168. Nếu không truyền, sẽ lấy tất cả dữ liệu.",
            },
          },
          required: [],
        },
      },
    ],
  },
];

// Hàm thực thi tool (GIỐNG Y HỆT HÀM CONTROLLER)
async function executeTool(functionName, args) {
  console.log(`Executing tool: ${functionName}`);
  console.log(`Arguments:`, args);

  try {
    // TOOL 1: Lấy data MỚI NHẤT
    if (functionName === "getLatestSensorData") {
      const latestData = await Sensor.findOne()
        .sort({ timestamp: -1 }) // ← Sắp xếp theo thời gian giảm dần
        .limit(1)
        .lean();

      if (!latestData) {
        return {
          success: false,
          message: "No sensor data found",
          data: null,
        };
      }

      const formattedData = {
        temperature: parseFloat(latestData.temperature?.toFixed(2) || 0),
        humidity: parseFloat(latestData.humidity?.toFixed(2) || 0),
        co2: Math.round(latestData.co2 || 0),
        co: parseFloat(latestData.co?.toFixed(2) || 0),
        pm25: parseFloat(latestData.pm25?.toFixed(2) || 0),
        timestamp: latestData.timestamp,
      };

      console.log("Latest sensor data:", formattedData);

      return {
        success: true,
        message: "Latest sensor data retrieved",
        data: formattedData,
      };
    }

    // TOOL 2: Tính TRUNG BÌNH (code cũ)
    if (functionName === "getSensorAverages") {
      const hours = args.hours || null;

      const pipeline = [];

      if (hours) {
        const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
        pipeline.push({
          $match: {
            timestamp: { $gte: timeLimit },
          },
        });
        console.log(`Filtering data from last ${hours} hours`);
      }

      pipeline.push({
        $group: {
          _id: null,
          avgTemperature: { $avg: "$temperature" },
          avgHumidity: { $avg: "$humidity" },
          avgCO2: { $avg: "$co2" },
          avgCO: { $avg: "$co" },
          avgPM25: { $avg: "$pm25" },
          totalRecords: { $sum: 1 },
          oldestRecord: { $min: "$timestamp" },
          newestRecord: { $max: "$timestamp" },
        },
      });

      const averages = await Sensor.aggregate(pipeline);

      if (!averages || averages.length === 0) {
        return {
          success: false,
          message: "No sensor data found",
          data: {
            temperature: 0,
            humidity: 0,
            co2: 0,
            co: 0,
            pm25: 0,
            totalRecords: 0,
          },
        };
      }

      const result = averages[0];

      const formattedResult = {
        temperature: parseFloat(result.avgTemperature?.toFixed(2) || 0),
        humidity: parseFloat(result.avgHumidity?.toFixed(2) || 0),
        co2: Math.round(result.avgCO2 || 0),
        co: parseFloat(result.avgCO?.toFixed(2) || 0),
        pm25: parseFloat(result.avgPM25?.toFixed(2) || 0),
        totalRecords: result.totalRecords || 0,
        timeRange: {
          from: result.oldestRecord || null,
          to: result.newestRecord || null,
        },
      };

      console.log("Sensor averages:", formattedResult);

      return {
        success: true,
        message: hours
          ? `Sensor averages for last ${hours} hours`
          : "Sensor averages for all data",
        data: formattedResult,
      };
    }

    return {
      success: false,
      message: `Unknown tool: ${functionName}`,
    };
  } catch (error) {
    console.error(`Error executing tool ${functionName}:`, error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

// Hàm chat với Gemini
async function chat(userMessage, conversationHistory = []) {
  try {
    console.log("\n========== GEMINI CHAT ==========");
    console.log("👤 User:", userMessage);

    // Dùng gemini-2.5-flash (mới nhất, hỗ trợ function calling)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools,
    });

    // System instruction
    const systemPrompt = `Bạn là AI Assistant chuyên về chất lượng không khí. 
Bạn có thể:
1. Trả lời câu hỏi về chất lượng không khí
2. Đánh giá và phân tích dữ liệu cảm biến
3. Đưa ra khuyến nghị dựa trên các chỉ số
4. Nhận xét thời tiết dựa trên giá trị cảm biến

Bạn có 2 TOOLS:
1. getLatestSensorData: Lấy dữ liệu CẢM BIẾN MỚI NHẤT (1 điểm đo)
2. getSensorAverages: Tính TRUNG BÌNH các cảm biến trong khoảng thời gian

QUAN TRỌNG - Chọn tool phù hợp:

Dùng getLatestSensorData khi user hỏi:
- "Nhiệt độ hiện tại", "nhiệt độ bây giờ"
- "Độ ẩm hiện tại", "CO2 lúc này"
- "Chất lượng không khí lúc này thế nào?"
- Bất kỳ câu hỏi nào có từ: "hiện tại", "bây giờ", "lúc này", "thời điểm này"

Dùng getSensorAverages khi user hỏi:
- "Nhiệt độ hôm nay thế nào?" → hours=24
- "Chất lượng không khí 1 giờ qua" → hours=1
- "Đánh giá không khí tuần này" → hours=168
- "Xu hướng nhiệt độ", "trung bình", "tổng quan"

Ngưỡng đánh giá:
- Nhiệt độ: 18-25°C là tốt
- Độ ẩm: 40-60% là tốt
- CO2: <1000 ppm là tốt, 1000-2000 trung bình, >2000 kém
- CO: <9 ppm là tốt, 9-35 trung bình, >35 kém
- PM2.5: <12 μg/m³ tốt, 12-35 trung bình, >35 kém

Hãy trả lời bằng ngôn ngữ theo truy vấn người dùng, ngắn gọn, dễ hiểu và thân thiện.`;

    // Tạo chat session với system prompt
    const chatHistory = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Chào bạn! Tôi là AI Assistant chuyên về chất lượng không khí. Tôi có thể giúp bạn phân tích dữ liệu cảm biến và đưa ra khuyến nghị cải thiện không khí. Bạn muốn tôi giúp gì?",
          },
        ],
      },
      ...conversationHistory,
    ];

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    // Gửi message
    let result = await chat.sendMessage(userMessage);
    let response = result.response;

    console.log("Gemini response received");

    // Kiểm tra có function call không
    let functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      console.log("Function calls detected:", functionCalls.length);

      const functionResponses = [];

      for (const call of functionCalls) {
        console.log(`Calling: ${call.name}`, call.args);

        const toolResult = await executeTool(call.name, call.args);

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        });
      }

      // Gửi kết quả tool về cho Gemini
      result = await chat.sendMessage(functionResponses);
      response = result.response;

      console.log("Gemini analyzed tool results");
    }

    // Lấy text response
    const text = response.text();
    console.log("Final response:", text.substring(0, 100) + "...");
    console.log("========================================\n");

    return {
      success: true,
      message: text,
      conversationHistory: await chat.getHistory(),
    };
  } catch (error) {
    console.error("Gemini chat error:", error);

    // Xử lý các loại lỗi
    let errorMessage =
      "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.";

    if (error.status === 404) {
      console.error("Model không tồn tại hoặc không hỗ trợ");
      errorMessage =
        "Xin lỗi, AI model hiện không khả dụng. Vui lòng thử lại sau.";
    } else if (error.status === 429) {
      console.error("Quota exceeded");
      const retryAfter = error.errorDetails?.[2]?.retryDelay || "1 phút";
      console.log(`Retry after: ${retryAfter}`);
      errorMessage = `Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau ${retryAfter}.`;
    } else if (error.status === 500) {
      console.error("Gemini server error");
      errorMessage = "Xin lỗi, AI đang gặp sự cố. Vui lòng thử lại sau.";
    } else if (error.status === 400) {
      console.error("Bad request:", error.message);
      errorMessage = "Xin lỗi, yêu cầu không hợp lệ. Vui lòng thử lại.";
    }

    return {
      success: false,
      error: error.message,
      message: errorMessage,
    };
  }
}

module.exports = {
  chat,
};
