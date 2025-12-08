#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ======================== WIFI & MQTT CONFIG ========================
#define STUDENT_ID "23127503"

const char* ssid = "YOUR_WIFI_SSID";           // ✅ Thay bằng WiFi của bạn
const char* password = "YOUR_WIFI_PASSWORD";   // ✅ Thay bằng mật khẩu WiFi

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

const char* TOPIC_SENSOR_DATA = "sensor/data/" STUDENT_ID;
const char* TOPIC_DEVICE_CONTROL = "device/control/" STUDENT_ID;

WiFiClient espClient;
PubSubClient client(espClient);

// ======================== PIN DEFINITIONS ========================
#define GREEN_LED_PIN 25
#define YELLOW_LED_PIN 26
#define RED_LED_PIN 27
#define BUZZER_PIN 14

#define DHT_PIN 4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

#define MQ135_PIN 34
#define MQ7_PIN 35

#define PMS_RX 16
#define PMS_TX 17
HardwareSerial pmsSerial(2);

// ======================== GLOBAL VARIABLES ========================
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 1000;

float temperature = 0;
float humidity = 0;
int co2 = 0;
float co = 0;
float pm25 = 0;

int currentBrightness = 75;      // Độ sáng hiện tại
String currentColor = "green";   // Màu hiện tại

// ======================== HELPER FUNCTIONS ========================
// Chuyển đổi brightness (0-100) sang PWM (0-255)
int brightnessToPWM(int brightness) {
  return map(brightness, 0, 100, 0, 255);
}

// Set LED với màu và độ sáng
void setLED(String color, int brightness) {
  int pwmValue = brightnessToPWM(brightness);

  if (color == "green") {
    ledcWrite(0, pwmValue);  // Green ON
    ledcWrite(1, 0);          // Yellow OFF
    ledcWrite(2, 0);          // Red OFF
  }
  else if (color == "yellow") {
    ledcWrite(0, 0);          // Green OFF
    ledcWrite(1, pwmValue);   // Yellow ON
    ledcWrite(2, 0);          // Red OFF
  }
  else if (color == "red") {
    ledcWrite(0, 0);          // Green OFF
    ledcWrite(1, 0);          // Yellow OFF
    ledcWrite(2, pwmValue);   // Red ON
  }

  currentBrightness = brightness;
  currentColor = color;
  Serial.printf("💡 LED: %s at %d%% brightness (PWM: %d)\n", color.c_str(), brightness, pwmValue);
}

// ======================== SETUP ========================
void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 ESP32 Air Quality Monitor Starting...");

  // ✅ Setup LED pins với PWM
  ledcSetup(0, 5000, 8); // Channel 0, 5kHz, 8-bit resolution
  ledcSetup(1, 5000, 8); // Channel 1
  ledcSetup(2, 5000, 8); // Channel 2

  ledcAttachPin(GREEN_LED_PIN, 0);
  ledcAttachPin(YELLOW_LED_PIN, 1);
  ledcAttachPin(RED_LED_PIN, 2);

  // ✅ Đèn xanh sáng mặc định với brightness 75%
  setLED("green", 75);

  // ✅ Setup Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // ✅ Setup DHT sensor
  dht.begin();

  // ✅ Setup PMS5003 (PM2.5 sensor)
  pmsSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);

  // ✅ Connect to WiFi
  setupWiFi();

  // ✅ Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  Serial.println("✅ Setup complete!");
}

// ======================== WIFI CONNECTION ========================
void setupWiFi() {
  delay(10);
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
  }
}

// ======================== MQTT RECONNECT ========================
void reconnect() {
  while (!client.connected()) {
    Serial.print("🔄 Connecting to MQTT broker...");

    String clientId = "ESP32_" + String(STUDENT_ID);

    if (client.connect(clientId.c_str())) {
      Serial.println(" ✅ Connected!");
      client.subscribe(TOPIC_DEVICE_CONTROL);
      Serial.printf("📡 Subscribed to: %s\n", TOPIC_DEVICE_CONTROL);
    } else {
      Serial.print(" ❌ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ======================== MQTT CALLBACK ========================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.printf("\n📥 Message received on topic: %s\n", topic);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("❌ JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }

  const char* device = doc["device"];
  const char* action = doc["action"];

  // ✅ Đổi màu LED (từ AI - giữ nguyên brightness)
  if (strcmp(device, "led") == 0 && strcmp(action, "set_color") == 0) {
    const char* color = doc["color"];
    
    // ✅ SỬA: Kiểm tra xem có brightness trong payload không
    int brightness = doc.containsKey("brightness") ? doc["brightness"].as<int>() : currentBrightness;
    
    const char* quality = doc["quality"];

    setLED(String(color), brightness);
    Serial.printf("🤖 AI changed LED to %s (Quality: %s)\n", color, quality);
  }

  // ✅ Đổi brightness (từ Settings - giữ nguyên màu)
  else if (strcmp(device, "led") == 0 && strcmp(action, "set_brightness") == 0) {
    int brightness = doc["brightness"];
    
    // ✅ SỬA: Kiểm tra xem có color trong payload không
    String color = doc.containsKey("color") ? String((const char*)doc["color"]) : currentColor;

    setLED(color, brightness);
    Serial.printf("👤 User changed brightness to %d%%\n", brightness);
  }

  // ✅ Buzzer alert (tự động khi air quality kém)
  else if (strcmp(device, "buzzer") == 0 && strcmp(action, "alert") == 0) {
    int beepCount = doc["config"]["beepCount"];
    int beepDuration = doc["config"]["beepDuration"];
    int interval = doc["config"]["interval"];

    Serial.printf("🚨 ALERT: Air quality poor! Buzzer: %d beeps\n", beepCount);
    beepPattern(beepCount, beepDuration, interval);
  }

  // ✅ Buzzer test (từ Settings)
  else if (strcmp(device, "buzzer") == 0 && strcmp(action, "test") == 0) {
    int beepCount = doc["config"]["beepCount"];
    int beepDuration = doc["config"]["beepDuration"];
    int interval = doc["config"]["interval"];

    Serial.printf("🔔 Buzzer TEST: %d beeps\n", beepCount);
    beepPattern(beepCount, beepDuration, interval);
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
  Serial.printf("✅ Buzzer finished: %d beeps\n", beepCount);
}

// ======================== READ SENSORS ========================
void readSensors() {
  // 1. DHT22 - Temperature & Humidity
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ DHT22 read error!");
    temperature = 25.0;
    humidity = 60.0;
  }

  // 2. MQ-135 - CO2
  int mq135_raw = analogRead(MQ135_PIN);
  co2 = map(mq135_raw, 0, 4095, 400, 2000);

  // 3. MQ-7 - CO
  int mq7_raw = analogRead(MQ7_PIN);
  co = map(mq7_raw, 0, 4095, 0, 50) / 10.0;

  // 4. PMS5003 - PM2.5
  pm25 = readPM25();

  Serial.printf("📊 Temp: %.1f°C, Humidity: %.1f%%, CO2: %dppm, CO: %.1fppm, PM2.5: %.1fµg/m³\n",
                temperature, humidity, co2, co, pm25);
}

// ======================== READ PM2.5 FROM PMS5003 ========================
float readPM25() {
  if (pmsSerial.available() >= 32) {
    byte buffer[32];
    pmsSerial.readBytes(buffer, 32);

    if (buffer[0] == 0x42 && buffer[1] == 0x4d) {
      int pm25_raw = (buffer[12] << 8) | buffer[13];
      return pm25_raw;
    }
  }

  return 20.0;
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
    Serial.printf("📤 Published to %s\n", TOPIC_SENSOR_DATA);
    Serial.println(buffer);
  } else {
    Serial.println("❌ Publish failed!");
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
}
