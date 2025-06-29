document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("http://localhost:3000/sensor/history");
    const data = await res.json();

    const labels = data.map(d => new Date(d.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }));
    const soil = data.map(d => d.soil);
    const temp = data.map(d => d.temp);
    const humidity = data.map(d => d.humidity);
    const distance = data.map(d => d.distance);

    const ctx = document.getElementById('sensorChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Kelembapan Tanah',
            data: soil,
            borderColor: '#4CAF50',
            fill: false
          },
          {
            label: 'Suhu Tanah (°C)',
            data: temp,
            borderColor: '#FF5722',
            fill: false
          },
          {
            label: 'Kelembapan Udara (%)',
            data: humidity,
            borderColor: '#2196F3',
            fill: false
          },
          {
            label: 'Jarak Air (cm)',
            data: distance,
            borderColor: '#9C27B0',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  } catch (err) {
    console.error("Gagal memuat grafik:", err);
  }
});
