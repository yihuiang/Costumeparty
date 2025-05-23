document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-button");
  const resultContainer = document.getElementById("qr-reader-results");
  const qrRegionId = "reader";
  let html5QrCode;

  startButton.addEventListener("click", () => {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode(qrRegionId);
    }

    Html5Qrcode.getCameras().then(cameras => {
      const backCam = cameras.find(cam =>
        cam.label.toLowerCase().includes("back") ||
        cam.label.toLowerCase().includes("rear")
      );
      const selectedCam = backCam || cameras[0];

      html5QrCode.start(
        selectedCam.id,
        { fps: 10, qrbox: {width:250, height: 350 }},//square
        (decodedText) => {
          resultContainer.innerText = `Scanned: ${decodedText}`;
          html5QrCode.stop().then(() => {
            window.location.href = `/scan?characterID=${encodeURIComponent(decodedText)}`;
          });
        },
        (err) => {
          console.warn("Scan error:", err);
        }
      ).catch(err => {
        resultContainer.innerText = "Camera start failed: " + err;
      });
    }).catch(err => {
      resultContainer.innerText = "Camera access error: " + err;
    });
  });
});
