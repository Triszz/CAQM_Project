#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <WiFiManager.h>
#include <LiquidCrystal_I2C.h>

// ======================== WIFI & MQTT CONFIG ========================
#define STUDENT_ID "23127503"

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* TOPIC_SENSOR_DATA = "sensor/data/" STUDENT_ID;
const char* TOPIC_DEVICE_CONTROL = "device/control/" STUDENT_ID;

WiFiClient espClient;
PubSubClient client(espClient);

// ======================== LCD CONFIG ========================
#define LCD_ADDRESS 0x27 
#define LCD_COLS 16
#define LCD_ROWS 2
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

// ======================== PIN DEFINITIONS ========================
#define GREEN_LED_PIN 25
#define YELLOW_LED_PIN 33
#define RED_LED_PIN 32
#define BUZZER_PIN 14

#define DHT_PIN 4
#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

#define MQ135_PIN 34
#define MQ7_PIN 35

#define GP2Y10_LED_PIN 26   // Chân điều khiển LED (Digital)
#define GP2Y10_VOUT_PIN 36  // Chân đọc Analog
// Các hằng số thời gian lấy mẫu cho GP2Y10
const int SAMPLING_TIME = 280;
const int DELTA_TIME = 40;
const int SLEEP_TIME = 9680;

// ======================== GLOBAL VARIABLES ========================
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 3000; // 3 giây (giảm tải)

float temperature = 0;
float humidity = 0;
int co2 = 0;
float co = 0;
float pm25 = 0;

// Biến cho LCD
unsigned long lastLCDSwitch = 0;
const unsigned long LCD_INTERVAL = 3000; // Đổi trang LCD mỗi 3 giây
int lcdPage = 0; // Trang hiện tại (0, 1, 2)

int currentBrightness = 75;      
String currentColor = "green";   

// ======================== HELPER FUNCTIONS ========================
int brightnessToPWM(int brightness) {
  return map(brightness, 0, 100, 0, 255);
}

void setLED(String color, int brightness) {
  int pwmValue = brightnessToPWM(brightness);

  if (color == "green") {
    analogWrite(GREEN_LED_PIN, pwmValue);
    analogWrite(YELLOW_LED_PIN, 0);
    analogWrite(RED_LED_PIN, 0);         
  }
  else if (color == "yellow") { 
    analogWrite(GREEN_LED_PIN, 0);
    analogWrite(YELLOW_LED_PIN, pwmValue);
    analogWrite(RED_LED_PIN, 0);         
  }
  else if (color == "red") {
    analogWrite(GREEN_LED_PIN, 0);
    analogWrite(YELLOW_LED_PIN, 0);
    analogWrite(RED_LED_PIN, pwmValue);   
  }

  currentBrightness = brightness;
  currentColor = color;
  Serial.printf(" LED: %s at %d%% brightness (PWM: %d)\n", color.c_str(), brightness, pwmValue);
}

// Hàm hiển thị lên LCD (Chạy luân phiên các trang)
void displayOnLCD() {
  unsigned long now = millis();

  // Kiểm tra thời gian để chuyển trang
  if (now - lastLCDSwitch >= LCD_INTERVAL) {
    lastLCDSwitch = now;
    lcdPage++;
    if (lcdPage > 2) lcdPage = 0; // Có 3 trang: 0, 1, 2
    lcd.clear(); // Xóa màn hình khi chuyển trang
  }

  if (lcdPage == 0) {
    // === TRANG 1: NHIỆT ĐỘ & ĐỘ ẨM ===
    lcd.setCursor(0, 0);
    lcd.print("Temp: "); lcd.print(temperature, 1); lcd.print("C");
    
    lcd.setCursor(0, 1);
    lcd.print("Hum : "); lcd.print(humidity, 1); lcd.print("%");
  } 
  else if (lcdPage == 1) {
    // === TRANG 2: KHÍ CO2 & CO ===
    lcd.setCursor(0, 0);
    lcd.print("CO2 : "); lcd.print(co2); lcd.print("ppm");
    
    lcd.setCursor(0, 1);
    lcd.print("CO  : "); lcd.print(co, 1); lcd.print("ppm");
  } 
  else {
    // === TRANG 3: BỤI & TRẠNG THÁI ===
    lcd.setCursor(0, 0);
    lcd.print("PM2.5: "); lcd.print(pm25, 0); lcd.print("ug");
    
    lcd.setCursor(0, 1);
    lcd.print("Air: "); 
    String displayColor = currentColor;
    displayColor.toUpperCase();
    lcd.print(displayColor);
  }
}

void configModeCallback (WiFiManager *myWiFiManager) {
  Serial.println(" Entered config mode");
  Serial.println(" Access Point: " + myWiFiManager->getConfigPortalSSID());
  Serial.println(" IP: " + WiFi.softAPIP().toString());
  
  // Beep 2 lần để báo hiệu chế độ cấu hình
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER_PIN, HIGH); 
    delay(100); 
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

// ======================== SETUP ========================
void setup() {
  Serial.begin(9600);
  Serial.println("\n ESP32 Air Quality Monitor Starting...");

  // Setup LCD
  Wire.begin(21, 22); // SDA=21, SCL=22
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("System Starting");
  lcd.setCursor(0, 1); lcd.print("Please wait...");

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);

  setLED("green", 75);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  dht.begin();

  pinMode(GP2Y10_LED_PIN, OUTPUT);
  digitalWrite(GP2Y10_LED_PIN, HIGH); // Mặc định tắt LED
  analogReadResolution(12); // Đảm bảo độ phân giải 12-bit (0-4095)

  // WiFiManager Setup
  WiFiManager wm;
  wm.setAPCallback(configModeCallback);
  
  //wm.resetSettings(); // Uncomment để xóa WiFi đã lưu

  String apName = "ESP32_Config_" + String(STUDENT_ID);
  Serial.println(" Connecting to WiFi via WiFiManager...");
  
  if (!wm.autoConnect(apName.c_str())) {
    Serial.println(" Failed to connect, restarting...");
    ESP.restart();
    delay(1000);
  }

  Serial.println("\n WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Beep 1 lần dài khi kết nối thành công
  digitalWrite(BUZZER_PIN, HIGH); 
  delay(500); 
  digitalWrite(BUZZER_PIN, LOW);

  // MQTT Setup
  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(1024);
  client.setCallback(mqttCallback);

  Serial.println(" Setup complete!");
}

// ======================== MQTT RECONNECT ========================
void reconnect() {
  while (!client.connected()) {
    Serial.print(" Connecting to MQTT broker...");
    String clientId = "ESP32_" + String(STUDENT_ID);

    if (client.connect(clientId.c_str())) {
      Serial.println("  Connected!");
      client.subscribe(TOPIC_DEVICE_CONTROL);
      Serial.printf(" Subscribed to: %s\n", TOPIC_DEVICE_CONTROL);
    } else {
      Serial.print("  Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5s...");
      delay(5000);
    }
  }
}

// ======================== MQTT CALLBACK ========================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.printf("\n========================================\n");
  Serial.printf(" Topic: %s\n", topic);
  
  // In ra payload để debug
  Serial.print(" Payload: ");
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
  Serial.println("========================================");
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print(" JSON Error: ");
    Serial.println(error.c_str());
    return;
  }

  const char* device = doc["device"];
  const char* action = doc["action"];
  
  // THÊM: In ra device và action
  Serial.printf(" Device: %s\n", device ? device : "NULL");
  Serial.printf(" Action: %s\n", action ? action : "NULL");

  // LED: Set color
  if (strcmp(device, "led") == 0 && strcmp(action, "set_color") == 0) {
    const char* color = doc["color"];
    int brightness = doc.containsKey("brightness") ? doc["brightness"].as<int>() : currentBrightness;
    const char* quality = doc["quality"];
    
    setLED(String(color), brightness);
    Serial.printf(" AI: LED %s (Quality: %s)\n", color, quality ? quality : "N/A");
  }
  
  // LED: Set brightness (từ Settings)
  else if (strcmp(device, "led") == 0 && strcmp(action, "set_brightness") == 0) {
    int brightness = doc["brightness"];
    String color = doc.containsKey("color") ? String((const char*)doc["color"]) : currentColor;
    
    setLED(color, brightness);
    Serial.printf(" User: Brightness %d%%\n", brightness);
  }
  
  // Buzzer ALERT (AI tự động khi air quality kém)
  else if (strcmp(device, "buzzer") == 0 && strcmp(action, "alert") == 0) {
    int beepCount = doc["config"]["beepCount"];
    int beepDuration = doc["config"]["beepDuration"];
    int interval = doc["config"]["interval"];
    
    Serial.printf(" ALERT: Air quality poor! Buzzer %d beeps\n", beepCount);
    beepPattern(beepCount, beepDuration, interval);
  }
  
  // Buzzer TEST (User click Test trong Settings)
  else if (strcmp(device, "buzzer") == 0 && strcmp(action, "test") == 0) {
    int beepCount = doc["config"]["beepCount"];
    int beepDuration = doc["config"]["beepDuration"];
    int interval = doc["config"]["interval"];
    
    Serial.printf(" TEST: Buzzer %d beeps\n", beepCount);
    beepPattern(beepCount, beepDuration, interval);
  }
  
  // Unknown device/action
  else {
    Serial.println(" Unknown device or action!");
  }
}

// ======================== BUZZER BEEP PATTERN ========================
void beepPattern(int beepCount, int beepDuration, int interval) {
  for (int i = 0; i < beepCount; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(beepDuration);
    digitalWrite(BUZZER_PIN, LOW);
    
    if (i < beepCount - 1) {
      delay(interval);
    }
  }
  Serial.printf(" Buzzer finished: %d beeps\n", beepCount);
}

// ======================== READ SENSORS ========================
void readSensors() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) { 
    Serial.println(" DHT22 read error!");
    temperature = 0.0; 
    humidity = 0.0; 
  }

  int mq135_raw = analogRead(MQ135_PIN);
  co2 = map(mq135_raw, 0, 4095, 400, 2000);

  int mq7_raw = analogRead(MQ7_PIN);
  co = map(mq7_raw, 0, 4095, 0, 50) / 10.0;

  pm25 = readPM25();

  Serial.printf(" T:%.1f H:%.1f CO2:%d CO:%.1f PM2.5:%.1f\n", 
                temperature, humidity, co2, co, pm25);
}

// ======================== READ PM2.5 FROM PMS5003 ========================
float readPM25() {
  // 1. Bật LED IR
  digitalWrite(GP2Y10_LED_PIN, LOW);
  delayMicroseconds(SAMPLING_TIME);

  // 2. Đọc giá trị Analog
  int rawValue = analogRead(GP2Y10_VOUT_PIN);

  // 3. Tắt LED IR
  delayMicroseconds(DELTA_TIME);
  digitalWrite(GP2Y10_LED_PIN, HIGH);
  delayMicroseconds(SLEEP_TIME);

  // 4. Tính toán điện áp (ESP32: 3.3V, 12-bit ADC)
  float voltage = rawValue * (3.3 / 4095.0);

  // 5. Tính nồng độ bụi (Công thức Linear cơ bản cho Sharp)
  // Ngưỡng voltage khi không có bụi thường khoảng 0.5V - 0.6V
  float dust = 0;
  if (voltage > 0.6) {
    dust = (voltage - 0.6) / 0.5 * 100.0;
  }
  
  // Debug
  // Serial.printf("GP2Y10 Raw: %d | Volt: %.2f | Dust: %.2f\n", rawValue, voltage, dust);
  
  return dust;
}

// ======================== PUBLISH SENSOR DATA ========================
void publishSensorData() {
  StaticJsonDocument<256> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["co2"] = co2;
  doc["co"] = co;
  doc["pm25"] = pm25;
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(TOPIC_SENSOR_DATA, buffer)) {
    Serial.printf(" Published to %s\n", TOPIC_SENSOR_DATA);
  } else {
    Serial.println(" Publish failed!");
  }
}

// ======================== MAIN LOOP ========================
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;
    readSensors();
    publishSensorData();
  }

  displayOnLCD();
}