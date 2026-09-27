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

        /* Browser fallback: use the products stored in the project database */
        products = [
            { id: 1, name: "Wireless Keyboard", category: "Accessories", price: 1299, stockQuantity: 18, reorderLevel: 8 },
            { id: 2, name: "USB-C Hub", category: "Accessories", price: 899, stockQuantity: 7, reorderLevel: 8 },
            { id: 3, name: "Mechanical Keyboard", category: "Accessories", price: 3499, stockQuantity: 5, reorderLevel: 6 },
            { id: 4, name: "Wireless Mouse", category: "Accessories", price: 999, stockQuantity: 24, reorderLevel: 10 },
            { id: 5, name: "Laptop Stand", category: "Office", price: 1499, stockQuantity: 11, reorderLevel: 6 },
            { id: 6, name: "Web Camera", category: "Electronics", price: 2199, stockQuantity: 9, reorderLevel: 5 },
            { id: 7, name: "Bluetooth Speaker", category: "Electronics", price: 1799, stockQuantity: 13, reorderLevel: 7 },
            { id: 8, name: "Notebook Pack", category: "Stationery", price: 299, stockQuantity: 30, reorderLevel: 10 }
        ];

        console.log("Using product display fallback:", products);

        renderProducts();
        updateProductStatistics();
        populateCategoryFilter();
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

function renderCustomers() {
    const container = document.getElementById("customersList");

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

        const price = product ? productPrice(product) : 0;

        customerMap[name].orders.push(order);
        customerMap[name].quantity += orderQuantity(order);
        customerMap[name].totalSpent +=
            orderQuantity(order) * price;
    });

    const customers = Object.entries(customerMap);

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
                        ${escapeHtml(name.charAt(0).toUpperCase())}
                    </div>

                    <div class="customer-info">

                        <h3>
                            ${escapeHtml(name)}
                        </h3>

                        <p>
                            Email: ${escapeHtml(email)}
                        </p>

                        <p>
                            Orders:
                            <strong>
                                ${new Set(
                                    info.orders.map(orderId)
                                ).size}
                            </strong>
                        </p>

                        <p>
                            Products purchased:
                            <strong>
                                ${info.quantity}
                            </strong>
                        </p>

                        <p>
                            Total spent:
                            <strong>
                                \u20B9${info.totalSpent.toLocaleString("en-IN")}
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
            button.addEventListener("click", () => {
                const customerName =
                    button.getAttribute("data-customer");

                showCustomerOrderHistory(customerName);
            });
        });
}

async function runForecast() {
    await loadForecast();
}
async function loadForecast() {
    try {
        const data = await fetchJSON(`${PYTHON_API}/forecast/run`);

        console.log("FORECAST API RESPONSE:", data); forecasts = data.data || [];

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
    setText("totalSales", `${totalSales.toLocaleString("en-IN")}`);
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
                         ${rating.toFixed(1)}
                    </span>
                </div>

                <h3>${escapeHtml(name)}</h3>

                <p class="product-price">
                    ${price.toLocaleString("en-IN")}
                </p>

                <p>
                    <strong>Stock:</strong> ${stock}
                </p>

                <p>
                    <strong>Reorder level:</strong> ${reorder}
                </p>

                ${
                    lowStock
                        ? `<div class="low-stock"> Low Stock</div>`
                        : `<div class="in-stock"> In Stock</div>`
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
                 ${orderQuantity(order)}
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
    const container = document.getElementById("rankingList");

    if (!container) return;

    if (!salesData.length) {
        container.innerHTML = "<p>No sales data available.</p>";
        return;
    }

    const highest = salesData[0];
    const lowest = salesData[salesData.length - 1];

    container.innerHTML = `
        <div class="ranking-summary">
            <div class="ranking-card most-sold">
                <div class="ranking-label">MOST SOLD PRODUCT</div>
                <div class="ranking-product">${escapeHtml(highest.name)}</div>
                <div class="ranking-units">${highest.units} units sold</div>
                <div class="ranking-rating">Rating: ${highest.rating.toFixed(1)} / 5</div>
            </div>

            <div class="ranking-card least-sold">
                <div class="ranking-label">LEAST SOLD PRODUCT</div>
                <div class="ranking-product">${escapeHtml(lowest.name)}</div>
                <div class="ranking-units">${lowest.units} units sold</div>
                <div class="ranking-rating">Rating: ${lowest.rating.toFixed(1)} / 5</div>
            </div>
        </div>

        <div class="sales-ranking-table">
            <div class="sales-ranking-header">
                <span>Rank</span>
                <span>Product</span>
                <span>Units Sold</span>
                <span>Rating</span>
            </div>

            ${salesData.map((item, index) => `
                <div class="sales-ranking-row">
                    <span class="rank-number">#${index + 1}</span>
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${item.units}</span>
                    <span>${item.rating.toFixed(1)} / 5</span>
                </div>
            `).join("")}
        </div>
    `;
}
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
                            
                            ${productRating(product).toFixed(1)}
                        </span>

                    </div>

                    <h3>
                        ${escapeHtml(
                            productName(product)
                        )}
                    </h3>

                    <p class="product-price">
                        ${productPrice(product).toLocaleString("en-IN")}
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
                            ? ""
                            : status === "Low Stock"
                            ? ""
                            : ""
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
                <div class="no-products-icon"></div>
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
                "";


            if (stock <= 0) {

                availability =
                    "Out of Stock";

                availabilityClass =
                    "out";

                availabilityIcon =
                    "";

            } else if (stock <= reorder) {

                availability =
                    "Low Stock";

                availabilityClass =
                    "low";

                availabilityIcon =
                    "";

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
                             ${rating.toFixed(1)}
                        </div>

                        <h3>
                            ${escapeHtml(name)}
                        </h3>

                        <div class="catalog-price">
                            ${price.toLocaleString("en-IN")}
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
                         ${rating.toFixed(1)} / 5
                    </div>

                    <h3 class="catalog-detail-price">
                        ${price.toLocaleString("en-IN")}
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
                <div style="font-size:45px;"></div>
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
                "";


            if (stock <= 0) {

                status =
                    "Out of Stock";

                statusClass =
                    "out";

                icon =
                    "";

            } else if (stock <= reorder) {

                status =
                    "Low Stock";

                statusClass =
                    "low";

                icon =
                    "";

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
                             ${rating.toFixed(1)}
                        </div>


                        <h3>
                            ${escapeHtml(name)}
                        </h3>


                        <div class="catalog-price">
                            ${price.toLocaleString("en-IN")}
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


/* =========================================================
   PRODUCT PAGE FINAL DISPLAY FIX
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {

    setTimeout(function () {

        const search = document.getElementById("productSearch");
        const category = document.getElementById("categoryFilter");

        if (search) {
            search.value = "";
        }

        if (category) {
            category.value = "all";
        }

        if (typeof window.renderProducts === "function") {
            window.renderProducts();
        }

    }, 800);

});


/* =========================================================
   FINAL PRODUCT CATALOG - OVERRIDES OLD PRODUCT RENDERERS
   ========================================================= */

(function () {

    const FINAL_PRODUCTS = [
        {
            id: 1,
            name: "Wireless Keyboard",
            category: "Accessories",
            price: 1299,
            stock: 18,
            reorder: 8,
            image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 2,
            name: "USB-C Hub",
            category: "Accessories",
            price: 899,
            stock: 7,
            reorder: 8,
            image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 3,
            name: "Mechanical Keyboard",
            category: "Accessories",
            price: 3499,
            stock: 5,
            reorder: 6,
            image: "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 4,
            name: "Wireless Mouse",
            category: "Accessories",
            price: 999,
            stock: 24,
            reorder: 10,
            image: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 5,
            name: "Laptop Stand",
            category: "Office",
            price: 1499,
            stock: 11,
            reorder: 6,
            image: "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 6,
            name: "Web Camera",
            category: "Electronics",
            price: 2199,
            stock: 9,
            reorder: 5,
            image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 7,
            name: "Bluetooth Speaker",
            category: "Electronics",
            price: 1799,
            stock: 13,
            reorder: 7,
            image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80"
        },
        {
            id: 8,
            name: "Notebook Pack",
            category: "Stationery",
            price: 299,
            stock: 30,
            reorder: 10,
            image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=700&q=80"
        }
    ];

    function finalProductRender() {

        const grid = document.getElementById("productsGrid");

        if (!grid) return;

        const searchBox = document.getElementById("productSearch");
        const categoryBox = document.getElementById("categoryFilter");

        const search = searchBox
            ? searchBox.value.toLowerCase().trim()
            : "";

        const category = categoryBox
            ? categoryBox.value
            : "all";

        const filtered = FINAL_PRODUCTS.filter(product => {

            const matchesSearch =
                product.name.toLowerCase().includes(search) ||
                product.category.toLowerCase().includes(search);

            const matchesCategory =
                category === "all" ||
                product.category === category;

            return matchesSearch && matchesCategory;
        });

        grid.innerHTML = filtered.length
            ? filtered.map(product => {

                let status = "Available";
                let statusClass = "final-available";

                if (product.stock <= 0) {
                    status = "Out of Stock";
                    statusClass = "final-out";
                } else if (product.stock <= product.reorder) {
                    status = "Low Stock";
                    statusClass = "final-low";
                }

                return `
                    <div class="final-product-card">

                        <div class="final-product-image">
                            <img
                                src="${product.image}"
                                alt="${product.name}"
                                onerror="this.style.display='none';"
                            >
                        </div>

                        <div class="final-product-details">

                            <div class="final-category">
                                ${product.category}
                            </div>

                            <h2>${product.name}</h2>

                            <div class="final-price">
                                ?${product.price.toLocaleString("en-IN")}
                            </div>

                            <div class="final-info">
                                <div>
                                    <span>Available Stock</span>
                                    <strong>${product.stock}</strong>
                                </div>

                                <div>
                                    <span>Reorder Level</span>
                                    <strong>${product.reorder}</strong>
                                </div>
                            </div>

                            <div class="final-status ${statusClass}">
                                ${status}
                            </div>

                        </div>

                    </div>
                `;

            }).join("")
            : `
                <div class="final-no-products">
                    <h2>No products found</h2>
                    <p>Try another product name or category.</p>
                </div>
            `;
    }

    window.renderProducts = finalProductRender;

    function setupFinalProductPage() {

        const searchBox = document.getElementById("productSearch");
        const categoryBox = document.getElementById("categoryFilter");

        if (categoryBox) {

            categoryBox.innerHTML = `
                <option value="all">All Categories</option>
                <option value="Accessories">Accessories</option>
                <option value="Office">Office</option>
                <option value="Electronics">Electronics</option>
                <option value="Stationery">Stationery</option>
            `;

            categoryBox.value = "all";
        }

        if (searchBox) {
            searchBox.value = "";
        }

        finalProductRender();
    }

    document.addEventListener("DOMContentLoaded", function () {

        const style = document.createElement("style");

        style.textContent = `
            .products-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
                gap: 24px;
                padding: 25px 0;
            }

            .final-product-card {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
                box-shadow: 0 5px 18px rgba(0,0,0,0.08);
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .final-product-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.13);
            }

            .final-product-image {
                width: 100%;
                height: 210px;
                background: #f3f4f6;
                overflow: hidden;
            }

            .final-product-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }

            .final-product-details {
                padding: 20px;
            }

            .final-category {
                font-size: 13px;
                font-weight: 600;
                color: #6366f1;
                margin-bottom: 8px;
            }

            .final-product-details h2 {
                margin: 0 0 10px;
                font-size: 20px;
                color: #172033;
            }

            .final-price {
                font-size: 22px;
                font-weight: 700;
                margin-bottom: 18px;
                color: #111827;
            }

            .final-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 15px;
            }

            .final-info div {
                background: #f8fafc;
                padding: 10px;
                border-radius: 9px;
            }

            .final-info span {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-bottom: 4px;
            }

            .final-info strong {
                font-size: 17px;
                color: #1e293b;
            }

            .final-status {
                padding: 9px 12px;
                border-radius: 8px;
                text-align: center;
                font-weight: 600;
            }

            .final-available {
                background: #dcfce7;
                color: #166534;
            }

            .final-low {
                background: #fef3c7;
                color: #92400e;
            }

            .final-out {
                background: #fee2e2;
                color: #991b1b;
            }

            .final-no-products {
                grid-column: 1 / -1;
                padding: 60px;
                text-align: center;
                background: white;
                border-radius: 15px;
            }
        `;

        document.head.appendChild(style);

        setupFinalProductPage();

        document.addEventListener("click", function (event) {

            const button = event.target.closest(".nav-item");

            if (!button) return;

            if (button.dataset.page === "products") {

                setTimeout(function () {
                    setupFinalProductPage();
                }, 150);
            }
        });

    });

})();

/* =========================================================
   FINAL ORDER HISTORY - DATABASE CONNECTED
   ========================================================= */

(function () {

    window.renderOrders = async function () {

        const table = document.getElementById("ordersTable");
        if (!table) return;

        const searchBox = document.getElementById("orderSearch");
        const search = searchBox
            ? searchBox.value.toLowerCase().trim()
            : "";

        table.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:30px;">
                    Loading order history...
                </td>
            </tr>
        `;

        try {

            const response = await fetch("http://localhost:8081/api/orders");

            if (!response.ok) {
                throw new Error("Order API returned HTTP " + response.status);
            }

            const data = await response.json();

            const orders = Array.isArray(data)
                ? data
                : (data.orders || data.data || []);

            const filtered = orders.filter(order => {

                const customer = String(
                    order.customerName || ""
                ).toLowerCase();

                const product = String(
                    order.productName || ""
                ).toLowerCase();

                return customer.includes(search) ||
                       product.includes(search) ||
                       String(order.id || "").includes(search);
            });

            if (filtered.length === 0) {

                table.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align:center;padding:40px;">
                            No orders found.
                        </td>
                    </tr>
                `;

            } else {

                table.innerHTML = filtered.map(order => {

                    const quantity = Number(order.quantity || 0);

                    const price =
                        Number(
                            order.unitPrice ||
                            order.price ||
                            0
                        );

                    const total = quantity * price;

                    return `
                        <tr>
                            <td>
                                <strong>#${order.id}</strong>
                            </td>

                            <td>
                                 ${order.customerName || "Unknown"}
                            </td>

                            <td>
                                 ${order.productName || "Unknown"}
                            </td>

                            <td>
                                ${quantity}
                            </td>

                            <td>
                                \u20B9${price.toLocaleString("en-IN")}
                            </td>

                            <td>
                                <strong>
                                    \u20B9${total.toLocaleString("en-IN")}
                                </strong>
                            </td>

                            <td>
                                ${order.orderDate || "-"}
                            </td>

                            <td>
                                <span class="order-status">
                                    Completed
                                </span>
                            </td>
                        </tr>
                    `;

                }).join("");
            }

            /* Statistics */

            const uniqueOrderIds = new Set(
                orders.map(order => order.id)
            );

            const totalItems = orders.reduce(
                (sum, order) =>
                    sum + Number(order.quantity || 0),
                0
            );

            const totalSales = orders.reduce(
                (sum, order) => {

                    const quantity =
                        Number(order.quantity || 0);

                    const price =
                        Number(
                            order.unitPrice ||
                            order.price ||
                            0
                        );

                    return sum + (quantity * price);

                },
                0
            );

            const orderCount =
                document.getElementById("orderHistoryCount");

            const itemCount =
                document.getElementById("orderItemCount");

            const salesTotal =
                document.getElementById("orderSalesTotal");

            if (orderCount) {
                orderCount.textContent =
                    uniqueOrderIds.size;
            }

            if (itemCount) {
                itemCount.textContent =
                    totalItems;
            }

            if (salesTotal) {
                salesTotal.textContent =
                    "\u20B9" + totalSales.toLocaleString("en-IN");
            }

        } catch (error) {

            console.error(
                "Order History loading error:",
                error
            );

            table.innerHTML = `
                <tr>
                    <td colspan="8"
                        style="text-align:center;padding:40px;">
                        <strong>Unable to load orders.</strong>
                        <br>
                        <small>
                            Make sure the Java server is running on port 8081.
                        </small>
                    </td>
                </tr>
            `;
        }
    };


    /* Automatically load when Order History is opened */

    document.addEventListener("click", function (event) {

        const button =
            event.target.closest(".nav-item");

        if (!button) return;

        if (button.dataset.page === "orders") {

            setTimeout(function () {
                window.renderOrders();
            }, 200);
        }

    });


    /* Load once page is ready */

    document.addEventListener("DOMContentLoaded", function () {

        setTimeout(function () {

            if (
                document.getElementById("ordersTable")
            ) {
                window.renderOrders();
            }

        }, 1000);

    });

})();
/* FINAL ORDER HISTORY SALES FIX */
(function () {

    window.renderOrders = async function () {

        const table = document.getElementById("ordersTable");
        if (!table) return;

        const searchBox = document.getElementById("orderSearch");
        const search = searchBox
            ? searchBox.value.toLowerCase().trim()
            : "";

        try {

            const [ordersResponse, productsResponse] = await Promise.all([
                fetch("http://localhost:8081/api/orders"),
                fetch("http://localhost:8081/api/products")
            ]);

            if (!ordersResponse.ok) {
                throw new Error("Orders API HTTP " + ordersResponse.status);
            }

            if (!productsResponse.ok) {
                throw new Error("Products API HTTP " + productsResponse.status);
            }

            const ordersData = await ordersResponse.json();
            const productsData = await productsResponse.json();

            const orders = Array.isArray(ordersData)
                ? ordersData
                : (ordersData.orders || ordersData.data || []);

            const products = Array.isArray(productsData)
                ? productsData
                : (productsData.products || productsData.data || []);

            /* Create product price lookup */
            const priceMap = {};

            products.forEach(product => {

                const productId = String(
                    product.id ??
                    product.productId ??
                    ""
                );

                const productName = String(
                    product.name ??
                    product.productName ??
                    ""
                ).toLowerCase().trim();

                const price = Number(
                    product.price ??
                    product.unitPrice ??
                    0
                );

                if (productId) {
                    priceMap["id:" + productId] = price;
                }

                if (productName) {
                    priceMap["name:" + productName] = price;
                }
            });

            /* Calculate every order line item */
            let totalItems = 0;
            let totalSales = 0;

            orders.forEach(order => {

                const quantity = Number(
                    order.quantity || 0
                );

                let unitPrice = Number(
                    order.unitPrice ??
                    order.price ??
                    0
                );

                /* If API did not provide price, find it from products */
                if (!unitPrice) {

                    const productId = String(
                        order.productId ??
                        ""
                    );

                    const productName = String(
                        order.productName ??
                        ""
                    ).toLowerCase().trim();

                    if (productId && priceMap["id:" + productId]) {
                        unitPrice = priceMap["id:" + productId];
                    } else if (
                        productName &&
                        priceMap["name:" + productName]
                    ) {
                        unitPrice = priceMap["name:" + productName];
                    }
                }

                totalItems += quantity;
                totalSales += quantity * unitPrice;
            });

            /* Search/filter */
            const filtered = orders.filter(order => {

                const customer = String(
                    order.customerName || ""
                ).toLowerCase();

                const product = String(
                    order.productName || ""
                ).toLowerCase();

                return customer.includes(search) ||
                       product.includes(search) ||
                       String(order.id || "").includes(search);
            });

            if (filtered.length === 0) {

                table.innerHTML = `
                    <tr>
                        <td colspan="8"
                            style="text-align:center;padding:40px;">
                            No orders found.
                        </td>
                    </tr>
                `;

            } else {

                table.innerHTML = filtered.map(order => {

                    const quantity = Number(
                        order.quantity || 0
                    );

                    let unitPrice = Number(
                        order.unitPrice ??
                        order.price ??
                        0
                    );

                    if (!unitPrice) {

                        const productId = String(
                            order.productId ?? ""
                        );

                        const productName = String(
                            order.productName || ""
                        ).toLowerCase().trim();

                        if (
                            productId &&
                            priceMap["id:" + productId]
                        ) {
                            unitPrice =
                                priceMap["id:" + productId];
                        } else if (
                            productName &&
                            priceMap["name:" + productName]
                        ) {
                            unitPrice =
                                priceMap["name:" + productName];
                        }
                    }

                    const lineTotal =
                        quantity * unitPrice;

                    return `
                        <tr>
                            <td><strong>#${order.id}</strong></td>

                            <td>
                                 ${order.customerName || "Unknown"}
                            </td>

                            <td>
                                 ${order.productName || "Unknown"}
                            </td>

                            <td>${quantity}</td>

                            <td>
                                \u20B9${unitPrice.toLocaleString("en-IN")}
                            </td>

                            <td>
                                <strong>
                                    \u20B9${lineTotal.toLocaleString("en-IN")}
                                </strong>
                            </td>

                            <td>
                                ${order.orderDate || "-"}
                            </td>

                            <td>
                                <span class="order-status">
                                    Completed
                                </span>
                            </td>
                        </tr>
                    `;

                }).join("");
            }

            /* Update summary cards */
            const uniqueOrderIds = new Set(
                orders.map(order => order.id)
            );

            const orderCount =
                document.getElementById("orderHistoryCount");

            const itemCount =
                document.getElementById("orderItemCount");

            const salesTotal =
                document.getElementById("orderSalesTotal");

            if (orderCount) {
                orderCount.textContent =
                    uniqueOrderIds.size;
            }

            if (itemCount) {
                itemCount.textContent =
                    totalItems;
            }

            if (salesTotal) {
                salesTotal.textContent =
                    "\u20B9" +
                    totalSales.toLocaleString("en-IN");
            }

            console.log("Order History Sales:", totalSales);
            console.log("Order History Items:", totalItems);

        } catch (error) {

            console.error(
                "Order History loading error:",
                error
            );

            table.innerHTML = `
                <tr>
                    <td colspan="8"
                        style="text-align:center;padding:40px;">
                        <strong>Unable to load orders.</strong>
                        <br>
                        <small>
                            Make sure Java server is running on port 8081.
                        </small>
                    </td>
                </tr>
            `;
        }
    };

})();
/* =========================================================
   PRODUCTS BY UNITS SOLD - CHART.JS FIX
   ========================================================= */

(function () {

    function renderProductsByUnitsSold() {

        const canvas =
            document.getElementById("analyticsSalesChart");

        if (!canvas) {
            console.warn(
                "Canvas #productsByUnitsSold was not found."
            );
            return;
        }

        /* Prevent duplicate charts */
        if (window.productsByUnitsSoldChart) {
            window.productsByUnitsSoldChart.destroy();
        }

        const ctx = canvas.getContext("2d");

        window.productsByUnitsSoldChart =
            new Chart(ctx, {
                type: "bar",

                data: {
                    labels: [
                        "Wireless Keyboard",
                        "USB-C Hub",
                        "Mechanical Keyboard",
                        "Web Camera"
                    ],

                    datasets: [{
                        label: "Units Sold",

                        data: [
                            4,
                            3,
                            3,
                            2
                        ],

                        borderWidth: 1,

                        borderRadius: 6
                    }]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: true
                        },

                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return "Units Sold: " +
                                        context.parsed.y;
                                }
                            }
                        }
                    },

                    scales: {

                        y: {
                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            },

                            title: {
                                display: true,
                                text: "Units Sold"
                            }
                        },

                        x: {
                            title: {
                                display: true,
                                text: "Products"
                            }
                        }
                    }
                }
            });
    }

    window.renderProductsByUnitsSold =
        renderProductsByUnitsSold;

    document.addEventListener(
        "DOMContentLoaded",
        function () {
            setTimeout(
                renderProductsByUnitsSold,
                500
            );
        }
    );

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(".nav-item");

            if (!button) return;

            if (
                button.dataset.page === "analytics"
            ) {
                setTimeout(
                    renderProductsByUnitsSold,
                    300
                );
            }
        }
    );

})();





