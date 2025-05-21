document.addEventListener("DOMContentLoaded", () => {
  const resultContainer = document.getElementById('qr-reader-results');
  let lastResult = null;
  let countResults = 0;

  function onScanSuccess(decodedText, decodedResult) {
    if (decodedText !== lastResult) {
      ++countResults;
      lastResult = decodedText;

      // Display or process the result
      console.log(`Scan result ${decodedText}`, decodedResult);
      resultContainer.innerText = `Scanned: ${decodedText}`;

      // Optional: redirect after scan
      window.location.href = `/scan?characterID=${encodeURIComponent(decodedText)}`;
    }
  }

  const html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: 250 }
  );

  html5QrcodeScanner.render(onScanSuccess);
});
