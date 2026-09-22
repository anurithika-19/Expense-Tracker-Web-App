document.addEventListener("DOMContentLoaded", () => {
  const monthlyBudget = 2000;
  let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

  // =============================
  // Tracker Page Logic
  // =============================
  const expenseForm = document.getElementById("expense-form");
  const expenseList = document.getElementById("expense-list");
  const totalAmountEl = document.getElementById("total-amount");
  const exportBtn = document.getElementById("export-btn");
  const filterCategory = document.getElementById("filter-category");
  const timeFilter = document.getElementById("time-filter");
  const searchBox = document.getElementById("search-box");

  if (expenseForm) {
    function renderExpenses() {
      expenseList.innerHTML = "";
      let total = 0;

      const searchTerm = searchBox ? searchBox.value.toLowerCase().trim() : "";
      const selectedCat = filterCategory ? filterCategory.value : "All";
      const selectedTime = timeFilter ? timeFilter.value : "all";

      const now = new Date();

      const filtered = expenses.filter((item) => {
        // Search Filter
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm) ||
          item.category.toLowerCase().includes(searchTerm);

        // Category Filter
        const matchesCategory =
          selectedCat === "All" || item.category === selectedCat;

        // Time Filter
        let matchesTime = true;
        if (item.date) {
          const itemDate = new Date(item.date);
          if (selectedTime === "daily") {
            matchesTime = itemDate.toDateString() === now.toDateString();
          } else if (selectedTime === "weekly") {
            const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
            matchesTime = diffDays >= 0 && diffDays <= 7;
          } else if (selectedTime === "monthly") {
            matchesTime =
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear();
          }
        }

        return matchesSearch && matchesCategory && matchesTime;
      });

      filtered.forEach((expense) => {
        const originalIndex = expenses.indexOf(expense);
        total += parseFloat(expense.amount);

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${expense.name}</td>
          <td>$${parseFloat(expense.amount).toFixed(2)}</td>
          <td>${expense.category}</td>
          <td>${expense.date}</td>
          <td>
            <button class="edit-btn" onclick="editExpense(${originalIndex})">Edit</button>
            <button class="delete-btn" onclick="deleteExpense(${originalIndex})">Delete</button>
          </td>
        `;
        expenseList.appendChild(row);
      });

      if (totalAmountEl) totalAmountEl.textContent = total.toFixed(2);
    }

    // Submit New Expense
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
      renderExpenses();
      expenseForm.reset();
    });

    // Delete & Edit Global Actions
    window.deleteExpense = (index) => {
      if (confirm("Are you sure you want to delete this expense?")) {
        expenses.splice(index, 1);
        localStorage.setItem("expenses", JSON.stringify(expenses));
        renderExpenses();
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
      renderExpenses();
    };

    // Filter Listeners
    if (filterCategory) filterCategory.addEventListener("change", renderExpenses);
    if (timeFilter) timeFilter.addEventListener("change", renderExpenses);
    if (searchBox) searchBox.addEventListener("input", renderExpenses);

    // CSV Export
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        if (!expenses.length) return alert("No expenses to export!");
        const csvHeader = ["Name,Amount,Category,Date"];
        const csvRows = expenses.map(
          (e) => `"${e.name}",${e.amount},"${e.category}",${e.date}`
        );
        const csvContent = [...csvHeader, ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "expenses.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    renderExpenses();
  }

  // =============================
  // Chart & Insights Page Logic
  // =============================
  const avgExpenseEl = document.getElementById("avg-expense");
  const highestCategoryEl = document.getElementById("highest-category");
  const savingsEl = document.getElementById("savings");
  const pieCanvas = document.getElementById("expenseChart");
  const heatmapCanvas = document.getElementById("heatmapChart");

  if (pieCanvas && heatmapCanvas) {
    const totalSpent = expenses.reduce((a, e) => a + parseFloat(e.amount), 0);

    if (avgExpenseEl) {
      avgExpenseEl.textContent = expenses.length
        ? (totalSpent / expenses.length).toFixed(2)
        : "0.00";
    }

    if (savingsEl) {
      savingsEl.textContent = (monthlyBudget - totalSpent).toFixed(2);
    }

    const catTotals = {};
    expenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount);
    });

    if (highestCategoryEl) {
      const categories = Object.keys(catTotals);
      highestCategoryEl.textContent = categories.length
        ? categories.reduce((a, b) => (catTotals[a] > catTotals[b] ? a : b))
        : "None";
    }

    // Pie Chart
    new Chart(pieCanvas, {
      type: "pie",
      data: {
        labels: Object.keys(catTotals),
        datasets: [
          {
            data: Object.values(catTotals),
            backgroundColor: ["#42a5f5", "#66bb6a", "#ffa726", "#ab47bc", "#ef5350"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });

    // Daily Heatmap Bar Chart
    const dailyTotals = {};
    expenses.forEach((e) => {
      dailyTotals[e.date] = (dailyTotals[e.date] || 0) + parseFloat(e.amount);
    });

    new Chart(heatmapCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(dailyTotals),
        datasets: [
          {
            label: "Daily Spend ($)",
            data: Object.values(dailyTotals),
            backgroundColor: Object.values(dailyTotals).map((v) =>
              v > 100 ? "#dc3545" : "#28a745"
            ),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
});