const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const card = $("#love-card");
const scenes = $$("[data-scene-panel]");
const statusLabel = $("#status-label");
const yesButton = $("#yes-button");
const noButton = $("#no-button");
const noLabel = $("#no-label");
const noSublabel = $("#no-sublabel");
const responseLine = $("#response-line");
const responseCopy = $("#response-copy");
const mascot = $("#mascot");
const mascotThought = $("#mascot-thought span");
const answerZone = $("#answer-zone");
const soundToggle = $("#sound-toggle");
const motionToggle = $("#motion-toggle");
const canvas = $("#celebration-canvas");
const ctx = canvas.getContext("2d");
const trail = $("#cursor-trail");
const toast = $("#toast");
const toastCopy = $("#toast-copy");
const dateForm = $("#date-form");
const dateInput = $("#date-input");

const statusText = {
  asking: "tiny transmission incoming",
  accepted: "best timeline unlocked",
  planner: "planning something lovely",
  confirmed: "date successfully secured",
  maybe: "invitation safely saved",
};

const noResponses = [
  {
    message: "Wait — what if snacks are involved?",
    label: "REALLY?",
    sublabel: "think snacks",
    thought: "I have snacks...",
  },
  {
    message: "The playlist is already 43% perfect.",
    label: "STILL NO?",
    sublabel: "but the playlist",
    thought: "and a playlist!",
  },
  {
    message: "Even the stars have RSVP’d yes ✦",
    label: "YOU SURE?",
    sublabel: "the stars voted",
    thought: "look at the stars!",
  },
  {
    message: "Counteroffer: one tiny, ridiculously cute date?",
    label: "MAYBE?",
    sublabel: "tiny date",
    thought: "just one?",
  },
  {
    message: "That was almost suspiciously close.",
    label: "NICE TRY",
    sublabel: "too speedy",
    thought: "whoosh!",
  },
  {
    message: "The tiny cloud has entered stealth mode.",
    label: "NOPE",
    sublabel: "cloud speed",
    thought: "can’t catch me!",
  },
  {
    message: "A dramatic dodge, worthy of a movie montage.",
    label: "SO CLOSE",
    sublabel: "cinematic escape",
    thought: "dramatic gasp!",
  },
  {
    message: "The universe says: try the blue button instead.",
    label: "UH-UH",
    sublabel: "follow the stars",
    thought: "the stars say yes!",
  },
  {
    message: "This button has excellent cardio, apparently.",
    label: "ZOOM",
    sublabel: "very nimble",
    thought: "tiny fast feet!",
  },
  {
    message: "Plot armor activated. The NO escaped again.",
    label: "ESCAPED",
    sublabel: "plot armor",
    thought: "I’m protected!",
  },
  {
    message: "You are impressively determined. Respect.",
    label: "PERSISTENT",
    sublabel: "I see you",
    thought: "still trying?",
  },
  {
    message: "The blue sky is cheering for your reflexes.",
    label: "DODGE!",
    sublabel: "sky-approved",
    thought: "go, little cloud!",
  },
];

const safeNoPositions = [
  { x: 74, y: -38, r: 4 },
  { x: -62, y: 47, r: -5 },
  { x: 98, y: 38, r: 5 },
  { x: -84, y: -38, r: -4 },
  { x: 42, y: 55, r: 3 },
  { x: 112, y: -4, r: -6 },
  { x: -102, y: 9, r: 6 },
  { x: 12, y: -58, r: 2 },
  { x: -18, y: 58, r: -2 },
];

let currentScene = "asking";
let noCount = 0;
let noCaughtCount = 0;
let lastNoPositionIndex = -1;
let transitionLocked = false;
let soundEnabled = false;
let audioContext;
let toastTimer;
let trailLastTime = 0;
const systemPrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let reducedMotion = systemPrefersReducedMotion;
let selectedPlan = null;
let transitionTimer;
let entranceTimer;
let responseTimer;
let mascotTimer;
let noFinalTimer;
let acceptTimer;
let acceptPending = false;
let celebrationFrame;
let lastNoPointerType = "mouse";

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createSky() {
  const stars = $("#stars");
  const starFragment = document.createDocumentFragment();

  for (let i = 0; i < 28; i += 1) {
    const star = document.createElement("i");
    star.className = "star";
    star.style.left = `${randomBetween(2, 98)}%`;
    star.style.top = `${randomBetween(3, 72)}%`;
    star.style.setProperty("--size", `${randomBetween(4, 12)}px`);
    star.style.setProperty("--opacity", randomBetween(0.25, 0.9).toFixed(2));
    star.style.setProperty("--duration", `${randomBetween(2.2, 5.5)}s`);
    star.style.setProperty("--delay", `${randomBetween(-5, 0)}s`);
    starFragment.append(star);
  }
  stars.append(starFragment);

  [
    { root: $("#clouds-far"), amount: 5, min: 120, max: 250, blur: 1.6, opacity: [0.28, 0.5], duration: [45, 72] },
    { root: $("#clouds-near"), amount: 4, min: 150, max: 280, blur: 0, opacity: [0.45, 0.72], duration: [34, 56] },
  ].forEach((layer, layerIndex) => {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < layer.amount; i += 1) {
      const cloud = document.createElement("i");
      cloud.className = "cloud";
      cloud.style.setProperty("--top", `${randomBetween(7 + layerIndex * 8, 74)}%`);
      cloud.style.setProperty("--left", `${randomBetween(-35, 85)}%`);
      cloud.style.setProperty("--width", `${randomBetween(layer.min, layer.max)}px`);
      cloud.style.setProperty("--blur", `${layer.blur}px`);
      cloud.style.setProperty("--opacity", randomBetween(...layer.opacity).toFixed(2));
      cloud.style.setProperty("--duration", `${randomBetween(...layer.duration)}s`);
      cloud.style.setProperty("--delay", `${randomBetween(-70, -3)}s`);
      fragment.append(cloud);
    }
    layer.root.append(fragment);
  });
}

function setScene(nextScene, { immediate = false, focus = true, force = false } = {}) {
  if ((transitionLocked && !force) || (currentScene === nextScene && !force)) return;
  if (force) {
    window.clearTimeout(transitionTimer);
    window.clearTimeout(entranceTimer);
    transitionLocked = false;
  }
  transitionLocked = true;

  const previous = $(`[data-scene-panel="${currentScene}"]`);
  const next = $(`[data-scene-panel="${nextScene}"]`);
  const transitionTime = immediate || reducedMotion ? 0 : 240;

  previous?.classList.add("is-leaving");

  transitionTimer = window.setTimeout(() => {
    scenes.forEach((scene) => {
      scene.hidden = scene !== next;
      scene.classList.remove("is-active", "is-leaving", "is-entering");
    });

    currentScene = nextScene;
    card.dataset.scene = nextScene;
    statusLabel.textContent = statusText[nextScene];
    next.hidden = false;
    next.classList.add("is-active", "is-entering");
    card.scrollTop = 0;

    if (focus) {
      const heading = $("h1", next);
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        card.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        requestAnimationFrame(() => {
          card.scrollTop = 0;
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });
      }
    }

    entranceTimer = window.setTimeout(() => next.classList.remove("is-entering"), reducedMotion ? 0 : 900);
    transitionLocked = false;
  }, transitionTime);
}

function updateResponse(message) {
  responseLine.classList.remove("is-updating");
  void responseLine.offsetWidth;
  responseCopy.textContent = message;
  responseLine.classList.add("is-updating");
  window.clearTimeout(responseTimer);
  responseTimer = window.setTimeout(() => responseLine.classList.remove("is-updating"), 450);
}

function spawnPoof(button) {
  if (reducedMotion) return;
  const rect = button.getBoundingClientRect();
  for (let i = 0; i < 9; i += 1) {
    const puff = document.createElement("i");
    puff.className = "poof-particle";
    puff.style.left = `${rect.left + rect.width / 2}px`;
    puff.style.top = `${rect.top + rect.height / 2}px`;
    puff.style.setProperty("--size", `${randomBetween(7, 16)}px`);
    puff.style.setProperty("--x", `${randomBetween(-70, 70)}px`);
    puff.style.setProperty("--y", `${randomBetween(-45, 45)}px`);
    document.body.append(puff);
    puff.addEventListener("animationend", () => puff.remove(), { once: true });
  }
}

function getNextNoPosition() {
  let nextIndex = Math.floor(Math.random() * safeNoPositions.length);
  if (safeNoPositions.length > 1) {
    while (nextIndex === lastNoPositionIndex) {
      nextIndex = Math.floor(Math.random() * safeNoPositions.length);
    }
  }
  lastNoPositionIndex = nextIndex;
  return safeNoPositions[nextIndex];
}

function handleNo({ keyboard = false, caught = false } = {}) {
  if (currentScene !== "asking" || transitionLocked) return;

  const response = noResponses[noCount % noResponses.length];
  const loopNumber = Math.floor(noCount / noResponses.length) + 1;
  const position = getNextNoPosition();
  const mobileFactor = window.innerWidth < 540 ? 0.46 : 1;

  spawnPoof(noButton);
  playSound("pop");

  noCount += 1;
  noLabel.textContent = response.label;
  noSublabel.textContent = response.sublabel;
  mascotThought.textContent = response.thought;
  updateResponse(loopNumber > 1 ? `${response.message} (Dodge ${noCount}.)` : response.message);
  mascot.classList.add("is-worried");
  window.clearTimeout(mascotTimer);
  mascotTimer = window.setTimeout(() => mascot.classList.remove("is-worried"), 800);

  noButton.style.setProperty("--no-x", keyboard ? "0px" : `${position.x * mobileFactor}px`);
  noButton.style.setProperty("--no-y", keyboard ? "0px" : `${position.y * mobileFactor}px`);
  noButton.style.setProperty("--no-rotate", keyboard ? "0deg" : `${position.r}deg`);
  noButton.style.setProperty("--no-scale", `${Math.max(0.84, 1 - (noCount % 5) * 0.025)}`);
  noButton.classList.remove("is-dodging");
  void noButton.offsetWidth;
  noButton.classList.add("is-dodging");

  if (caught) {
    noCaughtCount += 1;
    const yesScale = Math.min(2.2, 1 + noCaughtCount * 0.12);
    yesButton.style.setProperty("--yes-scale", yesScale.toFixed(2));
    updateResponse(`${response.message} You caught it — YES grew ${noCaughtCount === 1 ? "a little" : "again"} ✦`);
    playSound("soft");
  }
}

function handleNoHover(event) {
  if (event.pointerType !== "mouse" || currentScene !== "asking") return;
  handleNo();
}

function cancelPendingActions() {
  [responseTimer, mascotTimer, noFinalTimer, acceptTimer].forEach((timer) => window.clearTimeout(timer));
  acceptPending = false;
  if (celebrationFrame) cancelAnimationFrame(celebrationFrame);
  celebrationFrame = undefined;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function resetInvitation({ immediate = false } = {}) {
  cancelPendingActions();
  noCount = 0;
  noCaughtCount = 0;
  lastNoPositionIndex = -1;
  selectedPlan = null;
  dateForm.reset();
  $(".field-status").textContent = "choose wisely ✦";
  noLabel.textContent = "NO";
  noSublabel.textContent = "be brave";
  responseCopy.textContent = "The sky is holding its breath...";
  mascotThought.textContent = "you + me?";
  yesButton.style.removeProperty("--yes-scale");
  yesButton.style.removeProperty("--magnet-x");
  yesButton.style.removeProperty("--magnet-y");
  noButton.style.removeProperty("--no-x");
  noButton.style.removeProperty("--no-y");
  noButton.style.removeProperty("--no-rotate");
  noButton.style.removeProperty("--no-scale");
  mascot.classList.remove("is-happy", "is-worried");
  noButton.classList.remove("is-dodging");
  responseLine.classList.remove("is-updating");
  card.classList.remove("replay-pop");

  if (currentScene === "asking" && !transitionLocked) {
    void card.offsetWidth;
    card.classList.add("replay-pop");
    statusLabel.textContent = statusText.asking;
  } else {
    setScene("asking", { immediate: true, focus: true, force: true });
  }
}

function acceptInvitation() {
  if (currentScene !== "asking" || transitionLocked || acceptPending) return;
  acceptPending = true;
  playSound("success");
  spawnRipple(yesButton);
  mascot.classList.add("is-happy");
  launchCelebration();
  acceptTimer = window.setTimeout(() => {
    acceptPending = false;
    setScene("accepted");
  }, reducedMotion ? 0 : 180);
}

function setupMagnetism() {
  answerZone.addEventListener("pointermove", (event) => {
    if (reducedMotion || currentScene !== "asking") return;
    const rect = yesButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
    if (distance < 170) {
      const pull = (1 - distance / 170) * 12;
      const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      yesButton.style.setProperty("--magnet-x", `${Math.cos(angle) * pull}px`);
      yesButton.style.setProperty("--magnet-y", `${Math.sin(angle) * pull}px`);
    } else {
      yesButton.style.setProperty("--magnet-x", "0px");
      yesButton.style.setProperty("--magnet-y", "0px");
    }
  });

  answerZone.addEventListener("pointerleave", () => {
    yesButton.style.setProperty("--magnet-x", "0px");
    yesButton.style.setProperty("--magnet-y", "0px");
  });
}

function setupParallax() {
  window.addEventListener("pointermove", (event) => {
    const xRatio = event.clientX / window.innerWidth;
    const yRatio = event.clientY / window.innerHeight;
    document.documentElement.style.setProperty("--pointer-x", `${xRatio * 100}%`);
    document.documentElement.style.setProperty("--pointer-y", `${yRatio * 100}%`);

    if (!reducedMotion && window.innerWidth > 720) {
      card.style.setProperty("--card-tilt-y", `${(xRatio - 0.5) * 3.8}deg`);
      card.style.setProperty("--card-tilt-x", `${(0.5 - yRatio) * 3}deg`);
    }

    if (!reducedMotion && event.timeStamp - trailLastTime > 44 && window.matchMedia("(pointer: fine)").matches) {
      trailLastTime = event.timeStamp;
      createTrailParticle(event.clientX, event.clientY);
    }
  }, { passive: true });

  document.addEventListener("pointerleave", () => {
    card.style.setProperty("--card-tilt-x", "0deg");
    card.style.setProperty("--card-tilt-y", "0deg");
  });
}

function createTrailParticle(x, y) {
  if (trail.childElementCount > 18) trail.firstElementChild?.remove();
  const particle = document.createElement("i");
  particle.className = "trail-particle";
  particle.textContent = Math.random() > 0.45 ? "♥" : "✦";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.setProperty("--size", `${randomBetween(6, 13)}px`);
  particle.style.setProperty("--drift-x", `${randomBetween(-16, 16)}px`);
  particle.style.setProperty("--rotation", `${randomBetween(-80, 80)}deg`);
  trail.append(particle);
  particle.addEventListener("animationend", () => particle.remove(), { once: true });
}

function spawnRipple(target) {
  if (reducedMotion) return;
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement("i");
  ripple.className = "click-ripple";
  ripple.style.left = `${rect.left + rect.width / 2}px`;
  ripple.style.top = `${rect.top + rect.height / 2}px`;
  document.body.append(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function launchCelebration(origin = yesButton) {
  if (reducedMotion) return;
  if (celebrationFrame) cancelAnimationFrame(celebrationFrame);
  resizeCanvas();
  const originRect = origin?.getBoundingClientRect();
  const fallbackRect = card.getBoundingClientRect();
  const startX = originRect?.width ? originRect.left + originRect.width / 2 : fallbackRect.left + fallbackRect.width / 2;
  const startY = originRect?.height ? originRect.top + originRect.height / 2 : fallbackRect.top + fallbackRect.height / 2;
  const colors = ["#ffffff", "#8fdcff", "#2eb4f5", "#7d9cff", "#ffd8ca"];
  const particles = Array.from({ length: 110 }, (_, index) => {
    const angle = randomBetween(-Math.PI * 0.93, -Math.PI * 0.07);
    const speed = randomBetween(5, 14);
    return {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed + randomBetween(-2, 2),
      vy: Math.sin(angle) * speed,
      gravity: randomBetween(0.14, 0.27),
      drag: 0.987,
      size: randomBetween(4, 9),
      rotation: randomBetween(0, Math.PI * 2),
      rotationSpeed: randomBetween(-0.22, 0.22),
      color: colors[index % colors.length],
      kind: index % 5 === 0 ? "heart" : "confetti",
      opacity: 1,
    };
  });

  const startedAt = performance.now();

  function draw(now) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const elapsed = now - startedAt;

    particles.forEach((particle) => {
      particle.vx *= particle.drag;
      particle.vy = particle.vy * particle.drag + particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      particle.opacity = Math.max(0, 1 - Math.max(0, elapsed - 1200) / 900);

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      if (particle.kind === "heart") {
        const s = particle.size / 2;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.55);
        ctx.bezierCurveTo(-s * 1.7, -s * 0.45, -s * 0.9, -s * 1.65, 0, -s * 0.75);
        ctx.bezierCurveTo(s * 0.9, -s * 1.65, s * 1.7, -s * 0.45, 0, s * 0.55);
        ctx.fill();
      } else {
        ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
      }
      ctx.restore();
    });

    if (elapsed < 2150) {
      celebrationFrame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      celebrationFrame = undefined;
    }
  }

  celebrationFrame = requestAnimationFrame(draw);
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function tone(frequency, start, duration, volume = 0.035, type = "sine") {
  if (!soundEnabled) return;
  const audio = ensureAudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime + start);
  gain.gain.setValueAtTime(0, audio.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, audio.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(audio.currentTime + start);
  oscillator.stop(audio.currentTime + start + duration + 0.02);
}

function playSound(type) {
  if (!soundEnabled) return;

  if (type === "pop") {
    tone(420, 0, 0.08, 0.025, "triangle");
    tone(310, 0.04, 0.1, 0.018, "sine");
  } else if (type === "success") {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, index * 0.075, 0.38, 0.035, "sine"));
    tone(392, 0, 0.55, 0.012, "triangle");
  } else if (type === "soft") {
    tone(440, 0, 0.22, 0.02, "sine");
    tone(554.37, 0.11, 0.28, 0.018, "sine");
  } else if (type === "click") {
    tone(620, 0, 0.06, 0.018, "triangle");
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Turn sound on");
  soundToggle.title = soundEnabled ? "Mute sound" : "Turn sound on";
  if (soundEnabled) {
    ensureAudioContext();
    playSound("soft");
    showToast("Sound on — tiny chimes unlocked");
  } else {
    showToast("Sound muted");
  }
}

function toggleMotion() {
  if (systemPrefersReducedMotion) {
    showToast("Reduced motion follows your system setting");
    return;
  }
  reducedMotion = !reducedMotion;
  document.body.classList.toggle("reduced-motion", reducedMotion);
  motionToggle.setAttribute("aria-pressed", String(reducedMotion));
  motionToggle.setAttribute("aria-label", reducedMotion ? "Turn motion on" : "Reduce motion");
  motionToggle.title = reducedMotion ? "Turn motion on" : "Reduce motion";
  if (reducedMotion) {
    if (celebrationFrame) cancelAnimationFrame(celebrationFrame);
    celebrationFrame = undefined;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  showToast(reducedMotion ? "Motion reduced" : "Full motion restored");
}

function showToast(message) {
  toastCopy.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function handlePlanSubmit(event) {
  event.preventDefault();
  if (!dateForm.reportValidity()) return;

  const data = new FormData(dateForm);
  selectedPlan = {
    date: data.get("date"),
    vibe: data.get("vibe"),
    time: data.get("time"),
  };

  $("#ticket-date").textContent = formatDate(selectedPlan.date);
  $("#ticket-vibe").textContent = selectedPlan.vibe;
  $("#ticket-time").textContent = selectedPlan.time;
  playSound("success");
  launchCelebration($("#seal-plan-button"));
  setScene("confirmed");
}

function getPlanText() {
  if (!selectedPlan) return "";
  return `It’s a date! 💙\n${selectedPlan.vibe}\n${formatDate(selectedPlan.date)} · ${selectedPlan.time}\nForecast: 100% chance of butterflies`;
}

async function copyPlan() {
  if (!selectedPlan) return;
  try {
    await navigator.clipboard.writeText(getPlanText());
    $("#copy-label").textContent = "Copied!";
    showToast("Plan copied — send it to your favorite person");
    playSound("click");
    window.setTimeout(() => { $("#copy-label").textContent = "Copy plan"; }, 2300);
  } catch {
    showToast("Couldn’t copy automatically — a screenshot works too!");
  }
}

function downloadCalendarInvite() {
  if (!selectedPlan) return;
  const [year, month, day] = selectedPlan.date.split("-");
  const compactDate = `${year}${month}${day}`;
  const startHours = { "Late morning": 11, "Golden hour": 18, "After dark": 20 }[selectedPlan.time] ?? 18;
  const pad = (value) => String(value).padStart(2, "0");
  const startTime = `${pad(startHours)}0000`;
  const endTime = `${pad(startHours + 2)}0000`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const description = `Our plan: ${selectedPlan.vibe} around ${selectedPlan.time}. Forecast: 100% chance of butterflies.`;
  const escapeIcsText = (value) => String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
  const foldIcsLine = (line) => {
    const encoder = new TextEncoder();
    const parts = [];
    let part = "";
    for (const character of line) {
      if (encoder.encode(part + character).length > 75) {
        parts.push(part);
        part = ` ${character}`;
      } else {
        part += character;
      }
    }
    if (part) parts.push(part);
    return parts.join("\r\n");
  };
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blue Note//Love Note//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@blue-note.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactDate}T${startTime}`,
    `DTEND:${compactDate}T${endTime}`,
    `SUMMARY:${escapeIcsText(selectedPlan.vibe)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(foldIcsLine).join("\r\n") + "\r\n";

  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "our-little-date.ics";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Calendar invite ready — it’s officially official");
  playSound("click");
}

function setMinimumDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  dateInput.min = now.toISOString().slice(0, 10);
}

function setupKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    if (currentScene !== "asking" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(document.activeElement?.tagName)) return;

    if (event.key.toLowerCase() === "y") {
      event.preventDefault();
      acceptInvitation();
    }

    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      handleNo({ keyboard: true });
    }
  });
}

function setupListeners() {
  $(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    history.replaceState(null, "", "#main-content");
    $("#main-content").focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
  yesButton.addEventListener("click", acceptInvitation);
  noButton.addEventListener("pointerenter", handleNoHover);
  noButton.addEventListener("pointerdown", (event) => { lastNoPointerType = event.pointerType; });
  noButton.addEventListener("click", (event) => {
    const pointerType = event.pointerType || lastNoPointerType;
    if (event.detail === 0) {
      handleNo({ keyboard: true, caught: true });
    } else if (pointerType === "touch" || pointerType === "pen") {
      handleNo({ caught: true });
    } else {
      handleNo({ caught: true });
    }
  });

  soundToggle.addEventListener("click", toggleSound);
  motionToggle.addEventListener("click", toggleMotion);
  $("#plan-button").addEventListener("click", () => { playSound("click"); setScene("planner"); });
  $("#accepted-replay").addEventListener("click", () => { launchCelebration($(".celebration-icon")); playSound("success"); });
  $("#maybe-back-button").addEventListener("click", () => resetInvitation());
  $("#card-replay").addEventListener("click", () => resetInvitation());
  $("#start-over-button").addEventListener("click", () => resetInvitation());
  $("#copy-button").addEventListener("click", copyPlan);
  $("#calendar-button").addEventListener("click", downloadCalendarInvite);
  dateForm.addEventListener("submit", handlePlanSubmit);

  dateInput.addEventListener("change", () => {
    const fieldStatus = $(".field-status");
    fieldStatus.textContent = dateInput.value ? `${formatDate(dateInput.value)} ✦` : "choose wisely ✦";
    playSound("click");
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    if (window.innerWidth <= 720) {
      card.style.setProperty("--card-tilt-x", "0deg");
      card.style.setProperty("--card-tilt-y", "0deg");
    }
  }, { passive: true });
}

function init() {
  createSky();
  setMinimumDate();
  resizeCanvas();
  setupListeners();
  setupMagnetism();
  setupParallax();
  setupKeyboardControls();

  soundToggle.title = "Turn sound on";
  motionToggle.disabled = systemPrefersReducedMotion;
  motionToggle.setAttribute("aria-pressed", String(reducedMotion));
  motionToggle.setAttribute("aria-label", systemPrefersReducedMotion ? "Reduced motion follows system setting" : reducedMotion ? "Turn motion on" : "Reduce motion");
  motionToggle.title = systemPrefersReducedMotion ? "Reduced motion follows system setting" : reducedMotion ? "Turn motion on" : "Reduce motion";
  document.body.classList.toggle("reduced-motion", reducedMotion);
}

init();
