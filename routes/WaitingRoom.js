document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-button");

  startButton.addEventListener("click", async () => {
    const readerDiv = document.getElementById("reader-frame");

    try {
      const html5QrCode = new Html5Qrcode("reader-frame");
      const config = { fps: 10, qrbox: 250 };

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        (decodedText, decodedResult) => {
          console.log("QR Code scanned:", decodedText);
          html5QrCode.stop(); // stop the camera after successful scan
          window.location.href = `/scan?characterID=${encodeURIComponent(decodedText)}`;
        },
        error => {
          // Optionally show scan errors
          console.warn("QR scan error", error);
        }
      );
    } catch (err) {
      alert("Camera access failed: " + err.message);
      console.error("Camera error:", err);
    }
  });
});
