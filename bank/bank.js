// Nastavení akce. Počáteční obnos platí pro nový prohlížeč bez uložené hry.
const config = {
  startingBalance: 5000,
  requirePassword: true,
  password: "2711",
  // "progressive" = rostoucí až po maximum, "fixed" = stejný, "none" = bez úroku.
  interestMode: "progressive",
  firstInterestPercent: 20,
  interestStepPercent: 5,
  maxInterestPercent: 40,
  fixedInterestPercent: 20,
};

const storageKey = "mv-casino-bank-v1";
const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 });
// Částky držíme v setinách žetonu, aby se při sčítání úroků nehromadily chyby.
const format = (amount) => number.format(amount / 100);
const passwordDialog = $("password-dialog");
const loanDialog = $("loan-dialog");
const transaction = $("transaction");
let state = {
  balance: config.startingBalance * 100,
  principal: 0,
  interest: 0,
  loanCount: 0,
};
let pendingAuthorization;
let activeTransaction;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Object.keys(state).every((key) => Number.isSafeInteger(saved[key]) && saved[key] >= 0)
      && Number.isSafeInteger(saved.principal + saved.interest)) {
      state = saved;
    }
  } catch {
    // Hra funguje v paměti i bez přístupu k úložišti.
  }
}

function saveState(changes) {
  state = { ...state, ...changes };
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    $("storage-warning").hidden = false;
  }
  $("balance").textContent = format(state.balance);
}

function showError(id, message = "") {
  $(id).textContent = message;
  $(id).hidden = !message;
}

function readAmount(id, errorId) {
  const value = $(id).value;
  const amount = Number(value) * 100;
  if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(amount) || amount <= 0) {
    showError(errorId, "Zadej kladný celý počet žetonů.");
    return null;
  }
  return amount;
}

function authorize(title, callback) {
  if (!config.requirePassword) {
    callback();
    return;
  }
  pendingAuthorization = callback;
  $("password-title").textContent = title;
  $("password-form").reset();
  showError("password-error");
  passwordDialog.showModal();
}

function openTransaction(button, direction) {
  authorize(button.textContent, () => {
    activeTransaction = { button, direction };
    transaction.reset();
    showError("transaction-error");
    $("confirm-transaction").textContent = button.textContent;
    $("game-actions").hidden = true;
    transaction.hidden = false;
    $("amount").focus();
  });
}

function closeTransaction() {
  transaction.hidden = true;
  $("game-actions").hidden = false;
  activeTransaction.button.focus();
  activeTransaction = undefined;
}

function nextInterestPercent() {
  if (config.interestMode === "none") return 0;
  if (config.interestMode === "fixed") return config.fixedInterestPercent;
  return Math.min(config.maxInterestPercent, config.firstInterestPercent + state.loanCount * config.interestStepPercent);
}

$("password-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if ($("password").value !== config.password) {
    showError("password-error", "Nesprávné heslo.");
    $("password").select();
    return;
  }
  const callback = pendingAuthorization;
  pendingAuthorization = undefined;
  passwordDialog.close();
  callback();
});

for (const button of document.querySelectorAll("[data-close]")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}

for (const [id, direction] of [["bet-credit", -1], ["collect", 1]]) {
  const button = $(id);
  button.addEventListener("click", () => openTransaction(button, direction));
}

$("cancel-transaction").addEventListener("click", closeTransaction);
transaction.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!activeTransaction) return;
  const amount = readAmount("amount", "transaction-error");
  if (amount === null) return;
  const balance = state.balance + activeTransaction.direction * amount;
  if (balance < 0 || !Number.isSafeInteger(balance)) {
    showError("transaction-error", balance < 0 ? "Na tuhle sázku nemáš dost žetonů." : "Zadej menší částku.");
    return;
  }
  saveState({ balance });
  closeTransaction();
});

$("borrow").addEventListener("click", () => {
  authorize("Půjčit si", () => {
    $("loan-form").reset();
    showError("loan-error");
    $("loan-rate").textContent = "Úrok této půjčky je " + number.format(nextInterestPercent()) + " %.";
    loanDialog.showModal();
  });
});

$("loan-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loanDialog.open) return;
  const amount = readAmount("loan-amount", "loan-error");
  if (amount === null) return;
  const balance = state.balance + amount;
  const principal = state.principal + amount;
  const interest = state.interest + Math.round((amount / 100) * nextInterestPercent());
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(principal + interest)) {
    showError("loan-error", "Zadej menší částku.");
    return;
  }
  saveState({ balance, principal, interest, loanCount: state.loanCount + 1 });
  loanDialog.close();
  $("borrow").focus();
});

$("settlement").addEventListener("click", () => {
  $("result-balance").textContent = format(state.balance);
  $("result-principal").textContent = format(state.principal);
  $("result-interest").textContent = format(state.interest);
  $("result-total").textContent = format(state.balance - state.principal - state.interest);
  $("result-dialog").showModal();
});

loadState();
$("balance").textContent = format(state.balance);
