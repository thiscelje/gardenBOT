#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <DHT.h>

#define WIFI_SSID "Nadia"
#define WIFI_PASSWORD "Na060725"

#define FIREBASE_HOST "iot-script-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "IuQrgvtxRShSxcaA6eRnN91I5lGmAKZcr61BhFIE"

#define SOIL_PIN A0
#define DHTPIN D5
#define DHTTYPE DHT22
#define TRIG_PIN D6
#define ECHO_PIN D7
#define RELAY_PIN D1

FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");

  // Initialize Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  int soilValue = analogRead(SOIL_PIN);
  float temp = dht.readTemperature();
  float humi = dht.readHumidity();

  // Ultrasonic distance measurement
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;

  // Pump control based on soil moisture
  String pumpStatus = "OFF";
  if (soilValue < 600) {
    digitalWrite(RELAY_PIN, LOW);
    pumpStatus = "ON";
  } else {
    digitalWrite(RELAY_PIN, HIGH);
    pumpStatus = "OFF";
  }

  unsigned long timestamp = millis();

  // Send data to Firebase
  if (Firebase.setInt(firebaseData, "/realtime/soil", soilValue) &&
      Firebase.setFloat(firebaseData, "/realtime/temp", temp) &&
      Firebase.setFloat(firebaseData, "/realtime/humidity", humi) &&
      Firebase.setFloat(firebaseData, "/realtime/distance", distance) &&
      Firebase.setString(firebaseData, "/realtime/pump", pumpStatus) &&
      Firebase.setInt(firebaseData, "/realtime/timestamp", timestamp)) {
    Serial.println("Data sent to Firebase successfully");
  } else {
    Serial.println("Failed to send data to Firebase");
    Serial.println("Reason: " + firebaseData.errorReason());
  }

  // Add historical data
  String path = "/history/" + String(timestamp);
  Firebase.setInt(firebaseData, path + "/soil", soilValue);
  Firebase.setFloat(firebaseData, path + "/temp", temp);
  Firebase.setFloat(firebaseData, path + "/humidity", humi);
  Firebase.setFloat(firebaseData, path + "/distance", distance);
  Firebase.setString(firebaseData, path + "/pump", pumpStatus);

  delay(10000); // Wait 10 seconds before next reading
}