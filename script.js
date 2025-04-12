// Regisztráljuk a service workert PWA működéshez
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker regisztrálva!'))
    .catch(err => console.log('Service Worker regisztráció sikertelen:', err));
}

// Alap kategóriák (built-in)
const defaultCategories = [
  { value: "bevétel", label: "💰 Bevétel" },
  { value: "kiadás", label: "🛒 Kiadás" },
  { value: "megtakarítás", label: "🏦 Megtakarítás" }
];

// Egyéni kategóriák: most objektumok { name: "Név", icon: "Emoji" }
let customCategories = JSON.parse(localStorage.getItem("customCategories")) || [];

// Tranzakciók tárolása (objektumok: description, amount, category)
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

/* Egyéni kategória funkciók */

// Új egyéni kategória hozzáadása két input alapján: név és ikon
function addCategory() {
  const newCatName = document.getElementById("newCategory").value.trim();
  const newCatIcon = document.getElementById("newCategoryIcon").value.trim();
  if (!newCatName || !newCatIcon) return;
  
  // Ellenőrzés: ha már létezik a default vagy egyéni kategóriák között (kisbetűs összehasonlítás)
  const existsDefault = defaultCategories.some(cat => cat.value === newCatName.toLowerCase());
  const existsCustom = customCategories.some(cat => cat.name.toLowerCase() === newCatName.toLowerCase());
  if (existsDefault || existsCustom) return;
  
  // Hozzáadás és mentés
  customCategories.push({ name: newCatName, icon: newCatIcon });
  localStorage.setItem("customCategories", JSON.stringify(customCategories));
  updateCategoryList();
  
  // Űrlap mezők törlése
  document.getElementById("newCategory").value = "";
  document.getElementById("newCategoryIcon").value = "";
}

// Frissíti a <select> elemet a kategóriákkal (default + custom)
function updateCategoryList() {
  const categorySelect = document.getElementById("category");
  categorySelect.innerHTML = "";
  
  // Beépített kategóriák hozzáadása
  defaultCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.value;
    option.textContent = cat.label;
    categorySelect.appendChild(option);
  });
  
  // Egyéni kategóriák hozzáadása (ikon + név)
  customCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.name;
    option.textContent = `${cat.icon} ${cat.name}`;
    categorySelect.appendChild(option);
  });
}

/* Segédfüggvény: 
   Ha a kategória 'kiadás', vagy ha a custom kategóriák között szerepel, akkor expense-ként kezeljük */
function isExpense(categoryValue) {
  if (categoryValue === "kiadás") return true;
  return customCategories.some(cat => cat.name === categoryValue);
}

/* Tranzakciók kezelése */

// Új tranzakció hozzáadása
function addTransaction() {
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  if (!description || isNaN(amount)) return;
  
  transactions.push({ description, amount, category });
  localStorage.setItem("transactions", JSON.stringify(transactions));
  updateUI();
  
  // Input mezők törlése
  document.getElementById("description").value = "";
  document.getElementById("amount").value = "";
}

// Megtakarításból kivenés: negatív értékkel adjuk hozzá, és a "megtakarítás" kategóriát használjuk
function withdrawSavings() {
  const amount = parseFloat(document.getElementById("withdrawAmount").value);
  if (isNaN(amount)) return;
  
  transactions.push({ description: "💸 Megtakarítás kivonása", amount: -amount, category: "megtakarítás" });
  localStorage.setItem("transactions", JSON.stringify(transactions));
  updateUI();
}

// Frissíti a tranzakciók listáját, valamint a végösszeget
function updateUI() {
  const transactionsList = document.getElementById("transactions");
  transactionsList.innerHTML = "";
  let total = 0;
  
  transactions.forEach(t => {
    const li = document.createElement("li");
    let displayAmount = t.amount;
    if (isExpense(t.category)) {
      displayAmount = -Math.abs(t.amount);
      total -= Math.abs(t.amount);
    } else {
      total += t.amount;
    }
    
    // Megkeressük a kategória megjelenítéséhez az ikont, ha egyéni kategória
    let categoryDisplay = t.category;
    const customCat = customCategories.find(cat => cat.name === t.category);
    if (customCat) {
      categoryDisplay = `${customCat.icon} ${customCat.name}`;
    } else {
      const defCat = defaultCategories.find(cat => cat.value === t.category);
      if (defCat) categoryDisplay = defCat.label;
    }
    
    li.textContent = `${t.description}: ${displayAmount} Ft (${categoryDisplay})`;
    transactionsList.appendChild(li);
  });
  
  document.getElementById("total").textContent = total;
  updateChart();
}

/* Egyszerű kördiagram rajzolása a <canvas> elemmel */
function updateChart() {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");
  canvas.width = Math.min(400, window.innerWidth - 40);
  canvas.height = canvas.width;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Csak kiadásokat választunk ki
  const expenseTransactions = transactions.filter(t => isExpense(t.category));
  
  let totals = {};
  expenseTransactions.forEach(t => {
    if (totals[t.category]) {
      totals[t.category] += Math.abs(t.amount);
    } else {
      totals[t.category] = Math.abs(t.amount);
    }
  });
  
  let totalExpense = Object.values(totals).reduce((sum, val) => sum + val, 0);
  if (totalExpense === 0) {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText("Nincs elég adat a grafikonhoz", canvas.width / 2, canvas.height / 2);
    return;
  }
  
  let startAngle = 0;
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#66FF66", "#FF6666"];
  let colorIndex = 0;
  
  for (let cat in totals) {
    let sliceAngle = (2 * Math.PI * totals[cat]) / totalExpense;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2 - 20, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[colorIndex % colors.length];
    ctx.fill();
    
    // Felirat a szelet közepére
    let midAngle = startAngle + sliceAngle / 2;
    let labelX = canvas.width / 2 + (canvas.width / 4) * Math.cos(midAngle);
    let labelY = canvas.height / 2 + (canvas.height / 4) * Math.sin(midAngle);
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(cat, labelX, labelY);
    
    startAngle += sliceAngle;
    colorIndex++;
  }
}

/* Lapozható pénzügyi napló (előző, következő hónap; dátumkezelés egyszerűsítve) */
// Egyszerű példa: itt bővíthető dátum kezelés, ha szükséges
let currentMonthIndex = new Date().getMonth();
let currentYear = new Date().getFullYear();

function updateDateHeader() {
  const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
  document.getElementById("currentMonth").textContent = `Aktuális hónap: ${monthNames[currentMonthIndex]} ${currentYear}`;
}

function previousMonth() {
  if (currentMonthIndex === 0) {
    currentMonthIndex = 11;
    currentYear--;
  } else {
    currentMonthIndex--;
  }
  updateDateHeader();
  // Itt lehet szűrni a tranzakciókat dátum alapján (a példa egyszerűsített)
}

function nextMonth() {
  if (currentMonthIndex === 11) {
    currentMonthIndex = 0;
    currentYear++;
  } else {
    currentMonthIndex++;
  }
  updateDateHeader();
  // Itt lehet szűrni a tranzakciókat dátum alapján (a példa egyszerűsített)
}

/* Sötét mód váltása */
document.getElementById("toggleMode").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

/* Inicializáció */
updateCategoryList();
updateDateHeader();
updateUI();
