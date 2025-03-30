document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const form = document.getElementById('form');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const transactionList = document.getElementById('transaction-list');
    const balanceElement = document.getElementById('balance');
    const incomeElement = document.getElementById('income');
    const expenseElement = document.getElementById('expense');
    const filterCategory = document.getElementById('filter-category');
    const filterMonth = document.getElementById('filter-month');
    const exportBtn = document.getElementById('exportBtn');
    const budgetForm = document.getElementById('budgetForm');
    const budgetCategorySelect = document.getElementById('budgetCategory');
    const budgetAmountInput = document.getElementById('budgetAmount');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const closeNotification = document.getElementById('closeNotification');
    
    // Gráficos
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    const budgetCtx = document.getElementById('budgetChart').getContext('2d');
    let expenseChart, budgetChart;

    // Colores para los gráficos (reemplazando las variables CSS)
    const chartColors = {
        color1: '#4a6fa5',
        color2: '#2ecc71',
        color3: '#e74c3c',
        color4: '#f39c12',
        color5: '#9b59b6',
        color6: '#1abc9c'
    };

    // Datos iniciales
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let budgets = JSON.parse(localStorage.getItem('budgets')) || [];
    
    // Inicialización
    init();

    function init() {
        // Configurar fecha por defecto
        dateInput.valueAsDate = new Date();
        
        // Event listeners
        form.addEventListener('submit', addTransaction);
        filterCategory.addEventListener('change', updateUI);
        filterMonth.addEventListener('change', updateUI);
        exportBtn.addEventListener('click', exportToCSV);
        budgetForm.addEventListener('submit', addBudget);
        closeNotification.addEventListener('click', hideNotification);
        
        // Configurar mes actual como filtro por defecto
        const today = new Date();
        filterMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        // Inicializar gráficos
        initCharts();
        
        // Actualizar UI
        updateUI();
    }

    function addTransaction(e) {
        e.preventDefault();

        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categorySelect.value;
        const date = dateInput.value;

        if (description === '' || isNaN(amount)) {
            showNotification('Por favor ingresa una descripción y un monto válido', 'error');
            return;
        }

        const transaction = {
            id: generateID(),
            description,
            amount,
            category,
            date
        };

        transactions.push(transaction);
        saveData();
        
        // Verificar presupuestos
        if (amount < 0) {
            checkBudgets(category, Math.abs(amount));
        }
        
        updateUI();
        
        // Resetear formulario
        form.reset();
        dateInput.valueAsDate = new Date();
        descriptionInput.focus();
    }

    function addBudget(e) {
        e.preventDefault();
        
        const category = budgetCategorySelect.value;
        const amount = parseFloat(budgetAmountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            showNotification('Por favor ingresa un monto válido para el presupuesto', 'error');
            return;
        }
        
        // Buscar si ya existe un presupuesto para esta categoría
        const existingBudgetIndex = budgets.findIndex(b => b.category === category);
        
        if (existingBudgetIndex >= 0) {
            budgets[existingBudgetIndex].amount = amount;
        } else {
            budgets.push({
                id: generateID(),
                category,
                amount
            });
        }
        
        saveData();
        updateUI();
        budgetForm.reset();
        showNotification(`Presupuesto para ${formatCategory(category)} actualizado`, 'success');
    }

    function generateID() {
        return Math.floor(Math.random() * 1000000000);
    }

    function saveData() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('budgets', JSON.stringify(budgets));
    }

    function updateUI() {
        updateTransactions();
        updateTotals();
        updateCharts();
    }

    function updateTransactions() {
        const categoryFilter = filterCategory.value;
        const monthFilter = filterMonth.value;
        
        let filteredTransactions = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            
            const categoryMatch = categoryFilter === 'todas' || transaction.category === categoryFilter;
            const monthMatch = monthFilter === '' || transactionMonth === monthFilter;
            
            return categoryMatch && monthMatch;
        });

        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactionList.innerHTML = '';

        filteredTransactions.forEach(transaction => {
            addTransactionToDOM(transaction);
        });
    }

    function addTransactionToDOM(transaction) {
        const sign = transaction.amount < 0 ? '-' : '+';
        const amountWithoutSign = Math.abs(transaction.amount);
        const transactionClass = transaction.amount < 0 ? 'expense' : 'income';

        const li = document.createElement('li');
        li.className = `transaction-item ${transactionClass}`;
        li.innerHTML = `
            <div class="transaction-details">
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-category">${formatCategory(transaction.category)}</div>
                <div class="transaction-date">${formatDate(transaction.date)}</div>
            </div>
            <div class="transaction-amount">
                ${sign}$${amountWithoutSign.toFixed(2)}
                <button class="delete-btn" onclick="removeTransaction(${transaction.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        transactionList.appendChild(li);
    }

    function updateTotals() {
        const amounts = transactions.map(transaction => transaction.amount);
        
        const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);
        
        const income = amounts
            .filter(item => item > 0)
            .reduce((acc, item) => acc + item, 0)
            .toFixed(2);
        
        const expense = amounts
            .filter(item => item < 0)
            .reduce((acc, item) => acc + item, 0)
            .toFixed(2);
        
        balanceElement.textContent = `$${total}`;
        incomeElement.textContent = `$${income}`;
        expenseElement.textContent = `$${Math.abs(expense)}`;
    }

    function initCharts() {
        // Gráfico de distribución de gastos
        expenseChart = new Chart(expenseCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        chartColors.color1,
                        chartColors.color2,
                        chartColors.color3,
                        chartColors.color4,
                        chartColors.color5,
                        chartColors.color6
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Gráfico de presupuesto vs gastos
        budgetChart = new Chart(budgetCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Presupuesto',
                        data: [],
                        backgroundColor: chartColors.color1,
                        borderColor: chartColors.color1,
                        borderWidth: 1
                    },
                    {
                        label: 'Gastos',
                        data: [],
                        backgroundColor: chartColors.color3,
                        borderColor: chartColors.color3,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateCharts() {
        // Actualizar gráfico de distribución de gastos
        const expenseData = getExpenseDataByCategory();
        expenseChart.data.labels = expenseData.labels;
        expenseChart.data.datasets[0].data = expenseData.data;
        expenseChart.update();

        // Actualizar gráfico de presupuesto vs gastos
        const budgetData = getBudgetVsExpenseData();
        budgetChart.data.labels = budgetData.labels;
        budgetChart.data.datasets[0].data = budgetData.budgetData;
        budgetChart.data.datasets[1].data = budgetData.expenseData;
        budgetChart.update();
    }

    function getExpenseDataByCategory() {
        const categories = ['comida', 'transporte', 'vivienda', 'entretenimiento', 'salud', 'otros'];
        const result = {
            labels: [],
            data: []
        };

        categories.forEach(category => {
            const total = transactions
                .filter(t => t.category === category && t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            if (total > 0) {
                result.labels.push(formatCategory(category));
                result.data.push(total);
            }
        });

        return result;
    }

    function getBudgetVsExpenseData() {
        const result = {
            labels: [],
            budgetData: [],
            expenseData: []
        };

        budgets.forEach(budget => {
            const expenses = transactions
                .filter(t => t.category === budget.category && t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            result.labels.push(formatCategory(budget.category));
            result.budgetData.push(budget.amount);
            result.expenseData.push(expenses);
        });

        return result;
    }

    function checkBudgets(category, amount) {
        const budget = budgets.find(b => b.category === category);
        if (!budget) return;

        const totalExpenses = transactions
            .filter(t => t.category === category && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const remaining = budget.amount - totalExpenses;

        if (remaining < 0) {
            showNotification(`¡Has excedido tu presupuesto de ${formatCategory(category)} por $${Math.abs(remaining).toFixed(2)}!`, 'warning');
        } else if (amount > remaining * 0.8) {
            showNotification(`¡Cuidado! Estás usando más del 80% de tu presupuesto de ${formatCategory(category)}`, 'warning');
        }
    }

    function exportToCSV() {
        let csv = 'ID,Descripción,Monto,Categoría,Fecha\n';
        
        transactions.forEach(transaction => {
            csv += `"${transaction.id}","${transaction.description}","${transaction.amount}","${transaction.category}","${transaction.date}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('Datos exportados a CSV correctamente', 'success');
    }

    function formatCategory(category) {
        const categories = {
            'comida': 'Comida',
            'transporte': 'Transporte',
            'vivienda': 'Vivienda',
            'entretenimiento': 'Entretenimiento',
            'salud': 'Salud',
            'ingreso': 'Ingreso',
            'otros': 'Otros'
        };
        return categories[category] || category;
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

    function showNotification(message, type) {
        notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        setTimeout(() => {
            notification.classList.remove('hidden');
        }, 100);
        
        // Ocultar después de 5 segundos
        setTimeout(hideNotification, 5000);
    }

    function hideNotification() {
        notification.classList.add('hidden');
    }

    window.removeTransaction = function(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
            transactions = transactions.filter(transaction => transaction.id !== id);
            saveData();
            updateUI();
            showNotification('Transacción eliminada correctamente', 'success');
        }
    };
});
