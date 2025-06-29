// === Theme Toggle ===
const themeToggle = document.querySelector(".theme-toggle");
const body = document.body;

function toggleTheme() {
  if (body.classList.contains("theme-dark")) {
    body.classList.remove("theme-dark");
    body.classList.add("theme-nature");
    localStorage.setItem("theme", "nature");
  } else {
    body.classList.remove("theme-nature");
    body.classList.add("theme-dark");
    localStorage.setItem("theme", "dark");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const savedTheme = localStorage.getItem("theme");
  body.classList.add(savedTheme === "dark" ? "theme-dark" : "theme-nature");

  const bubbles = document.querySelectorAll(".bubble");
  bubbles.forEach((bubble) => {
    bubble.style.animation = "bubble-pop 0.3s ease";
  });

  const sections = document.querySelectorAll("section");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal");
        }
      });
    },
    { threshold: 0.1 }
  );

  sections.forEach((section) => {
    section.classList.add("hidden");
    revealObserver.observe(section);
  });

  // Muat riwayat chat saat halaman dibuka
  const chatWindow = document.querySelector(".chat-window");
  try {
    const res = await fetch(
      "https://gardenbot-production-b588.up.railway.app/history?userId=husen"
    );
    const history = await res.json();
    history.forEach((msg) => {
      const time = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      let content = msg.message;

      if (msg.image) {
        content = `<div><img src="${msg.image}" style="max-width:200px;border-radius:8px;margin-bottom:4px;"><br>${msg.message}</div>`;
      }

      const bubble = `
        <div class="chat-message ${msg.role}">
          ${msg.role === "assistant" ? '<span class="avatar">🌿</span>' : ""}
          <div class="bubble">${content}</div>
          <span class="timestamp">${time}</span>
        </div>`;
      chatWindow.innerHTML += bubble;
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    console.error("Gagal memuat riwayat:", err);
  }
});

themeToggle.addEventListener("click", toggleTheme);

// === Chatbot Logic ===
const input = document.querySelector(".chat-input");
const chatWindow = document.querySelector(".chat-window");
const imageInput = document.createElement("input");
imageInput.type = "file";
imageInput.accept = "image/*";
imageInput.style.display = "none";

document.body.appendChild(imageInput);

const uploadBtn = document.createElement("button");
uploadBtn.innerText = "📸 Upload Gambar Tanaman";
uploadBtn.classList.add("cta-button");
uploadBtn.style.marginTop = "1rem";
chatWindow.parentElement.appendChild(uploadBtn);

let uploadedImageBase64 = null;

uploadBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      uploadedImageBase64 = e.target.result.split(",")[1];
      const previewBubble = `
        <div class="chat-message user">
          <div class="bubble"><strong>📷 Gambar berhasil diunggah.</strong></div>
          <span class="timestamp">${new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>
      `;
      chatWindow.innerHTML += previewBubble;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    };
    reader.readAsDataURL(file);
  }
});

input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && input.value.trim() !== "") {
    const userMsg = input.value.trim();

    const userBubble = `
      <div class="chat-message user">
        <div class="bubble">${userMsg}</div>
        <span class="timestamp">${new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}</span>
      </div>
    `;
    chatWindow.innerHTML += userBubble;
    input.value = "";

    const typingBubble = `
      <div class="chat-message bot typing">
        <span class="avatar">🌿</span>
        <div class="bubble typing-dots"><span>.</span><span>.</span><span>.</span></div>
      </div>
    `;
    chatWindow.innerHTML += typingBubble;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
      const response = await fetch(
        "https://gardenbot-production-b588.up.railway.app/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "husen",
            message: userMsg,
            imageBase64: uploadedImageBase64,
          }),
        }
      );
      const data = await response.json();
      document.querySelector(".chat-message.typing").remove();

      const botText = data.reply;

      const botBubble = `
  <div class="chat-message bot">
    <span class="avatar">🌿</span>
    <div class="bubble">${botText}</div>
    <span class="timestamp">${new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })}</span>
  </div>
`;
      chatWindow.innerHTML += botBubble;
      chatWindow.scrollTop = chatWindow.scrollHeight;

      chatWindow.scrollTop = chatWindow.scrollHeight;

      uploadedImageBase64 = null;
    } catch (err) {
      document.querySelector(".chat-message.typing").remove();
      chatWindow.innerHTML += `
        <div class="chat-message bot">
          <span class="avatar">🌿</span>
          <div class="bubble">Maaf, aku tidak bisa merespons saat ini 😢</div>
          <span class="timestamp">${new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}</span>
        </div>
      `;
    }
  }
});
// === Statistik Sensor ===
let currentChart = null;
async function renderSensorChart() {
  try {
    const res = await fetch(
      "https://gardenbot-production-b588.up.railway.app/sensor/history"
    );
    const sensorData = await res.json();

    const labels = sensorData.map((d, i) => `#${i + 1}`);
    const soil = sensorData.map((d) => d.soil);
    const temp = sensorData.map((d) => d.temp);
    const humidity = sensorData.map((d) => d.humidity);

    const ctx = document.getElementById("sensorChart").getContext("2d");

    // 🔥 Jika ada chart lama, hapus dulu
    if (currentChart) {
      currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Kelembaban Tanah (%)",
            data: soil,
            borderColor: "#4CAF50",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Suhu Tanah (°C)",
            data: temp,
            borderColor: "#FF9800",
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Kelembaban Udara (%)",
            data: humidity,
            borderColor: "#2196F3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: {
            display: true,
            text: "Histori Sensor Tanaman",
          },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  } catch (err) {
    console.error("Gagal memuat grafik sensor:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderSensorChart();
  setInterval(renderSensorChart, 5000); // auto-update setiap 5 detik
});

document.getElementById("delete-chat").addEventListener("click", async () => {
  const konfirmasi = confirm(
    "Apakah kamu yakin ingin menghapus semua riwayat chat?"
  );
  if (!konfirmasi) return;

  try {
    const res = await fetch(
      "https://gardenbot-production-b588.up.railway.app/history/reset?userId=husen",
      {
        method: "DELETE",
      }
    );

    const data = await res.json();
    if (data.success) {
      alert("Histori chat berhasil dihapus.");
      // Kosongkan isi chatWindow
      document.querySelector(".chat-window").innerHTML = "";
    } else {
      alert("Gagal menghapus histori chat.");
    }
  } catch (err) {
    console.error("Gagal menghapus histori:", err);
    alert("Terjadi kesalahan saat menghapus chat.");
  }
});

function downloadFile(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

document.getElementById("export-chat-json").addEventListener("click", () => {
  const url = `https://gardenbot-production-b588.up.railway.app/export/history?userId=husen`;
  downloadFile(url, "chat-history.json");
});

document.getElementById("export-chat-txt").addEventListener("click", () => {
  const url = `https://gardenbot-production-b588.up.railway.app/export/history?userId=husen&format=txt`;
  downloadFile(url, "chat-history.txt");
});

document.getElementById("export-sensor-json").addEventListener("click", () => {
  const url = `https://gardenbot-production-b588.up.railway.app/export/sensor`;
  downloadFile(url, "sensor-data.json");
});

document.getElementById("export-sensor-txt").addEventListener("click", () => {
  const url = `https://gardenbot-production-b588.up.railway.app/export/sensor?format=txt`;
  downloadFile(url, "sensor-data.txt");
});
