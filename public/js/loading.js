document.addEventListener("DOMContentLoaded", () => {
  const countdownContainer = document.getElementById("countdown");

  async function pollGameStatus() {
    try {
      const res = await fetch("/gamestatus");
      const data = await res.json();

      if (data.status === "started") {
        startCountdown();
      } else {
        setTimeout(pollGameStatus, 1000);
      }
    } catch (err) {
      console.error("Error polling game status:", err);
      setTimeout(pollGameStatus, 2000);
    }
  }

  function startCountdown() {
    const images = ["3.png", "2.png", "1.png"];
    let i = 0;

    function showNext() {
      if (i < images.length) {
        countdownContainer.innerHTML = `<img src="/img/${images[i]}" class="countdown-img" alt="${images[i][0]}" />`;
        i++;
        setTimeout(showNext, 1000);
      } else {
        window.location.href = "/waitingroom";
      }
    }

    showNext();
  }

  pollGameStatus();
});
