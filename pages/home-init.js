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

function tickNow() {
  if (nowEl) nowEl.textContent = formatNow();
}

tickNow();
setInterval(tickNow, 1000);

(function initTitleLetters() {
  const WORDS = [
    { selector: ".anon__title-word--terence", text: "TERENCE" },
    { selector: ".anon__title-word--ntsako", text: "NTSAKO" },
    { selector: ".anon__title-word--maluleke", text: "MALULEKE" },
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const isMobile = window.matchMedia("(max-width: 768px), (hover: none)").matches;
  const FLIP_STAGGER_MS = isMobile ? 170 : 90;
  const INTRO_DELAY_MS = isMobile ? 480 : 280;

  function makeGlyph(char, extraClass) {
    const glyph = document.createElement("span");
    glyph.className = extraClass ? `anon__flap__glyph ${extraClass}` : "anon__flap__glyph";
    glyph.textContent = char;
    return glyph;
  }

  function makeHalf(className, char, bottom) {
    const half = document.createElement("span");
    half.className = className;
    half.appendChild(makeGlyph(char, bottom ? "anon__flap__glyph--bottom" : ""));
    return half;
  }

  function buildFlapLetter(char) {
    const letter = document.createElement("span");
    letter.className = "anon__title-letter";
    letter.dataset.char = char;

    const sizer = document.createElement("span");
    sizer.className = "anon__flap__sizer";
    sizer.textContent = char;
    letter.appendChild(sizer);

    const flap = document.createElement("span");
    flap.className = "anon__flap";
    flap.setAttribute("aria-hidden", "true");

    flap.appendChild(makeHalf("anon__flap__static anon__flap__static--top", char, false));
    flap.appendChild(makeHalf("anon__flap__static anon__flap__static--bottom", char, true));

    const hinge = document.createElement("span");
    hinge.className = "anon__flap__hinge";

    const front = document.createElement("span");
    front.className = "anon__flap__face anon__flap__face--front";
    front.appendChild(makeGlyph(char));

    const back = document.createElement("span");
    back.className = "anon__flap__face anon__flap__face--back";
    back.appendChild(makeGlyph(char, "anon__flap__glyph--bottom"));

    hinge.appendChild(front);
    hinge.appendChild(back);
    flap.appendChild(hinge);
    letter.appendChild(flap);
    return letter;
  }

  function flipLetter(letter) {
    if (!letter || letter.classList.contains("is-flipping")) return;
    letter.classList.remove("is-flipping");
    void letter.offsetWidth;
    letter.classList.add("is-flipping");
  }

  WORDS.forEach(({ selector, text }) => {
    const word = document.querySelector(selector);
    if (!word) return;

    word.textContent = "";
    [...text].forEach((char) => {
      word.appendChild(buildFlapLetter(char));
    });
  });

  const letters = [...document.querySelectorAll(".anon__title-letter")];

  letters.forEach((letter) => {
    const hinge = letter.querySelector(".anon__flap__hinge");
    hinge?.addEventListener("animationend", () => {
      letter.classList.remove("is-flipping");
    });
  });

  if (!reduceMotion && canHover) {
    letters.forEach((letter) => {
      letter.addEventListener("pointerenter", () => flipLetter(letter));
    });
  }

  if (reduceMotion || !letters.length) return;

  const AUTO_FLAP_MS = 60_000;
  let introPlayed = false;

  function runStaggeredFlip(delayMs = INTRO_DELAY_MS) {
    letters.forEach((letter, index) => {
      window.setTimeout(() => flipLetter(letter), delayMs + index * FLIP_STAGGER_MS);
    });
  }

  function runIntroFlip() {
    if (introPlayed) return;
    if (document.body.classList.contains("is-loading")) return;
    introPlayed = true;
    runStaggeredFlip();
  }

  if (document.body.classList.contains("is-loading")) {
    document.addEventListener("site:ready", runIntroFlip, { once: true });
    const poll = window.setInterval(() => {
      if (document.body.classList.contains("is-loading")) return;
      window.clearInterval(poll);
      runIntroFlip();
    }, 200);
    window.setTimeout(() => window.clearInterval(poll), 20000);
  } else {
    requestAnimationFrame(() => runIntroFlip());
  }

  window.setInterval(() => {
    if (document.body.classList.contains("is-loading")) return;
    runStaggeredFlip(0);
  }, AUTO_FLAP_MS);
})();
