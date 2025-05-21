document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-button");

  startButton.addEventListener("click", () => {
    const html5QrCode = new Html5Qrcode("reader-frame");
    const qrConfig = { fps: 10, qrbox: 250 };

    html5QrCode.start(
      { facingMode: "environment" },
      qrConfig,
      qrCodeMessage => {
        console.log("QR Code detected:", qrCodeMessage);
        window.location.href = `/scan?characterID=${encodeURIComponent(qrCodeMessage)}`;
      },
      error => {
        // Optional: log read errors
      }
    ).catch(err => {
      console.error("Camera start failed:", err);
    });
  });
});
