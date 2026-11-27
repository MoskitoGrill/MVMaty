const symbols = [
  ["cherry", "Třešně", 32, 12], ["lemon", "Citron", 24, 15],
  ["plum", "Švestka", 18, 25], ["bell", "Zvonek", 12, 50],
  ["star", "Hvězda", 8, 100], ["diamond", "Diamant", 4, 250],
  ["seven", "Sedmička", 2, 500],
];
const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("cs");
const signed = new Intl.NumberFormat("cs", { signDisplay: "exceptZero" });
const percent = new Intl.NumberFormat("cs", { style: "percent", maximumFractionDigits: 2 });
const settingsKey = "mvm-settings-v1";
const roundKey = "mvm-round-v1";
let config = {
  bet: 100, tokens: [1, 5, 10], sound: true,
  showCredit: true, showBet: false, showPaid: false, homeFlicker: "fast",
  payouts: symbols.map((symbol) => symbol[3]),
  ...read(settingsKey, {}),
};
let round = read(roundKey, null);
let spinning = false;
let audio;
const reels = [...document.querySelectorAll(".reel")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let demoFaces = [0, 1, 2];
let demoVersion = 0;
let demoSpinsUntilWin = nextDemoWin();
let titleAnimation;

function resetTitle() {
  titleAnimation?.cancel();
  titleAnimation = undefined;
  $("titleWin").hidden = true;
  $("titleOriginal").classList.remove("is-covered");
}

async function showTitleWin(payout) {
  const sign = $("titleSign");
  if (!reducedMotion.matches) {
    const outgoing = sign.animate(
      [{ transform: "perspective(600px) rotateX(0deg)" }, { transform: "perspective(600px) rotateX(-450deg)" }],
      { duration: 620, easing: "cubic-bezier(.4,0,.75,1)", fill: "forwards" },
    );
    titleAnimation = outgoing;
    try { await outgoing.finished; } catch { return; }
    if (titleAnimation !== outgoing) return;
    outgoing.cancel();
  }

  const amount = number.format(payout);
  $("titleAmount").textContent = amount;
  $("titleAmount").classList.toggle("long-amount", amount.length > 8);
  $("titleOriginal").classList.add("is-covered");
  $("titleWin").hidden = false;
  if (!reducedMotion.matches) {
    titleAnimation = sign.animate(
      [
        { transform: "perspective(600px) rotateX(90deg)", easing: "ease-out" },
        { transform: "perspective(600px) rotateX(-23deg)", offset: 0.58, easing: "ease-in-out" },
        { transform: "perspective(600px) rotateX(7deg)", offset: 0.84, easing: "ease-out" },
        { transform: "perspective(600px) rotateX(0deg)" },
      ],
      { duration: 540 },
    );
  }
}

const lightPatterns = [
  { width: 157, height: 111, x: 0.76, y: 0.27, radius: 17 },
  { width: 173, height: 149, x: 0.31, y: 0.79, radius: 28 },
  { width: 101, height: 133, x: 0.71, y: 0.65, radius: 26 },
  { width: 137, height: 161, x: 0.17, y: 0.24, radius: 19 },
];

function renderBackgroundLights() {
  const layer = $("backgroundLights");
  const lights = document.createDocumentFragment();
  const width = layer.clientWidth;
  const height = layer.clientHeight;
  lightPatterns.forEach((pattern, index) => {
    for (let y = 0; y < height; y += pattern.height) {
      for (let x = 0; x < width; x += pattern.width) {
        const dot = document.createElement("span");
        dot.className = "background-dot";
        dot.dataset.pattern = index;
        dot.style.left = x + pattern.width * pattern.x + "px";
        dot.style.top = y + pattern.height * pattern.y + "px";
        dot.style.width = pattern.radius * 2 + "px";
        dot.style.clipPath = "inset("
          + Math.max(0, pattern.radius - pattern.height * pattern.y) + "px "
          + Math.max(0, pattern.radius - pattern.width * (1 - pattern.x)) + "px "
          + Math.max(0, pattern.radius - pattern.height * (1 - pattern.y)) + "px "
          + Math.max(0, pattern.radius - pattern.width * pattern.x) + "px)";
        lights.append(dot);
        const center = x + pattern.width * pattern.x;
        const visible = center - pattern.radius < width * 0.41 || center + pattern.radius > width * 0.59;
        if (visible && !reducedMotion.matches) flicker(dot, 0.65 + Math.random() * 0.35);
      }
    }
  });
  layer.replaceChildren(lights);
}

function flicker(dot, from) {
  const target = Math.random() < 0.54 ? 0.85 + Math.random() * 0.15 : 0.14 + Math.random() * 0.48;
  const fast = !round && config.homeFlicker === "fast";
  const variation = Math.random() ** 1.4;
  const animation = dot.animate([
    { opacity: from, offset: 0 },
    { opacity: from, offset: 0.15 + Math.random() * 0.58, easing: "ease-in-out" },
    { opacity: target, offset: 1 },
  ], { duration: fast ? 350 + variation * 1100 : 750 + variation * 4500, fill: "forwards" });
  animation.onfinish = () => {
    if (dot.isConnected && !reducedMotion.matches) {
      flicker(dot, target);
      animation.cancel();
    }
  };
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The current round still works in memory. */ }
}

function symbolImage(index) {
  const [file, label] = symbols[index];
  const image = new Image();
  image.src = "assets/symbols/" + file + ".png";
  image.alt = label;
  image.draggable = false;
  return image;
}

function formatReturn(payouts) {
  return percent.format(symbols.reduce((total, symbol, index) => total + (symbol[2] / 100) ** 3 * payouts[index], 0));
}

function renderPaytable() {
  $("payouts").replaceChildren(...symbols.map((_, index) => {
    const item = document.createElement("li");
    item.append(symbolImage(index), "×" + number.format(config.payouts[index]));
    return item;
  }));
}

function tile(index, isResult = false) {
  const element = document.createElement("div");
  element.className = "symbol";
  const image = symbolImage(index);
  if (!isResult) image.alt = "";
  element.append(image);
  return element;
}

function reelWindow(center) {
  return [
    tile((center + symbols.length - 1) % symbols.length),
    tile(center, true),
    tile((center + 1) % symbols.length),
  ];
}

function render() {
  const inRound = Boolean(round);
  $("credit").textContent = number.format(round?.balance ?? 0);
  $("bet").textContent = number.format(config.bet);
  $("paid").textContent = number.format(round?.last ?? 0);
  $("creditMeter").hidden = !inRound || !config.showCredit;
  $("betMeter").hidden = inRound && !config.showBet;
  $("betLabel").textContent = inRound ? "Jedno zatočení" : "Cena zatočení";
  $("paidMeter").hidden = !inRound || !config.showPaid;
  $("meters").hidden = inRound && !config.showCredit && !config.showBet && !config.showPaid;
  $("deposit").hidden = inRound;
  $("settings").hidden = inRound;
  $("spin").hidden = !inRound;
  $("keys").hidden = !inRound;
  $("quit").hidden = !inRound;
  $("spin").disabled = spinning || Boolean(round?.finished);
  $("quit").disabled = spinning || Boolean(round?.finished);
}

function pick() {
  const bytes = new Uint8Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= 200);
  let ticket = bytes[0] % 100;
  return symbols.findIndex((symbol) => (ticket -= symbol[2]) < 0);
}

function playNotes(pitches, gap = 0.08, level = 0.13, length = 0.14) {
  if (!config.sound || !audio || audio.state !== "running" || document.hidden) return;
  const start = audio.currentTime;
  pitches.forEach((pitch, index) => {
    const time = start + gap * index;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.frequency.value = pitch;
    volume.gain.setValueAtTime(level, time);
    volume.gain.exponentialRampToValueAtTime(0.001, time + length - 0.01);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + length);
  });
}

const music = [[262, 330, 392, 330, 294, 349, 440, 349], [247, 294, 392, 294, 262, 330, 392, 330]];
let phrase = 0;
let musicTimer;

function syncSound() {
  const playing = config.sound && audio?.state === "running" && !document.hidden;
  $("toggleAudio").disabled = !window.AudioContext;
  $("toggleAudio").textContent = config.sound && audio?.state === "running" ? "Vypnout zvuk" : "Spustit zvuk";
  if (!playing) {
    clearInterval(musicTimer);
    musicTimer = undefined;
  } else if (musicTimer === undefined) {
    const playPhrase = () => {
      playNotes(music[phrase], 0.32, 0.025, 0.29);
      phrase = (phrase + 1) % music.length;
    };
    playPhrase();
    musicTimer = setInterval(playPhrase, 2560);
  }
}

function startSound() {
  if (!config.sound || !window.AudioContext || audio?.state === "running") return;
  if (!audio) {
    audio = new AudioContext();
    audio.addEventListener("statechange", syncSound);
  }
  audio.resume().then(syncSound).catch(() => {});
}

async function roll(reel, before, after, index, audible = true) {
  if (reducedMotion.matches) {
    reel.replaceChildren(...reelWindow(after));
    return;
  }
  const height = reel.clientHeight / 3;
  const strip = document.createElement("div");
  strip.style.setProperty("--reel-height", height + "px");
  const decoration = Array.from({ length: 8 + index * 4 }, (_, step) => (step + index) % symbols.length);
  strip.append(...reelWindow(before), ...decoration.map((symbol) => tile(symbol)), ...reelWindow(after));
  reel.replaceChildren(strip);
  try {
    await strip.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-" + height * (decoration.length + 3) + "px)" }],
      { duration: 740 + index * 260, easing: "cubic-bezier(.27,.03,.22,1)", fill: "forwards" },
    ).finished;
  } finally {
    if (strip.parentElement === reel) {
      reel.replaceChildren(...reelWindow(after));
      if (audible) playNotes([195 + index * 45]);
    }
  }
}

function rain(multiplier) {
  if (reducedMotion.matches) return;
  const count = Math.min(180, 32 + Math.round(5 * Math.sqrt(multiplier)));
  for (let index = 0; index < count; index++) {
    const coin = document.createElement("span");
    coin.className = "coin";
    coin.textContent = "★";
    coin.style.setProperty("--x", Math.random() * 98 + "%");
    coin.style.setProperty("--duration", 0.85 + Math.random() * 0.55 + "s");
    coin.style.setProperty("--delay", Math.random() * (0.25 + count / 180) + "s");
    coin.style.setProperty("--drift", (Math.random() - 0.5) * 140 + "px");
    coin.addEventListener("animationend", () => coin.remove(), { once: true });
    $("confetti").append(coin);
  }
}

function nextDemoWin() {
  return 3 + Math.floor(Math.random() * 4);
}

async function preview() {
  if (!round && !document.hidden && !document.querySelector("dialog[open]") && !reducedMotion.matches) {
    const version = demoVersion;
    const wins = --demoSpinsUntilWin === 0;
    const first = pick();
    const second = wins ? first : (first + 1 + Math.floor(Math.random() * (symbols.length - 1))) % symbols.length;
    const faces = [first, second, wins ? first : pick()];
    if (wins) demoSpinsUntilWin = nextDemoWin();

    playNotes([130, 170]);
    await Promise.allSettled(reels.map((reel, index) => roll(reel, demoFaces[index], faces[index], index)));
    if (version === demoVersion) {
      demoFaces = faces;
      if (wins && !document.hidden && !document.querySelector("dialog[open]")) {
        rain(config.payouts[first]);
        playNotes([523, 659, 784, 1047]);
      }
    }
  }
  const delay = 550 + Math.floor(Math.random() * 351);
  setTimeout(preview, delay);
}

async function spin() {
  if (!round || spinning || round.finished || round.balance < config.bet) return;
  resetTitle();
  spinning = true;
  const before = round.faces;
  const faces = [pick(), pick(), pick()];
  const multiplier = faces.every((face) => face === faces[0]) ? config.payouts[faces[0]] : 0;
  const payout = multiplier * config.bet;
  round = {
    ...round, faces, last: payout, balance: round.balance - config.bet + payout,
    spins: round.spins + 1, wins: round.wins + Number(payout > 0), paid: round.paid + payout,
  };
  save(roundKey, round);
  render();
  $("credit").textContent = number.format(round.balance - payout);
  $("paid").textContent = "0";
  playNotes([130, 170]);
  await Promise.allSettled(reels.map((reel, index) => roll(reel, before[index], faces[index], index)));
  if (payout) {
    void showTitleWin(payout);
    rain(multiplier);
    playNotes([523, 659, 784, 1047]);
  }
  spinning = false;
  render();
  if (round.balance < config.bet) finish();
  else $("spin").focus();
}

function finish() {
  round.finished = true;
  save(roundKey, round);
  render();
  $("initial").textContent = number.format(round.initial);
  $("cash").textContent = number.format(round.balance);
  $("net").textContent = signed.format(round.balance - round.initial);
  const rate = round.spins ? Math.round(100 * round.wins / round.spins) + " %" : "—";
  $("stats").textContent = "Výherní zatočení " + round.wins + " z " + round.spins + " (" + rate
    + "). Celkem vsazeno " + number.format(round.spins * config.bet)
    + ". Automat vyplatil " + number.format(round.paid) + ".";
  $("roundReturn").textContent = "Teoretická návratnost při tomto nastavení: " + formatReturn(config.payouts)
    + ". Výsledek jednoho kola se může výrazně lišit.";
  $("results").showModal();
}

for (const button of document.querySelectorAll("[data-close]")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}

$("results").addEventListener("cancel", (event) => event.preventDefault());
$("help").addEventListener("click", () => $("paytable").showModal());
$("toggleAudio").addEventListener("click", () => {
  config.sound = !config.sound || audio?.state !== "running";
  save(settingsKey, config);
  if (config.sound) startSound();
  else audio.suspend().catch(() => {});
  syncSound();
});
for (const eventType of ["pointerdown", "keydown"]) {
  document.addEventListener(eventType, (event) => {
    if (event.target !== $("toggleAudio")) startSound();
  });
}
document.addEventListener("visibilitychange", syncSound);

const displayOptions = ["showCredit", "showBet", "showPaid"];
const payoutFields = symbols.map((symbol) => {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = "10000";
  input.step = "1";
  input.required = true;
  label.append(symbol[1], input);
  $("payoutInputs").append(label);
  return input;
});

function updateSettingsReturn() {
  $("settingsReturn").textContent = payoutFields.every((input) => input.validity.valid)
    ? "Teoretická návratnost: " + formatReturn(payoutFields.map((input) => input.valueAsNumber))
    : "";
}

$("payoutInputs").addEventListener("input", updateSettingsReturn);
$("settings").addEventListener("click", () => {
  $("betInput").value = config.bet;
  $("tokens").value = config.tokens.join(", ");
  $("homeFlicker").value = config.homeFlicker;
  displayOptions.forEach((option) => { $(option).checked = config[option]; });
  payoutFields.forEach((input, index) => { input.value = config.payouts[index]; });
  updateSettingsReturn();
  $("settingsError").textContent = "";
  $("settingsDialog").showModal();
});
$("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const bet = $("betInput").valueAsNumber;
  const tokens = [...new Set($("tokens").value.split(",").map((part) => Number(part.trim())))].sort((a, b) => a - b);
  const unit = tokens[0];
  if (tokens.some((token) => !Number.isSafeInteger(token) || token <= 0 || token > 1000000 || token % unit) || bet % unit) {
    $("settingsError").textContent = "Zadej celé kladné hodnoty do 1 000 000. Všechny hodnoty i sázka musí být násobkem nejmenšího žetonu.";
    return;
  }
  config = {
    bet, tokens, sound: config.sound,
    homeFlicker: $("homeFlicker").value,
    payouts: payoutFields.map((input) => input.valueAsNumber),
    ...Object.fromEntries(displayOptions.map((option) => [option, $(option).checked])),
  };
  save(settingsKey, config);
  $("settingsDialog").close();
  render();
  renderBackgroundLights();
  renderPaytable();
  if (config.sound) startSound();
  else if (audio?.state === "running") audio.suspend().catch(() => {});
  syncSound();
});
$("deposit").addEventListener("click", () => {
  const unit = config.tokens[0];
  $("amount").min = config.bet;
  $("amount").max = Math.floor(1000000 / unit) * unit;
  $("amount").step = unit;
  $("amount").value = "";
  $("tokenHelp").textContent = "Sečti hodnoty odevzdaných žetonů. Kredit za jeden žeton podle typu: "
    + config.tokens.map((token) => number.format(token)).join(" · ");
  $("depositDialog").showModal();
});
$("depositForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const initial = $("amount").valueAsNumber;
  demoVersion++;
  $("confetti").replaceChildren();
  round = { initial, balance: initial, spins: 0, wins: 0, paid: 0, last: 0, faces: [0, 1, 2], finished: false };
  renderBackgroundLights();
  reels.forEach((reel, index) => reel.replaceChildren(...reelWindow(round.faces[index])));
  save(roundKey, round);
  $("depositDialog").close();
  render();
  $("spin").focus();
});
$("spin").addEventListener("click", spin);
$("quit").addEventListener("click", finish);
$("reset").addEventListener("click", () => {
  resetTitle();
  round = null;
  renderBackgroundLights();
  save(roundKey, round);
  $("results").close();
  demoFaces = [0, 1, 2];
  demoSpinsUntilWin = nextDemoWin();
  reels.forEach((reel, index) => reel.replaceChildren(...reelWindow(demoFaces[index])));
  render();
  $("deposit").focus();
});
document.addEventListener("keydown", (event) => {
  if (!round || document.querySelector("dialog[open]") || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== "Enter" && event.code !== "Space") return;
  if (event.target.closest("button:not(#spin), summary, input, a")) return;
  event.preventDefault();
  if (!event.repeat) spin();
});

renderPaytable();
new ResizeObserver(renderBackgroundLights).observe($("backgroundLights"));
reducedMotion.addEventListener("change", renderBackgroundLights);
reels.forEach((reel, index) => reel.replaceChildren(...reelWindow(round?.faces[index] ?? index)));
render();
syncSound();
if (round && (round.finished || round.balance < config.bet)) finish();
setTimeout(preview, 650);
