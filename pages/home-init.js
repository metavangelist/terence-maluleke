function formatNow(date = new Date()) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const h = date.getHours();
  const hh = h % 12 || 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} · ${hh}:${mm}:${ss} ${ampm}`;
}

const nowEl = document.getElementById("homeNow");
const blobClockEl = document.getElementById("blobClock");

function tickNow() {
  const t = formatNow();
  if (nowEl) nowEl.textContent = t;
  if (blobClockEl) blobClockEl.textContent = t;
}

tickNow();
setInterval(tickNow, 1000);