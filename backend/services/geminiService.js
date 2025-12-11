// services/geminiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Sensor = require("../models/sensor.model");

// ✅ Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Định nghĩa tools (functions) cho Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "getSensorAverages",
        description:
          "Lấy giá trị trung bình của các cảm biến chất lượng không khí (nhiệt độ, độ ẩm, CO2, CO, PM2.5). Sử dụng khi người dùng hỏi về tình trạng không khí, chất lượng môi trường, hoặc yêu cầu đánh giá không khí.",
        parameters: {
          type: "object",
          properties: {
            hours: {
              type: "number",
              description:
                "Số giờ muốn lấy dữ liệu trung bình (ví dụ: 1, 24, 168). Nếu không có, sẽ lấy tất cả dữ liệu.",
            },
          },
          required: [],
        },
      },
    ],
  },
];

// ✅ Hàm thực thi tool (GIỐNG Y HỆT HÀM CONTROLLER)
async function executeTool(functionName, args) {
  console.log(`🔧 Executing tool: ${functionName}`);
  console.log("📥 Arguments:", args);

  if (functionName === "getSensorAverages") {
    try {
      const hours = args.hours || null;

      // ✅ Build aggregation pipeline
      let matchStage = {};
      if (hours) {
        const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
        matchStage = {
          timestamp: { $gte: timeLimit },
        };
        console.log(`🕒 Filtering data from last ${hours} hours`);
      }

      const pipeline = [];

      // Thêm match stage nếu có filter thời gian
      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      // Group và tính average
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

      // ✅ Execute aggregation
      const averages = await Sensor.aggregate(pipeline);

      if (!averages || averages.length === 0) {
        return {
          success: false,
          message: "Không có dữ liệu cảm biến",
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

      // ✅ Format kết quả
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

      console.log("✅ Sensor averages:", formattedResult);

      return {
        success: true,
        data: formattedResult,
      };
    } catch (error) {
      console.error("❌ Error in getSensorAverages:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  return {
    success: false,
    error: "Unknown function",
  };
}

// ✅ Hàm chat với Gemini
async function chat(userMessage, conversationHistory = []) {
  try {
    console.log("\n========== GEMINI CHAT ==========");
    console.log("👤 User:", userMessage);

    // ✅ Dùng gemini-2.5-flash (mới nhất, hỗ trợ function calling)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // ✅ Hoặc "gemini-2.5-flash" nếu có
      tools: tools,
    });

    // ✅ System instruction
    const systemPrompt = `Bạn là AI Assistant chuyên về chất lượng không khí. 
Bạn có thể:
1. Trả lời câu hỏi về chất lượng không khí
2. Đánh giá và phân tích dữ liệu cảm biến
3. Đưa ra khuyến nghị dựa trên các chỉ số
4. Nhận xét thời tiết dựa trên giá trị cảm biến

Ngưỡng đánh giá:
- Nhiệt độ: 18-25°C là tốt
- Độ ẩm: 40-60% là tốt
- CO2: <1000 ppm là tốt, 1000-2000 trung bình, >2000 kém
- CO: <9 ppm là tốt, 9-35 trung bình, >35 kém
- PM2.5: <12 μg/m³ tốt, 12-35 trung bình, >35 kém

Hãy trả lời bằng ngôn ngữ theo truy vấn người dùng, ngắn gọn, dễ hiểu và thân thiện.`;

    // ✅ Tạo chat session với system prompt
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

    // ✅ Gửi message
    let result = await chat.sendMessage(userMessage);
    let response = result.response;

    console.log("🤖 Gemini response received");

    // ✅ Kiểm tra có function call không
    let functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      console.log("🔧 Function calls detected:", functionCalls.length);

      const functionResponses = [];

      for (const call of functionCalls) {
        console.log(`📞 Calling: ${call.name}`, call.args);

        const toolResult = await executeTool(call.name, call.args);

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        });
      }

      // ✅ Gửi kết quả tool về cho Gemini
      result = await chat.sendMessage(functionResponses);
      response = result.response;

      console.log("✅ Gemini analyzed tool results");
    }

    // ✅ Lấy text response
    const text = response.text();
    console.log("🤖 Final response:", text.substring(0, 100) + "...");
    console.log("========================================\n");

    return {
      success: true,
      message: text,
      conversationHistory: await chat.getHistory(),
    };
  } catch (error) {
    console.error("❌ Gemini chat error:", error);

    // ✅ Xử lý các loại lỗi
    let errorMessage =
      "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.";

    if (error.status === 404) {
      console.error("💡 Model không tồn tại hoặc không hỗ trợ");
      errorMessage =
        "Xin lỗi, AI model hiện không khả dụng. Vui lòng thử lại sau.";
    } else if (error.status === 429) {
      console.error("💡 Quota exceeded");
      const retryAfter = error.errorDetails?.[2]?.retryDelay || "1 phút";
      console.log(`⏳ Retry after: ${retryAfter}`);
      errorMessage = `Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau ${retryAfter}.`;
    } else if (error.status === 500) {
      console.error("💡 Gemini server error");
      errorMessage = "Xin lỗi, AI đang gặp sự cố. Vui lòng thử lại sau.";
    } else if (error.status === 400) {
      console.error("💡 Bad request:", error.message);
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
