const JAVA_API = "http://localhost:8081";
const PYTHON_API = "http://localhost:5000";

let products = [];
let orders = [];
let forecasts = [];
let charts = {};

const demoRatings = {
    1: 4.5,
    2: 4.2,
    3: 4.7,
    4: 4.4,
    5: 4.1,
    6: 4.6,
    7: 4.3,
    8: 4.0
};

const customerEmails = {
    "Sirisha": "sirisha@gmail.com",
    "Sriya": "sriya@gmail.com",
    "Deepika": "deepika@gmail.com",
    "Gayatri": "gayatri@gmail.com"
};

async function fetchJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function productId(product) {
    return Number(
        product.id ??
        product.productId ??
        product.product_id ??
        0
    );
}

function productName(product) {
    return (
        product.name ??
        product.productName ??
        product.product_name ??
        "Unknown Product"
    );
}

function productCategory(product) {
    return product.category ?? "Other";
}

function productPrice(product) {
    return Number(
        product.price ??
        product.unitPrice ??
        product.unit_price ??
        0
    );
}

function productStock(product) {
    return Number(
        product.stockQuantity ??
        product.stock_quantity ??
        product.stock ??
        0
    );
}

function productReorder(product) {
    return Number(
        product.reorderLevel ??
        product.reorder_level ??
        0
    );
}

function productRating(product) {
    const id = productId(product);

    return Number(
        product.rating ??
        product.averageRating ??
        product.average_rating ??
        demoRatings[id] ??
        0
    );
}

function orderId(order) {
    return Number(order.id ?? order.orderId ?? order.order_id ?? 0);
}

function orderCustomer(order) {
    return (
        order.customerName ??
        order.customer_name ??
        order.customer ??
        "Unknown Customer"
    );
}

function orderProduct(order) {
    return (
        order.productName ??
        order.product_name ??
        order.product ??
        "Unknown Product"
    );
}

function orderQuantity(order) {
    return Number(
        order.quantity ??
        order.qty ??
        0
    );
}

function orderDate(order) {
    return (
        order.orderDate ??
        order.order_date ??
        order.date ??
        "-"
    );
}

function showSection(sectionName) {
    const aliases = {
        dashboard: ["dashboard", "dashboardPage"],
        products: ["products", "productsPage"],
        orders: ["orders", "orderHistory", "ordersPage"],
        customers: ["customers", "customersPage"],
        analytics: ["analytics", "analyticsPage"],
        forecast: ["forecast", "demandForecast", "forecastPage"]
    };

    let foundSection = null;

    for (const id of aliases[sectionName] || [sectionName]) {
        const element = document.getElementById(id);

        if (element) {
            foundSection = element;
            break;
        }
    }

    const sections = document.querySelectorAll(
        ".page-section, .content-section, section[data-page]"
    );

    sections.forEach(section => {
        section.classList.remove("active");
        section.classList.add("hidden");
        section.style.display = "none";
    });

    if (foundSection) {
        foundSection.classList.add("active");
        foundSection.classList.remove("hidden");
        foundSection.style.display = "block";
    }

    document.querySelectorAll(
        ".nav-item, .sidebar-link, [data-section]"
    ).forEach(item => {
        item.classList.remove("active");

        const target =
            item.dataset.section ||
            item.dataset.page ||
            item.getAttribute("href")?.replace("#", "");

        if (
            target === sectionName ||
            target === aliases[sectionName]?.[0]
        ) {
            item.classList.add("active");
        }
    });

    currentSection = sectionName;
}

let currentSection = "dashboard";

function setupNavigation() {
    const navItems = document.querySelectorAll(
        ".nav-item, .sidebar-link, [data-section], [data-page]"
    );

    navItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();

            let section =
                item.dataset.section ||
                item.dataset.page ||
                item.getAttribute("href")?.replace("#", "");

            const text = item.textContent.trim().toLowerCase();

            if (!section || section === "#") {
                if (text.includes("dashboard")) section = "dashboard";
                else if (text.includes("product")) section = "products";
                else if (text.includes("order")) section = "orders";
                else if (text.includes("customer")) section = "customers";
                else if (text.includes("analytic")) section = "analytics";
                else if (
                    text.includes("forecast") ||
                    text.includes("demand")
                ) section = "forecast";
            }

            const normalized = String(section)
                .toLowerCase()
                .replace("page", "");

            if (normalized.includes("dashboard")) {
                showSection("dashboard");
            } else if (normalized.includes("product")) {
                showSection("products");
            } else if (
                normalized.includes("order") ||
                normalized.includes("history")
            ) {
                showSection("orders");
            } else if (normalized.includes("customer")) {
                showSection("customers");
            } else if (normalized.includes("analytic")) {
                showSection("analytics");
            } else if (
                normalized.includes("forecast") ||
                normalized.includes("demand")
            ) {
                showSection("forecast");
            }
        });
    });

    showSection("dashboard");
}

async function loadProducts() {
    try {
        const data = await fetchJSON(`${JAVA_API}/api/products`);

        products = Array.isArray(data)
            ? data
            : data.products || data.data || [];

        renderProducts();
        updateProductStatistics();
        populateCategoryFilter();
    } catch (error) {
        console.error("Product loading error:", error);
        products = [];
    }
}

async function loadOrders() {
    try {
        const data = await fetchJSON(`${JAVA_API}/api/orders`);

        orders = Array.isArray(data)
            ? data
            : data.orders || data.data || [];

        renderOrders();
        renderRecentOrders();
        updateDashboardStatistics();
        renderCustomers();
        renderAnalytics();
    } catch (error) {
        console.error("Order loading error:", error);
        orders = [];
    }
}

async function loadForecast() {
    try {
        const data = await fetchJSON(`${PYTHON_API}/forecast/run`);

        forecasts = data.forecasts || [];

        renderForecast();
        renderLowStockAlerts();
    } catch (error) {
        console.error("Forecast error:", error);
        forecasts = [];
        renderForecast();
    }
}

function updateDashboardStatistics() {
    const totalProducts = products.length;
    const totalOrders = new Set(
        orders.map(order => orderId(order))
    ).size;

    const customers = new Set(
        orders.map(order => orderCustomer(order))
    );

    let totalSales = 0;

    orders.forEach(order => {
        const product = products.find(
            p => productName(p) === orderProduct(order)
        );

        if (product) {
            totalSales +=
                orderQuantity(order) *
                productPrice(product);
        }
    });

    setText("totalProducts", totalProducts);
    setText("totalOrders", totalOrders);
    setText("totalCustomers", customers.size);
    setText("totalSales", `₹${totalSales.toLocaleString("en-IN")}`);
}

function updateProductStatistics() {
    setText("totalProducts", products.length);
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function populateCategoryFilter() {
    const select = document.getElementById("categoryFilter");

    if (!select) return;

    const categories = [
        ...new Set(products.map(productCategory))
    ].sort();

    select.innerHTML =
        `<option value="">All Categories</option>` +
        categories
            .map(category =>
                `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
            )
            .join("");
}

function renderProducts() {
    const container =
        document.getElementById("productGrid") ||
        document.getElementById("productsGrid") ||
        document.querySelector(".product-grid");

    if (!container) return;

    const search =
        document.getElementById("productSearch")?.value
            ?.toLowerCase()
            .trim() || "";

    const category =
        document.getElementById("categoryFilter")?.value || "";

    const filtered = products.filter(product => {
        const name = productName(product).toLowerCase();
        const cat = productCategory(product);

        return (
            (!search || name.includes(search)) &&
            (!category || cat === category)
        );
    });

    if (!filtered.length) {
        container.innerHTML =
            `<div class="empty-state">No products found.</div>`;
        return;
    }

    container.innerHTML = filtered.map(product => {
        const id = productId(product);
        const name = productName(product);
        const category = productCategory(product);
        const price = productPrice(product);
        const stock = productStock(product);
        const reorder = productReorder(product);
        const rating = productRating(product);

        const lowStock = stock <= reorder;

        return `
            <div class="product-card">
                <div class="product-card-top">
                    <span class="product-category">
                        ${escapeHtml(category)}
                    </span>

                    <span class="rating">
                        ★ ${rating.toFixed(1)}
                    </span>
                </div>

                <h3>${escapeHtml(name)}</h3>

                <p class="product-price">
                    ₹${price.toLocaleString("en-IN")}
                </p>

                <p>
                    <strong>Stock:</strong> ${stock}
                </p>

                <p>
                    <strong>Reorder level:</strong> ${reorder}
                </p>

                ${
                    lowStock
                        ? `<div class="low-stock">⚠ Low Stock</div>`
                        : `<div class="in-stock">✓ In Stock</div>`
                }

                <button
                    class="product-details-btn"
                    data-product-id="${id}">
                    View Details
                </button>
            </div>
        `;
    }).join("");

    container
        .querySelectorAll(".product-details-btn")
        .forEach(button => {
            button.addEventListener("click", () => {
                showProductDetails(
                    Number(button.dataset.productId)
                );
            });
        });
}

function renderOrders() {
    const tbody =
        document.getElementById("ordersTableBody") ||
        document.querySelector("#ordersTable tbody");

    if (!tbody) return;

    const search =
        document.getElementById("orderSearch")?.value
            ?.toLowerCase()
            .trim() || "";

    const filtered = orders.filter(order =>
        orderCustomer(order).toLowerCase().includes(search) ||
        orderProduct(order).toLowerCase().includes(search)
    );

    tbody.innerHTML = filtered.map(order => `
        <tr>
            <td>#${orderId(order)}</td>
            <td>${escapeHtml(orderCustomer(order))}</td>
            <td>${escapeHtml(orderProduct(order))}</td>
            <td>${orderQuantity(order)}</td>
            <td>${escapeHtml(orderDate(order))}</td>
        </tr>
    `).join("");

    if (!filtered.length) {
        tbody.innerHTML =
            `<tr><td colspan="5">No orders found.</td></tr>`;
    }
}

function renderRecentOrders() {
    const container =
        document.getElementById("recentOrders");

    if (!container) return;

    const recent = orders.slice(0, 5);

    container.innerHTML = recent.map(order => `
        <div class="recent-order">
            <div>
                <strong>#${orderId(order)}</strong>
                <span>${escapeHtml(orderCustomer(order))}</span>
            </div>

            <div>
                ${escapeHtml(orderProduct(order))}
                × ${orderQuantity(order)}
            </div>

            <small>${escapeHtml(orderDate(order))}</small>
        </div>
    `).join("");

    if (!recent.length) {
        container.innerHTML = "<p>No orders available.</p>";
    }
}

function buildSalesData() {
    const sales = {};

    products.forEach(product => {
        sales[productName(product)] = 0;
    });

    orders.forEach(order => {
        const name = orderProduct(order);

        if (!(name in sales)) {
            sales[name] = 0;
        }

        sales[name] += orderQuantity(order);
    });

    return Object.entries(sales)
        .map(([name, units]) => {
            const product = products.find(
                p => productName(p) === name
            );

            return {
                name,
                units,
                rating: product ? productRating(product) : 0
            };
        })
        .sort((a, b) => b.units - a.units);
}

function renderAnalytics() {
    const salesData = buildSalesData();

    renderMostSoldChart(salesData);
    renderCategoryChart();
    renderCustomerChart();
    renderRanking(salesData);
}

function destroyChart(name) {
    if (charts[name]) {
        charts[name].destroy();
        charts[name] = null;
    }
}

function renderMostSoldChart(salesData) {
    const canvas =
        document.getElementById("salesChart") ||
        document.getElementById("mostSoldChart");

    if (!canvas || typeof Chart === "undefined") return;

    destroyChart("sales");

    const labels = salesData.map(item => item.name);
    const units = salesData.map(item => item.units);
    const ratings = salesData.map(item => item.rating);

    charts.sales = new Chart(canvas, {
        data: {
            labels,
            datasets: [
                {
                    type: "bar",
                    label: "Units Sold",
                    data: units,
                    yAxisID: "y"
                },
                {
                    type: "line",
                    label: "Rating",
                    data: ratings,
                    yAxisID: "rating",
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Units Sold"
                    }
                },
                rating: {
                    position: "right",
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: "Rating"
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: context => {
                            const index = context[0].dataIndex;
                            return `Rating: ${ratings[index].toFixed(1)} / 5`;
                        }
                    }
                }
            }
        }
    });
}

function renderCategoryChart() {
    const canvas =
        document.getElementById("categoryChart");

    if (!canvas || typeof Chart === "undefined") return;

    destroyChart("category");

    const categorySales = {};

    orders.forEach(order => {
        const product = products.find(
            p => productName(p) === orderProduct(order)
        );

        if (!product) return;

        const category = productCategory(product);

        categorySales[category] =
            (categorySales[category] || 0) +
            orderQuantity(order) * productPrice(product);
    });

    charts.category = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: Object.keys(categorySales),
            datasets: [{
                label: "Sales",
                data: Object.values(categorySales)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function renderCustomerChart() {
    const canvas =
        document.getElementById("customerChart");

    if (!canvas || typeof Chart === "undefined") return;

    destroyChart("customer");

    const customerOrders = {};

    orders.forEach(order => {
        const customer = orderCustomer(order);

        customerOrders[customer] =
            (customerOrders[customer] || 0) +
            orderQuantity(order);
    });

    charts.customer = new Chart(canvas, {
        type: "bar",
        data: {
            labels: Object.keys(customerOrders),
            datasets: [{
                label: "Products Purchased",
                data: Object.values(customerOrders)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderRanking(salesData) {
    const container =
        document.getElementById("rankingList");

    if (!container) return;

    if (!salesData.length) {
        container.innerHTML = "<p>No sales data.</p>";
        return;
    }

    const highest = salesData[0];
    const lowest = salesData[salesData.length - 1];

    container.innerHTML = `
        <div class="ranking-highlight">
            <h3>🏆 Most Sold Product</h3>
            <p><strong>${escapeHtml(highest.name)}</strong></p>
            <p>${highest.units} units sold</p>
            <p>★ ${highest.rating.toFixed(1)} / 5</p>
        </div>

        <div class="ranking-highlight">
            <h3>📉 Least Sold Product</h3>
            <p><strong>${escapeHtml(lowest.name)}</strong></p>
            <p>${lowest.units} units sold</p>
            <p>★ ${lowest.rating.toFixed(1)} / 5</p>
        </div>

        <hr>

        ${salesData.map((item, index) => `
            <div class="ranking-row">
                <span>#${index + 1}</span>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${item.units} sold</span>
                <span>★ ${item.rating.toFixed(1)}</span>
            </div>
        `).join("")}
    `;
}

function renderCustomers() {
    const container =
        document.getElementById("customerList") ||
        document.getElementById("customersList");

    if (!container) return;

    const customerMap = {};

    orders.forEach(order => {
        const name = orderCustomer(order);

        if (!customerMap[name]) {
            customerMap[name] = {
                orders: new Set(),
                quantity: 0
            };
        }

        customerMap[name].orders.add(orderId(order));
        customerMap[name].quantity += orderQuantity(order);
    });

    const customers = Object.entries(customerMap);

    setText("customerCount", customers.length);
    setText("activeCustomers", customers.length);

    container.innerHTML = customers.map(([name, info]) => `
        <div class="customer-card">
            <div class="customer-avatar">
                ${escapeHtml(name.charAt(0).toUpperCase())}
            </div>

            <div class="customer-info">
                <h3>${escapeHtml(name)}</h3>

                <p>
                    ${escapeHtml(
                        customerEmails[name] ||
                        `${name.toLowerCase()}@gmail.com`
                    )}
                </p>

                <p>
                    <strong>Orders:</strong>
                    ${info.orders.size}
                </p>

                <p>
                    <strong>Products purchased:</strong>
                    ${info.quantity}
                </p>
            </div>
        </div>
    `).join("");
}

function renderLowStockAlerts() {
    const container =
        document.getElementById("dashboardAlerts") ||
        document.getElementById("lowStockAlerts");

    if (!container) return;

    const lowStock = products.filter(
        product =>
            productStock(product) <= productReorder(product)
    );

    if (!lowStock.length) {
        container.innerHTML =
            "<p>✓ No low-stock products.</p>";
        return;
    }

    container.innerHTML = lowStock.map(product => `
        <div class="alert-item">
            <strong>${escapeHtml(productName(product))}</strong>

            <span>
                Stock: ${productStock(product)}
                / Reorder: ${productReorder(product)}
            </span>
        </div>
    `).join("");
}

function renderForecast() {
    const container =
        document.getElementById("forecastList") ||
        document.getElementById("forecastTableBody");

    if (!container) return;

    if (!forecasts.length) {
        container.innerHTML =
            "<p>No forecast data available.</p>";
        return;
    }

    const rows = forecasts.map(item => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.forecast_quantity}</td>
            <td>${item.stock_quantity}</td>
            <td>${item.reorder_level}</td>
            <td>
                ${
                    item.alert
                        ? `<span class="low-stock">⚠ Reorder</span>`
                        : `<span class="in-stock">✓ Normal</span>`
                }
            </td>
        </tr>
    `).join("");

    if (container.tagName === "TBODY") {
        container.innerHTML = rows;
    } else {
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Forecast</th>
                        <th>Current Stock</th>
                        <th>Reorder Level</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }
}

function showProductDetails(id) {
    const product = products.find(
        p => productId(p) === Number(id)
    );

    if (!product) return;

    const modal =
        document.getElementById("productModal") ||
        document.getElementById("productDetailsModal");

    if (!modal) {
        alert(
            `${productName(product)}\n` +
            `Price: ₹${productPrice(product)}\n` +
            `Stock: ${productStock(product)}\n` +
            `Rating: ${productRating(product)}/5`
        );
        return;
    }

    const content =
        modal.querySelector(".modal-content") ||
        modal.querySelector(".modal-body") ||
        modal;

    content.innerHTML = `
        <button class="modal-close" onclick="closeProductModal()">×</button>

        <h2>${escapeHtml(productName(product))}</h2>

        <p><strong>Category:</strong>
            ${escapeHtml(productCategory(product))}
        </p>

        <p><strong>Price:</strong>
            ₹${productPrice(product).toLocaleString("en-IN")}
        </p>

        <p><strong>Stock:</strong>
            ${productStock(product)}
        </p>

        <p><strong>Reorder level:</strong>
            ${productReorder(product)}
        </p>

        <p><strong>Rating:</strong>
            ★ ${productRating(product).toFixed(1)} / 5
        </p>

        <h3>Purchase History</h3>

        ${
            orders
                .filter(
                    order =>
                        orderProduct(order) === productName(product)
                )
                .map(order => `
                    <div class="purchase-history-row">
                        <strong>
                            ${escapeHtml(orderCustomer(order))}
                        </strong>

                        bought
                        ${orderQuantity(order)}

                        on
                        ${escapeHtml(orderDate(order))}
                    </div>
                `)
                .join("") ||
            "<p>No purchase history.</p>"
        }
    `;

    modal.style.display = "flex";
}

function closeProductModal() {
    const modal =
        document.getElementById("productModal") ||
        document.getElementById("productDetailsModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function setupSearch() {
    document
        .getElementById("productSearch")
        ?.addEventListener("input", renderProducts);

    document
        .getElementById("categoryFilter")
        ?.addEventListener("change", renderProducts);

    document
        .getElementById("orderSearch")
        ?.addEventListener("input", renderOrders);
}

function setupRefresh() {
    const buttons = document.querySelectorAll(
        "#refreshBtn, .refresh-btn"
    );

    buttons.forEach(button => {
        button.addEventListener("click", async () => {
            await loadProducts();
            await loadOrders();
            await loadForecast();
            renderAnalytics();
        });
    });
}

function setupForecastButton() {
    const buttons = document.querySelectorAll(
        "#generateForecastBtn, #runForecastBtn"
    );

    buttons.forEach(button => {
        button.addEventListener("click", async () => {
            button.disabled = true;
            button.textContent = "Generating...";

            await loadForecast();

            button.disabled = false;
            button.textContent = "Generate Forecast";
        });
    });
}

function setupModal() {
    document
        .querySelectorAll(".modal-close, .close-modal")
        .forEach(button => {
            button.addEventListener(
                "click",
                closeProductModal
            );
        });

    window.addEventListener("click", event => {
        const modal =
            document.getElementById("productModal") ||
            document.getElementById("productDetailsModal");

        if (modal && event.target === modal) {
            closeProductModal();
        }
    });
}

async function initializeDashboard() {
    console.log("CatalogPro dashboard starting...");

    setupNavigation();
    setupSearch();
    setupRefresh();
    setupForecastButton();
    setupModal();

    await loadProducts();
    await loadOrders();
    await loadForecast();

    updateDashboardStatistics();
    renderAnalytics();

    console.log("CatalogPro dashboard loaded successfully.");
}

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);

/* =========================================================
   FINAL DASHBOARD FIX
   ========================================================= */

function showSection(sectionName) {

    const sectionMap = {
        dashboard: "dashboard",
        products: "products",
        orders: "orders",
        customers: "customers",
        analytics: "analytics",
        forecast: "forecast"
    };

    const targetId = sectionMap[sectionName] || sectionName;

    /* Hide every actual .page section */
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
        section.style.display = "none";
    });

    /* Show selected page */
    const target = document.getElementById(targetId);

    if (target) {
        target.classList.add("active");
        target.style.display = "block";
    }

    /* Fix active sidebar button */
    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");

        const page =
            button.getAttribute("data-page") ||
            button.getAttribute("data-section");

        if (page === targetId) {
            button.classList.add("active");
        }
    });

    /* Update page title */
    const titles = {
        dashboard: "Dashboard",
        products: "Products",
        orders: "Order History",
        customers: "Customers",
        analytics: "Analytics",
        forecast: "Demand Forecast"
    };

    const title = document.getElementById("pageTitle");

    if (title) {
        title.textContent =
            titles[targetId] || "Dashboard";
    }

    currentSection = targetId;
}


/* =========================================================
   SIDEBAR NAVIGATION
   ========================================================= */

function setupNavigation() {

    document.querySelectorAll(".nav-item").forEach(button => {

        button.onclick = function(event) {

            event.preventDefault();

            const page =
                this.getAttribute("data-page") ||
                this.getAttribute("data-section");

            if (!page) return;

            showSection(page);

        };

    });

    showSection("dashboard");
}


/* =========================================================
   CUSTOMER DETAILS + ORDER HISTORY
   ========================================================= */

function renderCustomers() {

    const container =
        document.getElementById("customersList");

    if (!container) return;

    const customerMap = {};

    orders.forEach(order => {

        const name = orderCustomer(order);

        if (!customerMap[name]) {

            customerMap[name] = {
                orders: [],
                quantity: 0,
                totalSpent: 0
            };

        }

        const product = products.find(
            p => productName(p) === orderProduct(order)
        );

        const price = product
            ? productPrice(product)
            : 0;

        customerMap[name].orders.push(order);

        customerMap[name].quantity +=
            orderQuantity(order);

        customerMap[name].totalSpent +=
            orderQuantity(order) * price;
    });

    const customers =
        Object.entries(customerMap);

    setText("customerCount", customers.length);
    setText("activeCustomers", customers.length);

    container.innerHTML = customers.map(
        ([name, info]) => {

            const email =
                customerEmails[name] ||
                `${name.toLowerCase()}@gmail.com`;

            return `
                <div class="customer-card">

                    <div class="customer-avatar">
                        ${escapeHtml(
                            name.charAt(0).toUpperCase()
                        )}
                    </div>

                    <div class="customer-info">

                        <h3>
                            ${escapeHtml(name)}
                        </h3>

                        <p>
                            📧 ${escapeHtml(email)}
                        </p>

                        <p>
                            🛒 Orders:
                            <strong>
                                ${new Set(
                                    info.orders.map(orderId)
                                ).size}
                            </strong>
                        </p>

                        <p>
                            📦 Products purchased:
                            <strong>
                                ${info.quantity}
                            </strong>
                        </p>

                        <p>
                            💰 Total spent:
                            <strong>
                                ₹${info.totalSpent.toLocaleString("en-IN")}
                            </strong>
                        </p>

                        <button
                            class="customer-history-btn"
                            data-customer="${escapeHtml(name)}">
                            View Order History
                        </button>

                    </div>

                </div>
            `;
        }
    ).join("");

    document
        .querySelectorAll(".customer-history-btn")
        .forEach(button => {

            button.onclick = function() {

                showCustomerHistory(
                    this.dataset.customer
                );

            };

        });
}


/* =========================================================
   CUSTOMER ORDER HISTORY
   ========================================================= */

function showCustomerHistory(customerName) {

    const customerOrders =
        orders.filter(
            order =>
                orderCustomer(order) === customerName
        );

    const existing =
        document.getElementById("customerHistoryModal");

    if (existing) {
        existing.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "customerHistoryModal";
    modal.className = "custom-modal";

    modal.innerHTML = `

        <div class="custom-modal-box">

            <button
                class="custom-modal-close"
                id="closeCustomerHistory">
                ×
            </button>

            <h2>
                ${escapeHtml(customerName)}
            </h2>

            <p>
                📧
                ${escapeHtml(
                    customerEmails[customerName] ||
                    `${customerName.toLowerCase()}@gmail.com`
                )}
            </p>

            <h3>
                Order History
            </h3>

            <div class="customer-order-history">

                ${
                    customerOrders.length
                    ?
                    customerOrders.map(order => {

                        const product =
                            products.find(
                                p =>
                                    productName(p) ===
                                    orderProduct(order)
                            );

                        const total =
                            product
                            ? orderQuantity(order) *
                              productPrice(product)
                            : 0;

                        return `

                            <div class="history-row">

                                <div>
                                    <strong>
                                        Order #${orderId(order)}
                                    </strong>

                                    <br>

                                    <span>
                                        ${escapeHtml(
                                            orderProduct(order)
                                        )}
                                    </span>
                                </div>

                                <div>
                                    Qty:
                                    ${orderQuantity(order)}
                                </div>

                                <div>
                                    ₹${total.toLocaleString("en-IN")}
                                </div>

                                <div>
                                    📅
                                    ${escapeHtml(
                                        orderDate(order)
                                    )}
                                </div>

                                <div class="order-status placed">
                                    ✓ Placed
                                </div>

                            </div>

                        `;

                    }).join("")
                    :
                    "<p>No order history found.</p>"
                }

            </div>

        </div>

    `;

    document.body.appendChild(modal);

    document
        .getElementById("closeCustomerHistory")
        .onclick = () => modal.remove();

    modal.onclick = event => {

        if (event.target === modal) {
            modal.remove();
        }

    };
}


/* =========================================================
   ORDER TRACKING
   ========================================================= */

function renderOrders() {

    const tbody =
        document.getElementById("ordersTableBody") ||
        document.querySelector("#ordersTable tbody");

    if (!tbody) return;

    const search =
        document.getElementById("orderSearch")
        ?.value
        ?.toLowerCase()
        .trim() || "";

    const filtered =
        orders.filter(order =>

            orderCustomer(order)
                .toLowerCase()
                .includes(search)

            ||

            orderProduct(order)
                .toLowerCase()
                .includes(search)

        );

    tbody.innerHTML =
        filtered.map(order => `

            <tr>

                <td>
                    <strong>
                        #${orderId(order)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        orderCustomer(order)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        orderProduct(order)
                    )}
                </td>

                <td>
                    ${orderQuantity(order)}
                </td>

                <td>
                    ${escapeHtml(
                        orderDate(order)
                    )}
                </td>

                <td>
                    <span class="order-status placed">
                        ✓ Placed
                    </span>
                </td>

                <td>
                    <button
                        class="track-order-btn"
                        data-order="${orderId(order)}">
                        Track
                    </button>
                </td>

            </tr>

        `).join("");

    if (!filtered.length) {

        tbody.innerHTML =
            `<tr>
                <td colspan="7">
                    No orders found.
                </td>
            </tr>`;

    }

    document
        .querySelectorAll(".track-order-btn")
        .forEach(button => {

            button.onclick = function() {

                showOrderTracking(
                    Number(this.dataset.order)
                );

            };

        });
}


/* =========================================================
   ORDER TRACKING POPUP
   ========================================================= */

function showOrderTracking(id) {

    const order =
        orders.find(
            item => orderId(item) === id
        );

    if (!order) return;

    const existing =
        document.getElementById("orderTrackingModal");

    if (existing) {
        existing.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "orderTrackingModal";
    modal.className = "custom-modal";

    modal.innerHTML = `

        <div class="custom-modal-box">

            <button
                class="custom-modal-close"
                onclick="this.closest('.custom-modal').remove()">
                ×
            </button>

            <h2>
                Order #${id}
            </h2>

            <p>
                Customer:
                <strong>
                    ${escapeHtml(
                        orderCustomer(order)
                    )}
                </strong>
            </p>

            <p>
                Product:
                <strong>
                    ${escapeHtml(
                        orderProduct(order)
                    )}
                </strong>
            </p>

            <p>
                Quantity:
                <strong>
                    ${orderQuantity(order)}
                </strong>
            </p>

            <p>
                Order Date:
                <strong>
                    ${escapeHtml(
                        orderDate(order)
                    )}
                </strong>
            </p>

            <h3>
                Order Tracking
            </h3>

            <div class="tracking-timeline">

                <div class="tracking-step completed">
                    <span>✓</span>
                    <strong>Order Placed</strong>
                </div>

                <div class="tracking-line"></div>

                <div class="tracking-step">
                    <span>2</span>
                    <strong>Processing</strong>
                </div>

                <div class="tracking-line"></div>

                <div class="tracking-step">
                    <span>3</span>
                    <strong>Shipped</strong>
                </div>

                <div class="tracking-line"></div>

                <div class="tracking-step">
                    <span>4</span>
                    <strong>Delivered</strong>
                </div>

            </div>

            <p class="tracking-note">
                Current database stores the order date only,
                so live shipping status is not available yet.
            </p>

        </div>

    `;

    document.body.appendChild(modal);

    modal.onclick = event => {

        if (event.target === modal) {
            modal.remove();
        }

    };
}


/* =========================================================
   SMALLER MOST/LEAST SOLD GRAPH
   ========================================================= */

function renderMostSoldChart(salesData) {

    const canvas =
        document.getElementById("salesChart") ||
        document.getElementById("mostSoldChart") ||
        document.getElementById("analyticsSalesChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    destroyChart("sales");

    /* Show only the top 5 and bottom product */
    const selected = [];

    salesData
        .slice(0, 5)
        .forEach(item => selected.push(item));

    if (salesData.length > 5) {

        const last =
            salesData[salesData.length - 1];

        if (
            !selected.some(
                item => item.name === last.name
            )
        ) {
            selected.push(last);
        }
    }

    charts.sales = new Chart(canvas, {

        type: "bar",

        data: {

            labels:
                selected.map(item => item.name),

            datasets: [{

                label: "Units Sold",

                data:
                    selected.map(item => item.units)

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            aspectRatio: 2.8,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }

            }

        }

    });
}


/* =========================================================
   PRODUCT AVAILABILITY
   ========================================================= */

function renderProducts() {

    const container =
        document.getElementById("productsGrid");

    if (!container) return;

    const search =
        document.getElementById("productSearch")
        ?.value
        ?.toLowerCase()
        .trim() || "";

    const category =
        document.getElementById("categoryFilter")
        ?.value || "";

    const filtered =
        products.filter(product => {

            const name =
                productName(product)
                    .toLowerCase();

            return (
                (!search ||
                    name.includes(search))

                &&

                (!category ||
                    productCategory(product) === category)
            );

        });

    container.innerHTML =
        filtered.map(product => {

            const stock =
                productStock(product);

            const reorder =
                productReorder(product);

            let status = "Available";
            let statusClass = "available";

            if (stock === 0) {

                status = "Out of Stock";
                statusClass = "out";

            } else if (stock <= reorder) {

                status = "Low Stock";
                statusClass = "low";

            }

            return `

                <div class="product-card">

                    <div class="product-card-top">

                        <span class="product-category">
                            ${escapeHtml(
                                productCategory(product)
                            )}
                        </span>

                        <span class="rating">
                            ★
                            ${productRating(product).toFixed(1)}
                        </span>

                    </div>

                    <h3>
                        ${escapeHtml(
                            productName(product)
                        )}
                    </h3>

                    <p class="product-price">
                        ₹${productPrice(product).toLocaleString("en-IN")}
                    </p>

                    <p>
                        <strong>
                            Available Stock:
                        </strong>

                        ${stock}
                    </p>

                    <p>
                        <strong>
                            Reorder Level:
                        </strong>

                        ${reorder}
                    </p>

                    <div class="availability ${statusClass}">
                        ${
                            status === "Available"
                            ? "✓"
                            : status === "Low Stock"
                            ? "⚠"
                            : "✕"
                        }
                        ${status}
                    </div>

                    <button
                        class="product-details-btn"
                        data-product-id="${productId(product)}">
                        View Details
                    </button>

                </div>

            `;

        }).join("");

    document
        .querySelectorAll(".product-details-btn")
        .forEach(button => {

            button.onclick = () => {

                showProductDetails(
                    Number(
                        button.dataset.productId
                    )
                );

            };

        });
}


/* =========================================================
   EXTRA CSS
   ========================================================= */

const dashboardFixStyle =
    document.createElement("style");

dashboardFixStyle.textContent = `

    .page {
        display: none;
    }

    .page.active {
        display: block;
    }

    .nav-item.active {
        font-weight: 700;
    }

    .availability {
        padding: 8px 12px;
        border-radius: 8px;
        margin: 10px 0;
        font-weight: 600;
    }

    .availability.available {
        background: #dcfce7;
        color: #166534;
    }

    .availability.low {
        background: #fef3c7;
        color: #92400e;
    }

    .availability.out {
        background: #fee2e2;
        color: #991b1b;
    }

    .customer-history-btn,
    .track-order-btn {
        border: none;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
    }

    .custom-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    }

    .custom-modal-box {
        background: white;
        width: min(850px, 95vw);
        max-height: 85vh;
        overflow-y: auto;
        border-radius: 16px;
        padding: 28px;
        position: relative;
    }

    .custom-modal-close {
        position: absolute;
        right: 15px;
        top: 12px;
        border: none;
        background: #f1f5f9;
        border-radius: 50%;
        width: 35px;
        height: 35px;
        font-size: 22px;
        cursor: pointer;
    }

    .history-row {
        display: grid;
        grid-template-columns: 1.4fr .7fr .8fr 1fr .8fr;
        gap: 12px;
        align-items: center;
        padding: 14px 0;
        border-bottom: 1px solid #e5e7eb;
    }

    .order-status {
        padding: 5px 9px;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 700;
    }

    .order-status.placed {
        background: #dbeafe;
        color: #1d4ed8;
    }

    .tracking-timeline {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 30px 0;
    }

    .tracking-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-width: 100px;
        color: #64748b;
    }

    .tracking-step span {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e2e8f0;
        font-weight: 700;
    }

    .tracking-step.completed {
        color: #166534;
    }

    .tracking-step.completed span {
        background: #dcfce7;
    }

    .tracking-line {
        height: 3px;
        width: 60px;
        background: #cbd5e1;
    }

    .tracking-note {
        margin-top: 20px;
        padding: 12px;
        background: #f8fafc;
        border-radius: 8px;
        font-size: 13px;
    }

    /* Make analytics/dashboard charts compact */
    .dashboard-grid canvas,
    .analytics-grid canvas {
        max-height: 260px !important;
    }

    .dashboard-grid .panel,
    .analytics-grid .panel {
        overflow: hidden;
    }

    @media (max-width: 700px) {

        .history-row {
            grid-template-columns: 1fr;
        }

        .tracking-timeline {
            flex-direction: column;
        }

        .tracking-line {
            width: 3px;
            height: 30px;
        }

    }

`;

document.head.appendChild(
    dashboardFixStyle
);


/* Run navigation again after all fixes */
document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupNavigation();
    }
);


/* =========================================================
   FINAL PRODUCT CATALOG
   ========================================================= */

window.productImages = {
    1: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
    2: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=600&q=80",
    3: "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?auto=format&fit=crop&w=600&q=80",
    4: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=600&q=80",
    5: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=600&q=80",
    6: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=600&q=80",
    7: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80",
    8: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
};


/* Safely get product values */

function catalogProductId(product) {
    return Number(
        product.id ??
        product.product_id ??
        product.productId ??
        0
    );
}

function catalogProductName(product) {
    return String(
        product.name ??
        product.product_name ??
        product.productName ??
        "Product"
    );
}

function catalogProductCategory(product) {
    return String(
        product.category ??
        product.category_name ??
        "General"
    );
}

function catalogProductPrice(product) {
    return Number(
        product.price ??
        product.unit_price ??
        product.unitPrice ??
        0
    );
}

function catalogProductStock(product) {
    return Number(
        product.stock_quantity ??
        product.stockQuantity ??
        product.stock ??
        0
    );
}

function catalogProductReorder(product) {
    return Number(
        product.reorder_level ??
        product.reorderLevel ??
        0
    );
}

function catalogProductRating(product) {

    const ratings = {
        1: 4.5,
        2: 4.2,
        3: 4.7,
        4: 4.4,
        5: 4.1,
        6: 4.6,
        7: 4.3,
        8: 4.0
    };

    return Number(
        product.rating ??
        ratings[catalogProductId(product)] ??
        4.0
    );
}


/* =========================================================
   PRODUCT CATALOG RENDER
   ========================================================= */

window.renderProducts = function() {

    const container =
        document.getElementById("productsGrid");

    if (!container) return;

    if (!Array.isArray(window.products) ||
        window.products.length === 0) {

        container.innerHTML = `
            <div class="products-loading">
                Loading products...
            </div>
        `;

        return;
    }

    const searchInput =
        document.getElementById("productSearch");

    const categoryInput =
        document.getElementById("categoryFilter");

    const search =
        searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const category =
        categoryInput
        ? categoryInput.value
        : "";

    const filtered =
        window.products.filter(product => {

            const name =
                catalogProductName(product)
                    .toLowerCase();

            const productCategory =
                catalogProductCategory(product);

            return (
                (!search || name.includes(search))
                &&
                (!category ||
                 productCategory === category)
            );
        });


    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="no-products">
                <div class="no-products-icon">🔍</div>
                <h3>No products found</h3>
                <p>Try another product name or category.</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        filtered.map(product => {

            const id =
                catalogProductId(product);

            const name =
                catalogProductName(product);

            const productCategory =
                catalogProductCategory(product);

            const price =
                catalogProductPrice(product);

            const stock =
                catalogProductStock(product);

            const reorder =
                catalogProductReorder(product);

            const rating =
                catalogProductRating(product);


            let availability =
                "Available";

            let availabilityClass =
                "available";

            let availabilityIcon =
                "✓";


            if (stock <= 0) {

                availability =
                    "Out of Stock";

                availabilityClass =
                    "out";

                availabilityIcon =
                    "✕";

            } else if (stock <= reorder) {

                availability =
                    "Low Stock";

                availabilityClass =
                    "low";

                availabilityIcon =
                    "⚠";

            }


            const image =
                window.productImages[id] ||
                "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80";


            return `

                <div class="catalog-product-card">

                    <div class="catalog-product-image">

                        <img
                            src="${image}"
                            alt="${escapeHtml(name)}"
                            onerror="this.src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80'"
                        >

                        <span class="catalog-category">
                            ${escapeHtml(productCategory)}
                        </span>

                    </div>


                    <div class="catalog-product-content">

                        <div class="catalog-product-rating">
                            ⭐ ${rating.toFixed(1)}
                        </div>

                        <h3>
                            ${escapeHtml(name)}
                        </h3>

                        <div class="catalog-price">
                            ₹${price.toLocaleString("en-IN")}
                        </div>


                        <div class="catalog-product-info">

                            <div>
                                <span>Available Stock</span>
                                <strong>${stock}</strong>
                            </div>

                            <div>
                                <span>Reorder Level</span>
                                <strong>${reorder}</strong>
                            </div>

                        </div>


                        <div class="
                            catalog-availability
                            ${availabilityClass}
                        ">
                            ${availabilityIcon}
                            ${availability}
                        </div>


                        <button
                            class="catalog-details-button"
                            data-product-id="${id}">

                            View Product Details

                        </button>

                    </div>

                </div>

            `;

        }).join("");


    /* Product details buttons */

    document
        .querySelectorAll(".catalog-details-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                function() {

                    const id =
                        Number(
                            this.dataset.productId
                        );

                    if (
                        typeof showProductDetails ===
                        "function"
                    ) {

                        showProductDetails(id);

                    } else {

                        showCatalogProductDetails(id);

                    }

                }
            );

        });

};


/* =========================================================
   PRODUCT DETAILS
   ========================================================= */

window.showCatalogProductDetails =
function(id) {

    const product =
        window.products.find(
            item =>
                catalogProductId(item) === id
        );

    if (!product) return;

    const name =
        catalogProductName(product);

    const category =
        catalogProductCategory(product);

    const price =
        catalogProductPrice(product);

    const stock =
        catalogProductStock(product);

    const reorder =
        catalogProductReorder(product);

    const rating =
        catalogProductRating(product);

    let availability =
        "Available";

    if (stock <= 0) {

        availability =
            "Out of Stock";

    } else if (stock <= reorder) {

        availability =
            "Low Stock";
    }


    const old =
        document.getElementById(
            "catalogProductModal"
        );

    if (old) old.remove();


    const modal =
        document.createElement("div");

    modal.id =
        "catalogProductModal";

    modal.className =
        "catalog-modal";


    modal.innerHTML = `

        <div class="catalog-modal-box">

            <button
                class="catalog-modal-close">
                ×
            </button>


            <div class="catalog-detail-layout">

                <div class="catalog-detail-image">

                    <img
                        src="${window.productImages[id]}"
                        alt="${escapeHtml(name)}"
                    >

                </div>


                <div class="catalog-detail-info">

                    <span class="catalog-category">
                        ${escapeHtml(category)}
                    </span>

                    <h2>
                        ${escapeHtml(name)}
                    </h2>

                    <div class="catalog-detail-rating">
                        ⭐ ${rating.toFixed(1)} / 5
                    </div>

                    <h3 class="catalog-detail-price">
                        ₹${price.toLocaleString("en-IN")}
                    </h3>


                    <div class="catalog-detail-grid">

                        <div>
                            <span>Available Stock</span>
                            <strong>${stock}</strong>
                        </div>

                        <div>
                            <span>Reorder Level</span>
                            <strong>${reorder}</strong>
                        </div>

                        <div>
                            <span>Availability</span>
                            <strong>${availability}</strong>
                        </div>

                    </div>


                    <hr>

                    <h3>
                        Product Information
                    </h3>

                    <p>
                        This product is available in the
                        store catalog. Stock and reorder
                        information are retrieved from the
                        database.
                    </p>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    modal
        .querySelector(".catalog-modal-close")
        .onclick =
        () => modal.remove();


    modal.onclick =
        event => {

            if (
                event.target === modal
            ) {

                modal.remove();

            }

        };

};


/* =========================================================
   PRODUCT PAGE CSS
   ========================================================= */

const catalogStyle =
    document.createElement("style");


catalogStyle.textContent = `

    .products-grid {
        display: grid !important;
        grid-template-columns:
            repeat(auto-fill, minmax(250px, 1fr));
        gap: 22px;
        padding: 25px 0;
    }


    .catalog-product-card {

        background: #ffffff;

        border: 1px solid #e2e8f0;

        border-radius: 16px;

        overflow: hidden;

        box-shadow:
            0 4px 15px rgba(15,23,42,.08);

        transition:
            transform .2s ease,
            box-shadow .2s ease;

    }


    .catalog-product-card:hover {

        transform: translateY(-4px);

        box-shadow:
            0 10px 25px rgba(15,23,42,.14);

    }


    .catalog-product-image {

        height: 190px;

        background: #f8fafc;

        position: relative;

        display: flex;

        align-items: center;

        justify-content: center;

        overflow: hidden;

    }


    .catalog-product-image img {

        width: 100%;

        height: 100%;

        object-fit: cover;

    }


    .catalog-category {

        position: absolute;

        top: 12px;

        left: 12px;

        padding: 5px 10px;

        border-radius: 20px;

        background: white;

        font-size: 12px;

        font-weight: 700;

        box-shadow:
            0 2px 8px rgba(0,0,0,.12);

    }


    .catalog-product-content {

        padding: 18px;

    }


    .catalog-product-rating {

        font-size: 14px;

        margin-bottom: 7px;

    }


    .catalog-product-content h3 {

        margin: 5px 0 8px;

        font-size: 18px;

    }


    .catalog-price {

        font-size: 21px;

        font-weight: 800;

        margin-bottom: 15px;

    }


    .catalog-product-info {

        display: grid;

        grid-template-columns: 1fr 1fr;

        gap: 10px;

        margin-bottom: 12px;

    }


    .catalog-product-info div {

        background: #f8fafc;

        border-radius: 9px;

        padding: 9px;

    }


    .catalog-product-info span {

        display: block;

        font-size: 11px;

        margin-bottom: 4px;

    }


    .catalog-product-info strong {

        font-size: 15px;

    }


    .catalog-availability {

        padding: 9px;

        border-radius: 8px;

        font-weight: 700;

        margin-bottom: 13px;

        text-align: center;

    }


    .catalog-availability.available {

        background: #dcfce7;

        color: #166534;

    }


    .catalog-availability.low {

        background: #fef3c7;

        color: #92400e;

    }


    .catalog-availability.out {

        background: #fee2e2;

        color: #991b1b;

    }


    .catalog-details-button {

        width: 100%;

        padding: 11px;

        border: none;

        border-radius: 9px;

        cursor: pointer;

        font-weight: 700;

        background: #2563eb;

        color: white;

    }


    .catalog-details-button:hover {

        opacity: .9;

    }


    .no-products {

        text-align: center;

        padding: 60px 20px;

        grid-column: 1 / -1;

    }


    .no-products-icon {

        font-size: 45px;

    }


    .products-loading {

        text-align: center;

        padding: 50px;

        grid-column: 1 / -1;

    }


    .catalog-modal {

        position: fixed;

        inset: 0;

        background: rgba(0,0,0,.55);

        z-index: 10000;

        display: flex;

        align-items: center;

        justify-content: center;

        padding: 20px;

    }


    .catalog-modal-box {

        background: white;

        width: min(850px, 95vw);

        border-radius: 18px;

        padding: 25px;

        position: relative;

        max-height: 90vh;

        overflow-y: auto;

    }


    .catalog-modal-close {

        position: absolute;

        right: 15px;

        top: 12px;

        width: 36px;

        height: 36px;

        border: none;

        border-radius: 50%;

        font-size: 24px;

        cursor: pointer;

    }


    .catalog-detail-layout {

        display: grid;

        grid-template-columns: 42% 58%;

        gap: 25px;

    }


    .catalog-detail-image {

        height: 330px;

        border-radius: 14px;

        overflow: hidden;

        background: #f8fafc;

    }


    .catalog-detail-image img {

        width: 100%;

        height: 100%;

        object-fit: cover;

    }


    .catalog-detail-info {

        padding: 10px;

    }


    .catalog-detail-info h2 {

        font-size: 30px;

        margin: 12px 0;

    }


    .catalog-detail-rating {

        margin-bottom: 15px;

    }


    .catalog-detail-price {

        font-size: 26px;

        margin: 10px 0 20px;

    }


    .catalog-detail-grid {

        display: grid;

        grid-template-columns:
            repeat(3, 1fr);

        gap: 10px;

    }


    .catalog-detail-grid div {

        background: #f8fafc;

        padding: 12px;

        border-radius: 10px;

    }


    .catalog-detail-grid span {

        display: block;

        font-size: 12px;

        margin-bottom: 5px;

    }


    @media(max-width: 750px) {

        .catalog-detail-layout {

            grid-template-columns: 1fr;

        }

        .catalog-detail-image {

            height: 250px;

        }

        .catalog-detail-grid {

            grid-template-columns: 1fr;

        }

    }

`;

document.head.appendChild(catalogStyle);


/* =========================================================
   AUTOMATIC PRODUCT LOADING
   ========================================================= */

function waitForProducts() {

    if (
        Array.isArray(window.products) &&
        window.products.length > 0
    ) {

        window.renderProducts();

        return true;

    }

    return false;
}


document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (!waitForProducts()) {

            const productTimer =
                setInterval(
                    function() {

                        if (
                            waitForProducts()
                        ) {

                            clearInterval(
                                productTimer
                            );

                        }

                    },
                    500
                );

        }

    }
);


/* Also render when Products menu is clicked */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            function() {

                const page =
                    this.dataset.page;

                if (page === "products") {

                    setTimeout(
                        waitForProducts,
                        100
                    );

                }

            }
        );

    });


/* =========================================================
   FINAL WORKING PRODUCTS PAGE
   ========================================================= */

window.renderProducts = function () {

    const container = document.getElementById("productsGrid");

    if (!container) {
        console.error("productsGrid not found");
        return;
    }

    /* Use the real application products array */
    const productList =
        Array.isArray(products) ? products : [];

    console.log("Products loaded:", productList);

    if (productList.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No products loaded</h3>
                <p>Please check the Java server connection.</p>
            </div>
        `;

        return;
    }

    const searchElement =
        document.getElementById("productSearch");

    const categoryElement =
        document.getElementById("categoryFilter");

    const search =
        searchElement
            ? searchElement.value.toLowerCase().trim()
            : "";

    const selectedCategory =
        categoryElement
            ? categoryElement.value
            : "all";


    /* Build category list */

    if (categoryElement) {

        const categories = [
            ...new Set(
                productList.map(product =>
                    getProductCategory(product)
                )
            )
        ];

        categoryElement.innerHTML =
            `<option value="all">All Categories</option>` +
            categories.map(category =>
                `<option value="${escapeHtml(category)}">
                    ${escapeHtml(category)}
                </option>`
            ).join("");

        categoryElement.value =
            categories.includes(selectedCategory)
                ? selectedCategory
                : "all";
    }


    /* Search + category filter */

    const filteredProducts =
        productList.filter(product => {

            const name =
                getProductName(product)
                    .toLowerCase();

            const category =
                getProductCategory(product);

            const matchesSearch =
                !search ||
                name.includes(search);

            const matchesCategory =
                selectedCategory === "all" ||
                !selectedCategory ||
                category === selectedCategory;

            return (
                matchesSearch &&
                matchesCategory
            );
        });


    /* No results */

    if (filteredProducts.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:45px;">🔍</div>
                <h3>No products found</h3>
                <p>Try another product name.</p>
            </div>
        `;

        return;
    }


    /* Product images */

    const productImages = {

        1: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=80",

        2: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80",

        3: "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?auto=format&fit=crop&w=700&q=80",

        4: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=700&q=80",

        5: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80",

        6: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=700&q=80",

        7: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80",

        8: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=700&q=80"

    };


    /* Demo ratings */

    const ratings = {

        1: 4.5,
        2: 4.2,
        3: 4.7,
        4: 4.4,
        5: 4.1,
        6: 4.6,
        7: 4.3,
        8: 4.0

    };


    /* Create product cards */

    container.innerHTML =
        filteredProducts.map(product => {

            const id =
                Number(product.id);

            const name =
                getProductName(product);

            const category =
                getProductCategory(product);

            const price =
                getPrice(product);

            const stock =
                getStock(product);

            const reorder =
                getReorderLevel(product);

            const rating =
                Number(
                    product.rating ||
                    ratings[id] ||
                    4.0
                );


            let status =
                "Available";

            let statusClass =
                "available";

            let icon =
                "✓";


            if (stock <= 0) {

                status =
                    "Out of Stock";

                statusClass =
                    "out";

                icon =
                    "✕";

            } else if (stock <= reorder) {

                status =
                    "Low Stock";

                statusClass =
                    "low";

                icon =
                    "⚠";

            }


            const image =
                productImages[id] ||
                "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80";


            return `

                <div class="catalog-product-card">

                    <div class="catalog-product-image">

                        <img
                            src="${image}"
                            alt="${escapeHtml(name)}"
                        >

                        <span class="catalog-category">
                            ${escapeHtml(category)}
                        </span>

                    </div>


                    <div class="catalog-product-content">

                        <div class="catalog-product-rating">
                            ⭐ ${rating.toFixed(1)}
                        </div>


                        <h3>
                            ${escapeHtml(name)}
                        </h3>


                        <div class="catalog-price">
                            ₹${price.toLocaleString("en-IN")}
                        </div>


                        <div class="catalog-product-info">

                            <div>
                                <span>Available Stock</span>
                                <strong>${stock}</strong>
                            </div>

                            <div>
                                <span>Reorder Level</span>
                                <strong>${reorder}</strong>
                            </div>

                        </div>


                        <div class="
                            catalog-availability
                            ${statusClass}
                        ">

                            ${icon} ${status}

                        </div>


                        <button
                            class="catalog-details-button"
                            data-product-id="${id}"
                        >
                            View Product Details
                        </button>

                    </div>

                </div>

            `;

        }).join("");


    /* Product detail buttons */

    document
        .querySelectorAll(".catalog-details-button")
        .forEach(button => {

            button.onclick = function () {

                const id =
                    Number(
                        this.dataset.productId
                    );

                if (
                    typeof showProductDetails ===
                    "function"
                ) {

                    showProductDetails(id);

                }

            };

        });

};


/* =========================================================
   PRODUCT CATEGORY HELPER
   ========================================================= */

if (typeof getProductCategory !== "function") {

    window.getProductCategory =
        function (product) {

            return String(
                product.category ||
                product.category_name ||
                "General"
            );

        };

}


/* =========================================================
   PRODUCT CARD DESIGN
   ========================================================= */

const finalProductStyle =
    document.createElement("style");

finalProductStyle.textContent = `

    #productsGrid.products-grid {

        display: grid !important;

        grid-template-columns:
            repeat(3, minmax(240px, 1fr));

        gap: 24px;

        margin-top: 25px;

    }


    .catalog-product-card {

        background: white;

        border: 1px solid #e2e8f0;

        border-radius: 16px;

        overflow: hidden;

        box-shadow:
            0 4px 14px rgba(0,0,0,.08);

        transition:
            transform .2s ease,
            box-shadow .2s ease;

    }


    .catalog-product-card:hover {

        transform: translateY(-4px);

        box-shadow:
            0 10px 25px rgba(0,0,0,.12);

    }


    .catalog-product-image {

        height: 190px;

        position: relative;

        overflow: hidden;

        background: #f1f5f9;

    }


    .catalog-product-image img {

        width: 100%;

        height: 100%;

        object-fit: cover;

        display: block;

    }


    .catalog-category {

        position: absolute;

        top: 12px;

        left: 12px;

        background: white;

        padding: 6px 10px;

        border-radius: 20px;

        font-size: 12px;

        font-weight: 700;

        box-shadow:
            0 2px 8px rgba(0,0,0,.15);

    }


    .catalog-product-content {

        padding: 18px;

    }


    .catalog-product-rating {

        font-size: 14px;

        margin-bottom: 8px;

    }


    .catalog-product-content h3 {

        font-size: 18px;

        margin: 6px 0;

        min-height: 44px;

    }


    .catalog-price {

        font-size: 22px;

        font-weight: 800;

        margin: 10px 0 16px;

    }


    .catalog-product-info {

        display: grid;

        grid-template-columns: 1fr 1fr;

        gap: 10px;

    }


    .catalog-product-info div {

        background: #f8fafc;

        padding: 10px;

        border-radius: 9px;

    }


    .catalog-product-info span {

        display: block;

        font-size: 11px;

        color: #64748b;

        margin-bottom: 4px;

    }


    .catalog-product-info strong {

        font-size: 16px;

    }


    .catalog-availability {

        margin-top: 12px;

        margin-bottom: 12px;

        padding: 9px;

        text-align: center;

        border-radius: 8px;

        font-weight: 700;

    }


    .catalog-availability.available {

        background: #dcfce7;

        color: #166534;

    }


    .catalog-availability.low {

        background: #fef3c7;

        color: #92400e;

    }


    .catalog-availability.out {

        background: #fee2e2;

        color: #991b1b;

    }


    .catalog-details-button {

        width: 100%;

        padding: 11px;

        border: none;

        border-radius: 9px;

        background: #2563eb;

        color: white;

        font-weight: 700;

        cursor: pointer;

    }


    .catalog-details-button:hover {

        background: #1d4ed8;

    }


    @media(max-width: 1100px) {

        #productsGrid.products-grid {

            grid-template-columns:
                repeat(2, minmax(240px, 1fr));

        }

    }


    @media(max-width: 650px) {

        #productsGrid.products-grid {

            grid-template-columns: 1fr;

        }

    }

`;

document.head.appendChild(
    finalProductStyle
);


/* =========================================================
   SEARCH + CATEGORY EVENTS
   ========================================================= */

const productSearch =
    document.getElementById(
        "productSearch"
    );

if (productSearch) {

    productSearch.oninput =
        window.renderProducts;

}


const categoryFilter =
    document.getElementById(
        "categoryFilter"
    );

if (categoryFilter) {

    categoryFilter.onchange =
        window.renderProducts;

}


/* Render immediately if products are already loaded */

if (
    Array.isArray(products) &&
    products.length > 0
) {

    window.renderProducts();

}

