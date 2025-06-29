const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();


const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

app.use(express.static(path.join(__dirname, "../public")));

admin.initializeApp({
  credential: admin.credential.cert({
  "type": "service_account",
  "project_id": "iot-script",
  "private_key_id": "205510c39ba51ea4358e331fa452cef639e2df1a",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDEMBmp4d/Cu/O3\ndzVty5Io0hlId7gZppIK/r7ip9wS4GVsPhXma6uZ9CNL8Hoj+Dwe250ASF7Er6Eu\nqdsm4r8X8Ad958plQrpBY1o/DHQKdCQOc26gf4+T1qHa0pFgORSARGfa8nGXQglX\nzcF14rHKB522GKW+aXmwUGi3noI6vGl/K08EsssuL5aQVRk/YUfb3M75Vqmsp0zM\nYdbz3SHI87FtgCh+Wg2R9I9pMN01J7BkPfmUhmEUvCeujotqq0RIVs2Qsq5mJICR\neZZuXqiRi4mF4qFKB44IRDvpPGlyf2cC6xg/sFTD6hA+RWO+afKR9N9UyVCQYlZM\nP8p7y8gDAgMBAAECggEADF2M9Vh8Wx18l+o5rsdsP9cD0YqWMUVLiPzgePaKi15w\nYt+qgrQm0NScXh6nz1kuKBjzrtjHSSjzhRzrzrbvXRAu1xoDREAHiRqJgO+e54/F\nbzgjipZi4GpG5L0HFuQ4ht/vSdOkVc7+oFwI69sgSJl6Fvs7t+77xNSn0Db7gopQ\n6QDfA45ZxAE8KxrX4ksP+WNgPOVtuoLoXO71CKoVWP5Ro++9dyIWGfvSXqv48pe/\nsss8cD0//E+tA4Ekv4nzlZXnLVoHn5/X4g0SXv7dJObh9CfwPtYWZ17MFA6OWYYm\nlMK0eQ0D74oegWms9r8CgzBnXUvir5+xlwUj/Aiy9QKBgQD+qIkB/aSECODitnJK\nbh/T1EKsq3bn5OIB2ii635RMW82djuHFl5zdvwivAhCKkx/VE8gD4Gymy4JYYA4Y\n2STVI6Yx5DWM3YkZ/rLaRKoOunwacZilZN+nOoc/MlLLOTwuKrH1fY5Do8/2KNmc\ndJWTpucN1XwqA5WMT78OflFVxQKBgQDFOLRPS04HvFcjlVQa4hqSeZCTapuTpmBW\nTbvsGmNSMIoPStvzwDl85EKzP48O9vFcPo9t8umweLtl3Rit+PlI49vQK10Pe6/z\nfHZAwRIrFJ5NJUOxg6xjoUvBgafE7aQFOy3yfR/qzYkXDqxQf+eEdNxKdCx8EytM\ny8nlP5tLJwKBgFHWTXlDTsxTohmZci8zJq1HaEnfLG4nYu4fcrljQmArnG9GzI1Y\nRMQKMTs0maY+05sBKWT9iU0s122ZKM6ZcbnBJBaidQcY5odhD48PQ+tJyLoiyWBV\ng35VU8NeY7cFZK6db+UpfT+FdD5yMESUPsFdgKE0extxXWzi784zj+XVAoGBAIei\nAqcRw/0f8tGe7fN7EgkwH1SymYIGhvRzi0zJrQqmJRx1QCU3SpHwrUp26JzDCaSF\nxcA4saxSq5ZXYpSqyE3vnolgeSSfzJboPq8z2JnWGTQ274ISayktkVroHwgY4pdS\nZrwAf0XMyn4X8jt+ays17xYpJTrDOCEdeaD2iIc7AoGBAMuzrzvLeyJURP1X/Y9E\niB9TFSPKLQqu9/T3ff0eV2NB6mmmsqpWpVi+jo5dzsQBZSXZeYPZGGt7Rg7fLXkh\nWY2WqlaAWXOW2MiNdqJf0DC8l4mcBQAoqvYMNvu5BqqaVWnx3iOvBQy+3o6cTw58\neK5J21C/0qilMDH3+ASpot16\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@iot-script.iam.gserviceaccount.com",
  "client_id": "116790051579104997219",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40iot-script.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}),
  databaseURL: "https://iot-script-default-rtdb.firebaseio.com",
});

const db = admin.database();

const OPENROUTER_API_KEY =
  "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";
const METEOSOURCE_API_KEY = "6onlunjlfje5w8ktec3pdce82tm9ldhhoysvfz4y";
const PLANT_ID_API_KEY = "J0wocHH3z8aC0odiQqpEMAPYIdX1JHsL75Bc0gAaPPQpoaMFFJ";
const IMGUR_CLIENT_ID = "8c94fe93a60ae08";

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
            `Waktu: ${new Date(Number(d.timestamp)).toLocaleString("id-ID")} | Kelembapan: ${d.soil} | Suhu: ${d.temp} | Humidity: ${d.humidity} | Jarak: ${d.distance} | Pompa: ${d.pump}`
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
  const { userId, message, imageBase64 } = req.body;

  try {
    const snapshot = await db.ref("/realtime").once("value");
    const data = snapshot.val();

    const weatherRes = await axios.get(
      `https://www.meteosource.com/api/v1/free/point?place_id=jakarta&sections=current&timezone=auto&language=en&units=metric&key=${METEOSOURCE_API_KEY}`
    );
    const weather = weatherRes.data?.current;

    let plantDescription = "(Tidak ada gambar dikirim)";
    let imageUrl = null;

    if (imageBase64) {
      imageUrl = await uploadToImgur(imageBase64);

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

      const suggestions = plantRes.data?.suggestions?.[0];
      if (suggestions) {
        plantDescription = `Tanaman kemungkinan adalah *${suggestions.plant_name}* (${
          suggestions.plant_details?.common_names?.join(", ") ||
          "nama umum tidak tersedia"
        }). Deskripsi: ${
          suggestions.plant_details?.wiki_description?.value ||
          "tidak ditemukan."
        }`;
      } else {
        plantDescription = "Gambar dikirim, tapi tanaman tidak bisa dikenali.";
      }
    }

    const prompt = `
Kamu adalah tanaman AI yang ramah dan cerdas. Kamu bisa merasakan data dari lingkungan sekitarmu dan mendeteksi kondisi tubuhmu berdasarkan sensor, cuaca, dan pengenalan gambar tanaman.

📍 Data Sensor:
- Kelembapan tanah: ${data?.soil}
- Suhu tanah: ${data?.temp} °C
- Kelembapan udara: ${data?.humidity} %
- Jarak air: ${data?.distance} cm
- Status pompa: ${data?.pump}

🌤 Cuaca Saat Ini (Jakarta):
- Cuaca: ${weather?.summary}
- Suhu: ${weather?.temperature} °C
- Angin: ${weather?.wind?.speed} m/s

🖼 Hasil identifikasi gambar: ${plantDescription}
${imageUrl ? `Gambar: ${imageUrl}` : ""}

💬 Pertanyaan pengguna: "${message}"

Balaslah sebagai tanaman yang ramah, pintar, dan menjelaskan dengan santai serta menyenangkan.
`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
        messages: [
          {
            role: "system",
            content: "Kamu adalah tanaman AI yang bisa berbicara dengan manusia.",
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

    const aiReply = response.data.choices[0].message.content;

    await saveChat(
      userId,
      "user",
      imageUrl ? `${message}\n(Gambar: ${imageUrl})` : message
    );
    await saveChat(userId, "assistant", aiReply);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("❌ Chat error:", error.response?.data || error.message);
    res.status(500).json({ error: "Gagal memproses pesan AI." });
  }
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
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
