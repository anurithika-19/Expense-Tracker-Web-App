document.addEventListener("DOMContentLoaded", () => {
  const monthlyBudget = 2000;
  let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

  let pieChartInstance = null;
  let barChartInstance = null;

  const expenseForm = document.getElementById("expense-form");
  const expenseList = document.getElementById("expense-list");
  const totalAmountEl = document.getElementById("total-amount");
  const avgExpenseEl = document.getElementById("avg-expense");
  const highestCategoryEl = document.getElementById("highest-category");
  const savingsEl = document.getElementById("savings");

  const exportBtn = document.getElementById("export-btn");
  const filterCategory = document.getElementById("filter-category");
  const timeFilter = document.getElementById("time-filter");
  const searchBox = document.getElementById("search-box");

  function renderDashboard() {
    if (expenseList) expenseList.innerHTML = "";
    let total = 0;

    const searchTerm = searchBox ? searchBox.value.toLowerCase().trim() : "";
    const selectedCat = filterCategory ? filterCategory.value : "All";
    const selectedTime = timeFilter ? timeFilter.value : "all";
    const now = new Date();

    const filtered = expenses.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm) || item.category.toLowerCase().includes(searchTerm);
      const matchesCategory = selectedCat === "All" || item.category === selectedCat;

      let matchesTime = true;
      if (item.date) {
        const itemDate = new Date(item.date);
        if (selectedTime === "daily") {
          matchesTime = itemDate.toDateString() === now.toDateString();
        } else if (selectedTime === "weekly") {
          const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
          matchesTime = diffDays >= 0 && diffDays <= 7;
        } else if (selectedTime === "monthly") {
          matchesTime = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
      }
      return matchesSearch && matchesCategory && matchesTime;
    });

    filtered.forEach((expense) => {
      const originalIndex = expenses.indexOf(expense);
      total += parseFloat(expense.amount);

      if (expenseList) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td style="font-weight: 600;">${expense.name}</td>
          <td style="color: #059669; font-weight: 700;">₹${parseFloat(expense.amount).toFixed(2)}</td>
          <td><span class="badge badge-${expense.category.toLowerCase()}">${expense.category}</span></td>
          <td style="color: #64748b;">${expense.date}</td>
          <td style="text-align: center;">
            <button class="btn-icon edit" onclick="editExpense(${originalIndex})">✏️</button>
            <button class="btn-icon delete" onclick="deleteExpense(${originalIndex})">🗑️</button>
          </td>
        `;
        expenseList.appendChild(row);
      }
    });

    // Update Metrics with ₹
    if (totalAmountEl) totalAmountEl.textContent = total.toFixed(2);
    if (avgExpenseEl) avgExpenseEl.textContent = expenses.length ? (total / expenses.length).toFixed(2) : "0.00";
    if (savingsEl) savingsEl.textContent = (monthlyBudget - total).toFixed(2);

    const catTotals = {};
    expenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount);
    });

    if (highestCategoryEl) {
      const categories = Object.keys(catTotals);
      highestCategoryEl.textContent = categories.length ? categories.reduce((a, b) => (catTotals[a] > catTotals[b] ? a : b)) : "None";
    }

    renderCharts(catTotals);
  }

  // Handle Form Submit
  if (expenseForm) {
    expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const newExpense = {
        name: document.getElementById("expense-name").value.trim(),
        amount: parseFloat(document.getElementById("expense-amount").value),
        category: document.getElementById("expense-category").value,
        date: document.getElementById("expense-date").value,
      };

      expenses.push(newExpense);
      localStorage.setItem("expenses", JSON.stringify(expenses));
      renderDashboard();
      expenseForm.reset();
    });
  }

  // Edit / Delete Actions
  window.deleteExpense = (index) => {
    if (confirm("Delete this expense item?")) {
      expenses.splice(index, 1);
      localStorage.setItem("expenses", JSON.stringify(expenses));
      renderDashboard();
    }
  };

  window.editExpense = (index) => {
    const expense = expenses[index];
    document.getElementById("expense-name").value = expense.name;
    document.getElementById("expense-amount").value = expense.amount;
    document.getElementById("expense-category").value = expense.category;
    document.getElementById("expense-date").value = expense.date;

    expenses.splice(index, 1);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    renderDashboard();
  };

  // Event Listeners
  if (filterCategory) filterCategory.addEventListener("change", renderDashboard);
  if (timeFilter) timeFilter.addEventListener("change", renderDashboard);
  if (searchBox) searchBox.addEventListener("input", renderDashboard);

  // CSV Export
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!expenses.length) return alert("No entries to export!");
      const csvHeader = ["Name,Amount (INR),Category,Date"];
      const csvRows = expenses.map((e) => `"${e.name}",${e.amount},"${e.category}",${e.date}`);
      const csvContent = [...csvHeader, ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Render Light Theme Charts
  function renderCharts(catTotals) {
    const pieCanvas = document.getElementById("expenseChart");
    const heatmapCanvas = document.getElementById("heatmapChart");

    if (!pieCanvas || !heatmapCanvas) return;

    if (pieChartInstance) pieChartInstance.destroy();
    if (barChartInstance) barChartInstance.destroy();

    // Pie Chart
    pieChartInstance = new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels: Object.keys(catTotals),
        datasets: [{
          data: Object.values(catTotals),
          backgroundColor: ["#db2777", "#0891b2", "#d97706", "#7c3aed", "#059669"],
          borderWidth: 0
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#334155", font: { weight: '600' } }, position: "bottom" }
        }
      }
    });

    // Bar Chart
    const dailyTotals = {};
    expenses.forEach((e) => {
      dailyTotals[e.date] = (dailyTotals[e.date] || 0) + parseFloat(e.amount);
    });

    barChartInstance = new Chart(heatmapCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(dailyTotals),
        datasets: [{
          label: "Daily Total (₹)",
          data: Object.values(dailyTotals),
          backgroundColor: "#4f46e5",
          borderRadius: 8
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#475569" }, grid: { display: false } },
          y: { ticks: { color: "#475569" }, grid: { color: "#e2e8f0" } }
        }
      }
    });
  }

  renderDashboard();
});
