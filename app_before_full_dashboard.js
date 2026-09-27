// =========================================================
// CATALOGPRO - FRONTEND APPLICATION
// Java Backend : http://localhost:8081
// Python Service: http://localhost:5000
// =========================================================

const JAVA_API = "http://localhost:8081";
const PYTHON_API = "http://localhost:5000";

let products = [];
let orders = [];
let customers = [];

let categoryChart = null;
let stockChart = null;


// =========================================================
// API HELPER
// =========================================================

async function javaApi(endpoint, options = {}) {

    const response = await fetch(
        JAVA_API + endpoint,
        options
    );

    if (!response.ok) {
        throw new Error(
            `Java API error: ${response.status}`
        );
    }

    return await response.json();
}


async function pythonApi(endpoint, options = {}) {

    const response = await fetch(
        PYTHON_API + endpoint,
        options
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.error ||
            `Python API error: ${response.status}`
        );
    }

    return data;
}


// =========================================================
// PAGE NAVIGATION
// =========================================================

function showPage(pageName) {

    document
        .querySelectorAll(".page")
        .forEach(page => {
            page.classList.remove("active-page");
        });

    const selectedPage =
        document.getElementById(pageName);

    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }


    document
        .querySelectorAll(".menu-item")
        .forEach(item => {
            item.classList.remove("active");
        });


    const activeButton =
        document.querySelector(
            `.menu-item[data-page="${pageName}"]`
        );

    if (activeButton) {
        activeButton.classList.add("active");
    }


    const titles = {

        dashboard: [
            "Dashboard",
            "Overview of your store"
        ],

        products: [
            "Products",
            "Manage your product catalog and inventory"
        ],

        orders: [
            "Order History",
            "View all customer orders"
        ],

        customers: [
            "Customers",
            "Manage registered customers"
        ],

        forecast: [
            "Demand Forecast",
            "Predict product demand and reorder requirements"
        ]

    };


    const title =
        titles[pageName] ||
        titles.dashboard;


    document.getElementById(
        "page-title"
    ).textContent = title[0];


    document.getElementById(
        "page-subtitle"
    ).textContent = title[1];


    if (pageName === "products") {
        renderProducts();
    }

    if (pageName === "orders") {
        renderOrders();
    }

    if (pageName === "customers") {
        renderCustomers();
    }

    if (pageName === "forecast") {
        loadForecast();
    }
}


// =========================================================
// MENU EVENTS
// =========================================================

document
    .querySelectorAll(".menu-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const page =
                    button.dataset.page;

                showPage(page);
            }
        );

    });


// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {

    try {

        const data =
            await javaApi("/api/products");

        products =
            Array.isArray(data)
                ? data
                : data.products || [];


        updateDashboard();

        renderProducts();

        createCategoryFilter();

        createCharts();

    }
    catch (error) {

        console.error(
            "Product loading error:",
            error
        );

        document.getElementById(
            "products-grid"
        ).innerHTML = `
            <div class="loading">
                ❌ Unable to load products.
                <br><br>
                Make sure the Java server is running on port 8081.
            </div>
        `;

    }
}


// =========================================================
// DASHBOARD
// =========================================================

function updateDashboard() {

    const totalProducts =
        products.length;


    document.getElementById(
        "total-products"
    ).textContent =
        totalProducts;


    const alerts =
        products.filter(product =>
            Boolean(product.reorderAlert)
        );


    document.getElementById(
        "reorder-alerts"
    ).textContent =
        alerts.length;


    const catalogValue =
        products.reduce(
            (total, product) => {

                const price =
                    Number(product.price) || 0;

                const stock =
                    Number(
                        product.stockQuantity
                    ) || 0;

                return total + price * stock;

            },
            0
        );


    document.getElementById(
        "catalog-value"
    ).textContent =
        formatCurrency(catalogValue);


    renderAlerts();
}


// =========================================================
// CURRENCY
// =========================================================

function formatCurrency(value) {

    return "₹" +
        Number(value || 0).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );
}


// =========================================================
// PRODUCT CARDS
// =========================================================

function renderProducts() {

    const container =
        document.getElementById(
            "products-grid"
        );


    if (!container) {
        return;
    }


    const search =
        (
            document.getElementById(
                "product-search"
            )?.value || ""
        ).toLowerCase();


    const category =
        document.getElementById(
            "category-filter"
        )?.value || "all";


    const filtered =
        products.filter(product => {

            const name =
                String(
                    product.name || ""
                ).toLowerCase();


            const productCategory =
                String(
                    product.category || ""
                );


            const matchesSearch =
                name.includes(search);


            const matchesCategory =
                category === "all" ||
                productCategory === category;


            return (
                matchesSearch &&
                matchesCategory
            );

        });


    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="loading">
                No products found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        filtered.map(product => {

            const stock =
                Number(
                    product.stockQuantity
                ) || 0;


            const reorderLevel =
                Number(
                    product.reorderLevel
                ) || 0;


            const isLow =
                stock <= reorderLevel;


            return `
                <div class="product-card">

                    <div class="product-icon">
                        📦
                    </div>

                    <h3>
                        ${escapeHtml(product.name)}
                    </h3>

                    <div class="product-category">
                        ${escapeHtml(
                            product.category || "General"
                        )}
                    </div>

                    <div class="product-info">

                        <div>
                            <span>Price</span>

                            <strong>
                                ${formatCurrency(
                                    product.price
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Stock</span>

                            <strong class="${
                                isLow
                                    ? "stock-low"
                                    : "stock-good"
                            }">
                                ${stock}
                            </strong>
                        </div>

                    </div>

                </div>
            `;

        }).join("");
}


// =========================================================
// SEARCH
// =========================================================

document
    .getElementById("product-search")
    ?.addEventListener(
        "input",
        renderProducts
    );


document
    .getElementById("category-filter")
    ?.addEventListener(
        "change",
        renderProducts
    );


// =========================================================
// CATEGORY FILTER
// =========================================================

function createCategoryFilter() {

    const select =
        document.getElementById(
            "category-filter"
        );


    if (!select) {
        return;
    }


    const categories =
        [
            ...new Set(
                products.map(
                    product =>
                        product.category
                )
            )
        ]
        .filter(Boolean)
        .sort();


    select.innerHTML =
        `<option value="all">
            All Categories
        </option>`;


    categories.forEach(category => {

        const option =
            document.createElement(
                "option"
            );

        option.value = category;

        option.textContent = category;

        select.appendChild(option);

    });

}


// =========================================================
// ALERT LIST
// =========================================================

function renderAlerts() {

    const container =
        document.getElementById(
            "alert-list"
        );


    if (!container) {
        return;
    }


    const alerts =
        products.filter(product =>
            Boolean(product.reorderAlert)
        );


    if (alerts.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                ✅ No reorder alerts.
                Inventory looks good.
            </div>
        `;

        return;
    }


    container.innerHTML =
        alerts.map(product => {

            const stock =
                Number(
                    product.stockQuantity
                ) || 0;


            const reorder =
                Number(
                    product.reorderLevel
                ) || 0;


            return `
                <div class="alert-item">

                    <div class="alert-product">

                        <strong>
                            ${escapeHtml(
                                product.name
                            )}
                        </strong>

                        <span>
                            Stock: ${stock}
                            &nbsp; | &nbsp;
                            Reorder level: ${reorder}
                        </span>

                    </div>

                    <span class="alert-badge">
                        Reorder
                    </span>

                </div>
            `;

        }).join("");
}


// =========================================================
// CHARTS
// =========================================================

function createCharts() {

    if (
        typeof Chart === "undefined"
    ) {
        console.warn(
            "Chart.js is not available."
        );

        return;
    }


    createCategoryChart();

    createStockChart();
}


// =========================================================
// CATEGORY PIE CHART
// =========================================================

function createCategoryChart() {

    const canvas =
        document.getElementById(
            "categoryChart"
        );


    if (!canvas) {
        return;
    }


    const categoryCounts = {};


    products.forEach(product => {

        const category =
            product.category ||
            "Other";


        categoryCounts[category] =
            (
                categoryCounts[category] ||
                0
            ) + 1;

    });


    if (categoryChart) {
        categoryChart.destroy();
    }


    categoryChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels:
                        Object.keys(
                            categoryCounts
                        ),

                    datasets: [
                        {
                            data:
                                Object.values(
                                    categoryCounts
                                )
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            }
        );
}


// =========================================================
// STOCK CHART
// =========================================================

function createStockChart() {

    const canvas =
        document.getElementById(
            "stockChart"
        );


    if (!canvas) {
        return;
    }


    let goodStock = 0;

    let lowStock = 0;


    products.forEach(product => {

        const stock =
            Number(
                product.stockQuantity
            ) || 0;


        const reorder =
            Number(
                product.reorderLevel
            ) || 0;


        if (stock <= reorder) {
            lowStock++;
        }
        else {
            goodStock++;
        }

    });


    if (stockChart) {
        stockChart.destroy();
    }


    stockChart =
        new Chart(
            canvas,
            {
                type: "pie",

                data: {

                    labels: [
                        "Healthy Stock",
                        "Low Stock"
                    ],

                    datasets: [
                        {
                            data: [
                                goodStock,
                                lowStock
                            ]
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            }
        );
}


// =========================================================
// LOAD ORDERS
// =========================================================

async function loadOrders() {

    try {

        const data =
            await javaApi("/api/orders");

        orders =
            Array.isArray(data)
                ? data
                : data.orders || [];


        document.getElementById(
            "total-orders"
        ).textContent =
            orders.length;


        renderOrders();

    }
    catch (error) {

        console.error(
            "Order loading error:",
            error
        );

        document.getElementById(
            "total-orders"
        ).textContent = "0";

        document.getElementById(
            "orders-table"
        ).innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    Unable to load orders.
                </td>
            </tr>
        `;

    }
}


// =========================================================
// RENDER ORDERS
// =========================================================

function renderOrders() {

    const table =
        document.getElementById(
            "orders-table"
        );


    if (!table) {
        return;
    }


    if (orders.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    No orders found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        orders.map(order => {

            const id =
                order.id ??
                order.orderId ??
                "-";


            const customer =
                order.customerName ??
                order.customer ??
                "Customer";


            const items =
                order.itemCount ??
                order.items ??
                "-";


            const total =
                order.total ??
                order.totalAmount ??
                0;


            const status =
                order.status ??
                "Completed";


            return `
                <tr>

                    <td>
                        #${escapeHtml(String(id))}
                    </td>

                    <td>
                        ${escapeHtml(
                            String(customer)
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            String(items)
                        )}
                    </td>

                    <td>
                        ${formatCurrency(total)}
                    </td>

                    <td>
                        <span class="status-badge status-success">
                            ${escapeHtml(
                                String(status)
                            )}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
}


// =========================================================
// LOAD CUSTOMERS
// =========================================================

async function loadCustomers() {
    try {
        const orders = await javaApi("/api/orders");

        const customers = {};

        orders.forEach(order => {
            const name = order.customerName || "Unknown Customer";

            if (!customers[name]) {
                customers[name] = {
                    name: name,
                    orders: 0,
                    products: [],
                    totalQuantity: 0
                };
            }

            customers[name].orders++;
            customers[name].products.push(order.productName);
            customers[name].totalQuantity += Number(order.quantity || 0);
        });

        renderCustomers(Object.values(customers));
    } catch (error) {
        console.error("Customer loading failed:", error);

        const container = document.getElementById("customersList");

        if (container) {
            container.innerHTML =
                '<div class="empty-state">Unable to load customers.</div>';
        }
    }
}

function renderCustomers(customers = []) {
    const container =
        document.getElementById("customersList") ||
        document.getElementById("customersTable");

    if (!container) return;

    if (customers.length === 0) {
        container.innerHTML =
            '<div class="empty-state">No customers found.</div>';
        return;
    }

    container.innerHTML = customers.map(customer => {
        const repeatCustomer = customer.orders > 1;

        return `
            <div class="customer-card">
                <div class="customer-info">
                    <h3>${escapeHtml(customer.name)}</h3>
                    <p>Orders: <strong>${customer.orders}</strong></p>
                    <p>Products Purchased: <strong>${customer.totalQuantity}</strong></p>
                    <p>
                        ${repeatCustomer
                            ? '<span class="status-badge success">Repeat Customer</span>'
                            : '<span class="status-badge">New Customer</span>'}
                    </p>
                </div>

                <div class="customer-products">
                    <strong>Purchase History</strong>
                    <ul>
                        ${customer.products.map(product =>
                            `<li>${escapeHtml(product)}</li>`
                        ).join("")}
                    </ul>
                </div>
            </div>
        `;
    }).join("");
}
async function loadForecast() {

    const table =
        document.getElementById(
            "forecast-table"
        );


    if (!table) {
        return;
    }


    table.innerHTML = `
        <tr>
            <td colspan="5" class="empty-cell">
                Loading forecast...
            </td>
        </tr>
    `;


    try {

        const data =
            await pythonApi(
                "/forecast/run"
            );


        if (
            !data.success ||
            !Array.isArray(data.forecasts)
        ) {

            throw new Error(
                "Invalid forecast response"
            );

        }


        renderForecast(
            data.forecasts
        );

    }
    catch (error) {

        console.error(
            "Forecast error:",
            error
        );

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    ❌ Forecast service unavailable.
                    <br>
                    Make sure Python Flask is running on port 5000.
                </td>
            </tr>
        `;

    }
}


// =========================================================
// RENDER FORECAST
// =========================================================

function renderForecast(forecasts) {

    const table =
        document.getElementById(
            "forecast-table"
        );


    if (forecasts.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    No forecast data available.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        forecasts.map(item => {

            const stock =
                Number(
                    item.stock_quantity
                ) || 0;


            const reorder =
                Number(
                    item.reorder_level
                ) || 0;


            const forecast =
                Number(
                    item.forecast_quantity
                ) || 0;


            const alert =
                Boolean(item.alert);


            let statusText =
                "Healthy";


            let statusClass =
                "status-success";


            if (alert) {

                statusText =
                    "Reorder Required";

                statusClass =
                    "status-danger";

            }
            else if (
                stock <= reorder
            ) {

                statusText =
                    "Low Stock";

                statusClass =
                    "status-warning";

            }


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            item.name
                        )}
                    </td>

                    <td>
                        ${stock}
                    </td>

                    <td>
                        ${reorder}
                    </td>

                    <td>
                        <strong>
                            ${forecast}
                        </strong>
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
}


// =========================================================
// RUN FORECAST BUTTON
// =========================================================

document
    .getElementById("run-forecast")
    ?.addEventListener(
        "click",
        async function () {

            this.disabled = true;

            this.textContent =
                "⏳ Running...";


            try {

                await loadForecast();

            }
            finally {

                this.disabled = false;

                this.textContent =
                    "📈 Run Forecast";

            }

        }
    );


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================================
// INITIAL LOAD
// =========================================================

async function initializeApp() {

    console.log(
        "CatalogPro frontend starting..."
    );


    await loadProducts();

    await loadOrders();

    await loadCustomers();

    console.log(
        "CatalogPro frontend ready."
    );

}


initializeApp();