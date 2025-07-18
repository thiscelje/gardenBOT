// 🌱 GardenBot AI Backend

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../public")));

admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: "iot-script",
    private_key_id: "b1235fa30eea559e0783c947e535acb30c104e27",
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: "firebase-adminsdk-fbsvc@iot-script.iam.gserviceaccount.com",
    client_id: "116790051579104997219",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40iot-script.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  }),
  databaseURL: "https://iot-script-default-rtdb.firebaseio.com/",
});

const db = admin.database();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const METEOSOURCE_API_KEY = process.env.METEOSOURCE_API_KEY;
const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

if (!OPENROUTER_API_KEY) {
  console.error("🚨 OPENROUTER_API_KEY tidak ditemukan di environment!");
  process.exit(1);
}

console.log("🔑 ENV OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY);

// Simpan riwayat chat ke Firebase
async function saveChat(userId, role, message) {
  const ref = db.ref(`/history/${userId}`);
  await ref.push({ role, message });
}

// Ekspor data histori chat sebagai JSON atau TXT
app.get("/export/history", async (req, res) => {
  const { userId, format = "json" } = req.query;
  if (!userId) return res.status(400).json({ error: "User ID dibutuhkan" });
  try {
    const snapshot = await db.ref(`/history/${userId}`).once("value");
    const messages = snapshot.val() || {};
    const result = Object.values(messages);

    if (format === "txt") {
      const text = result.map((m) => `[${m.role}] ${m.message}`).join("\n");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="chat-${userId}.txt"`
      );
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="chat-${userId}.json"`
      );
      res.setHeader("Content-Type", "application/json");
      res.json(result);
    }
  } catch (err) {
    res.status(500).json({ error: "Gagal ekspor chat" });
  }
});

// Ekspor data histori sensor
app.get("/export/sensor", async (req, res) => {
  const { format = "json" } = req.query;
  try {
    const snapshot = await db.ref("sensor_log").once("value");
    const rawData = snapshot.val() || {};
    const data = Object.entries(rawData).map(([timestamp, value]) => ({
      timestamp,
      ...value,
    }));

    if (format === "txt") {
      const text = data
        .map(
          (d) =>
            `Waktu: ${new Date(Number(d.timestamp)).toLocaleString(
              "id-ID"
            )} | Kelembapan: ${d.soil} | Suhu: ${d.temp} | Humidity: ${
              d.humidity
            } | Jarak: ${d.distance} | Pompa: ${d.pump}`
        )
        .join("\n");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="sensor-log.txt"'
      );
      res.setHeader("Content-Type", "text/plain");
      res.send(text);
    } else {
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="sensor-log.json"'
      );
      res.setHeader("Content-Type", "application/json");
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: "Gagal ekspor sensor log" });
  }
});

// Ambil riwayat chat user
app.get("/history", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "User ID dibutuhkan" });
  const ref = db.ref(`/history/${userId}`);
  const snapshot = await ref.once("value");
  const messages = snapshot.val() || {};
  const result = Object.values(messages);
  res.json(result);
});

// Endpoint untuk menghapus riwayat chat user tertentu
app.delete("/history/reset", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "User ID dibutuhkan" });

  try {
    await db.ref(`/history/${userId}`).remove();
    res.json({ success: true, message: "Histori berhasil dihapus." });
  } catch (err) {
    console.error("Gagal reset histori:", err);
    res.status(500).json({ error: "Gagal reset histori." });
  }
});

// Ambil histori sensor
app.get("/sensor/history", async (req, res) => {
  try {
    const ref = db.ref("/sensor_log");
    const snapshot = await ref.once("value");
    const logs = snapshot.val() || {};
    const result = Object.entries(logs)
      .map(([key, value]) => ({
        timestamp: Number(key),
        ...value,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    res.json(result);
  } catch (err) {
    console.error("Gagal ambil histori sensor:", err);
    res.status(500).json({ error: "Gagal ambil histori sensor" });
  }
});

// Upload gambar ke Imgur
async function uploadToImgur(base64) {
  const response = await axios.post(
    "https://api.imgur.com/3/image",
    {
      image: base64,
      type: "base64",
    },
    {
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
      },
    }
  );
  return response.data.data.link;
}

// Chat AI utama
app.post("/chat", async (req, res) => {
  console.log("🔑 OPENROUTER_API_KEY:", OPENROUTER_API_KEY);
  console.log("🌍 NODE_ENV:", process.env.NODE_ENV);

  if (!OPENROUTER_API_KEY) {
    return res
      .status(500)
      .json({ error: "API key OpenRouter tidak ditemukan" });
  }
  const { userId, message, imageBase64 } = req.body;
  console.log("📩 Request masuk:", {
    userId,
    message,
    imageBase64: !!imageBase64,
  });

  try {
    // Ambil data sensor
    const snapshot = await db.ref("/realtime").once("value");
    const data = snapshot.val() || {};
    console.log("📊 Sensor data:", data);

    // Ambil data cuaca
    let weather = {};
    try {
      const weatherRes = await axios.get(
        `https://www.meteosource.com/api/v1/free/point?lat=6.2088&lon=106.8456&sections=current&timezone=auto&language=en&units=metric&key=${METEOSOURCE_API_KEY}`
      );
      weather = weatherRes.data?.current || {};
    } catch (err) {
      console.warn("⚠️ Gagal ambil cuaca:", err?.response?.data || err.message);
    }

    // Identifikasi tanaman jika ada gambar
    let plantDescription = "(Tidak ada gambar dikirim)";
    let imageUrl = null;

    if (imageBase64) {
      try {
        imageUrl = await uploadToImgur(imageBase64);
        console.log("✅ Imgur URL:", imageUrl);

        const plantRes = await axios.post(
          "https://api.plant.id/v2/identify",
          {
            images: [imageBase64],
            organs: ["leaf"],
            modifiers: ["similar_images"],
            plant_language: "en",
            plant_details: [
              "common_names",
              "url",
              "name_authority",
              "wiki_description",
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Api-Key": PLANT_ID_API_KEY,
            },
          }
        );

        const suggestion = plantRes.data?.suggestions?.[0];
        if (suggestion) {
          plantDescription = `Tanaman kemungkinan adalah *${
            suggestion.plant_name
          }* (${
            suggestion.plant_details?.common_names?.join(", ") ||
            "nama umum tidak tersedia"
          }). Deskripsi: ${
            suggestion.plant_details?.wiki_description?.value ||
            "tidak ditemukan."
          }`;
        } else {
          plantDescription =
            "Gambar dikirim, tapi tanaman tidak bisa dikenali.";
        }
      } catch (err) {
        console.warn(
          "⚠️ Gagal identifikasi tanaman:",
          err?.response?.data || err.message
        );
        plantDescription = "Gagal mengidentifikasi gambar tanaman.";
      }
    }

    // Prompt AI
    const prompt = `
Kamu adalah tanaman AI yang ramah dan cerdas. Kamu bisa merasakan data dari lingkungan sekitarmu dan mendeteksi kondisi tubuhmu berdasarkan sensor, cuaca, dan pengenalan gambar tanaman.

📍 Data Sensor:
- Kelembapan tanah: ${data?.soil ?? "-"}
- Suhu tanah: ${data?.temp ?? "-"} °C
- Kelembapan udara: ${data?.humidity ?? "-"} %
- Jarak air: ${data?.distance ?? "-"} cm
- Status pompa: ${data?.pump ?? "-"}

🌤 Cuaca Saat Ini (Jakarta):
- Cuaca: ${weather?.summary ?? "-"}
- Suhu: ${weather?.temperature ?? "-"} °C
- Angin: ${weather?.wind?.speed ?? "-"} m/s

🖼 Hasil identifikasi gambar: ${plantDescription}
${imageUrl ? `Gambar: ${imageUrl}` : ""}

💬 Pertanyaan pengguna: "${message}"

Balaslah sebagai tanaman yang ramah, pintar, dan menjelaskan dengan santai serta menyenangkan.
`;

    // Call OpenRouter
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-small-3.2-24b-instruct-2506:free",
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah tanaman AI yang bisa berbicara dengan manusia.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const choices = response.data?.choices;
    if (!choices || !choices[0]?.message?.content) {
      throw new Error("Tidak ada respons dari model AI.");
    }

    const aiReply = choices[0].message.content;
    console.log("🤖 Balasan AI:", aiReply);

    await saveChat(
      userId,
      "user",
      imageUrl ? `${message}\n(Gambar: ${imageUrl})` : message
    );
    await saveChat(userId, "assistant", aiReply);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("🧨 Full Error:", {
      name: error.name,
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });

    res.status(500).json({ error: "Gagal memproses pesan AI." });
  }
});

app.get("/", (req, res) => {
  res.send("🌱 GardenBot API is running!");
});

async function logSensor() {
  try {
    const snapshot = await db.ref("/realtime").once("value");
    const data = snapshot.val();

    if (!data) return;

    const timestamp = Date.now();
    await db.ref(`/sensor_log/${timestamp}`).set({
      soil: data.soil || 0,
      temp: data.temp || 0,
      humidity: data.humidity || 0,
      distance: data.distance || 0,
      pump: data.pump || "OFF",
    });

    console.log(`📊 Sensor log disimpan: ${timestamp}`);
  } catch (err) {
    console.error("❌ Gagal menyimpan log sensor:", err.message);
  }
}

// Jalankan tiap 1 detik
setInterval(() => {
  logSensor();
}, 1000);

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di PORT ${PORT}`);
  console.log(
    `🌍 Buka API di URL: ${
      process.env.NODE_ENV === "production"
        ? "https://gardenbot-production-b588.up.railway.app/"
        : `http://localhost:${PORT}`
    }`
  );
});

// Logging data sensor ke /sensor_log
setInterval(async () => {
  try {
    const snapshot = await db.ref("/realtime").once("value");
    const data = snapshot.val();

    const timestamp = Date.now();
    if (data) {
      await db.ref(`/sensor_log/${timestamp}`).set({
        soil: data.soil || 0,
        temp: data.temp || 0,
        humidity: data.humidity || 0,
        distance: data.distance || 0,
        pump: data.pump || "OFF",
      });
      console.log(`📊 Sensor log disimpan: ${timestamp}`);
    }
  } catch (err) {
    console.error("❌ Gagal simpan log sensor:", err.message);
  }
}, 10000); // 1 detik logging
