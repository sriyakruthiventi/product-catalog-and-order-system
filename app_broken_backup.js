const JAVA_API = "http://localhost:8081";
const PYTHON_API = "http://localhost:5000";

let products = [];
let orders = [];
let forecasts = [];

let salesChart = null;
let categoryChart = null;
let analyticsSalesChart = null;
let customerChart = null;

const customerEmails = {
    "Sirisha": "sirisha@gmail.com",
    "Sriya": "sriya@gmail.com",
    "Deepika": "deepika@gmail.com",
    "Gayatri": "gayatri@gmail.com"
};

const productRatings = {
    1: 4.5,
    2: 4.2,
    3: 4.8,
    4: 4.4,
    5: 4.1,
    6: 4.6,
    7: 4.3,
    8: 4.0
};

const productIcons = {
    "Accessories": "⌨️",
    "Electronics": "🔌",
    "Office": "💼",
    "Stationery": "📓"
};


/* =========================
   API FUNCTIONS
========================= */

async function javaApi(endpoint) {
    const response = await fetch(JAVA_API + endpoint);

    if (!response.ok) {
        throw new Error(
            `Java API error ${response.status}: ${endpoint}`
        );
    }

    return await response.json();
}


async function pythonApi(endpoint) {
    const response = await fetch(PYTHON_API + endpoint);

    if (!response.ok) {
        throw new Error(
            `Python API error ${response.status}: ${endpoint}`
        );
    }

    return await response.json();
}


/* =========================
   PAGE NAVIGATION
========================= */

function showPage(pageName) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    const selectedPage = document.getElementById(pageName);

    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");

        if (button.dataset.page === pageName) {
            button.classList.add("active");
        }
    });

    const titles = {
        dashboard: "Dashboard",
        products: "Products",
        orders: "Order History",
        customers: "Customers",
        analytics: "Analytics",
        forecast: "Demand Forecast"
    };

    document.getElementById("pageTitle").textContent =
        titles[pageName] || "Dashboard";

    if (pageName === "products") {
        renderProducts();
    }

    if (pageName === "orders") {
        renderOrders();
    }

    if (pageName === "customers") {
        renderCustomers();
    }

    if (pageName === "analytics") {
        createAnalyticsCharts();
    }

    if (pageName === "forecast") {
        loadForecast();
    }
}


document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {

    try {

        products = await javaApi("/api/products");

        if (!Array.isArray(products)) {
            products = [];
        }

        createCategoryFilter();
        renderProducts();
        updateDashboard();

    } catch (error) {

        console.error("Product loading failed:", error);

        const container =
            document.getElementById("productsGrid");

        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    Unable to load products.<br>
                    Make sure the Java server is running on port 8081.
                </div>
            `;
        }
    }
}


/* =========================
   NORMALIZE PRODUCT DATA
========================= */

function productValue(product, possibleNames, fallback = 0) {

    for (const name of possibleNames) {

        if (
            product[name] !== undefined &&
            product[name] !== null
        ) {
            return product[name];
        }
    }

    return fallback;
}


function getProductId(product) {
    return Number(
        productValue(product, ["id", "productId"], 0)
    );
}


function getProductName(product) {
    return String(
        productValue(product, ["name", "productName"], "Unknown Product")
    );
}


function getCategory(product) {
    return String(
        productValue(product, ["category"], "Other")
    );
}


function getPrice(product) {
    return Number(
        productValue(product, ["price", "unitPrice"], 0)
    );
}


function getStock(product) {
    return Number(
        productValue(
            product,
            ["stock_quantity", "stockQuantity", "stock"],
            0
        )
    );
}


function getReorderLevel(product) {
    return Number(
        productValue(
            product,
            ["reorder_level", "reorderLevel"],
            0
        )
    );
}


/* =========================
   CATEGORY FILTER
========================= */

function createCategoryFilter() {

    const filter =
        document.getElementById("categoryFilter");

    if (!filter) return;

    const categories = [
        ...new Set(products.map(product => getCategory(product)))
    ].sort();

    filter.innerHTML =
        `<option value="all">All Categories</option>` +
        categories
            .map(category =>
                `<option value="${escapeHtml(category)}">
                    ${escapeHtml(category)}
                </option>`
            )
            .join("");
}


/* =========================
   PRODUCT SALES ANALYSIS
========================= */

function getSalesData() {

    const sales = {};

    products.forEach(product => {

        const id = getProductId(product);

        sales[id] = {
            id,
            name: getProductName(product),
            category: getCategory(product),
            quantity: 0,
            revenue: 0
        };
    });

    orders.forEach(order => {

        const name =
            order.productName ||
            order.product_name ||
            "Unknown Product";

        const quantity =
            Number(order.quantity || 0);

        const product =
            products.find(
                item => getProductName(item) === name
            );

        if (product) {

            const id = getProductId(product);

            if (sales[id]) {

                sales[id].quantity += quantity;

                sales[id].revenue +=
                    quantity * getPrice(product);
            }

        } else {

            const key = "unknown-" + name;

            if (!sales[key]) {
                sales[key] = {
                    id: key,
                    name,
                    category: "Other",
                    quantity: 0,
                    revenue: 0
                };
            }

            sales[key].quantity += quantity;
        }
    });

    return Object.values(sales);
}


/* =========================
   RENDER PRODUCTS
========================= */

function renderProducts() {

    const container =
        document.getElementById("productsGrid");

    if (!container) return;

    const search =
        (
            document.getElementById("productSearch")?.value ||
            ""
        ).toLowerCase();

    const category =
        document.getElementById("categoryFilter")?.value ||
        "all";

    const salesData = getSalesData();

    const filtered =
        products.filter(product => {

            const name =
                getProductName(product).toLowerCase();

            const productCategory =
                getCategory(product);

            const matchesSearch =
                name.includes(search);

            const matchesCategory =
                category === "all" ||
                productCategory === category;

            return matchesSearch && matchesCategory;
        });


    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No products found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        filtered.map(product => {

            const id = getProductId(product);
            const name = getProductName(product);
            const categoryName = getCategory(product);
            const price = getPrice(product);
            const stock = getStock(product);
            const reorder = getReorderLevel(product);
            const rating = productRatings[id] || 4.0;

            const sale =
                salesData.find(item => item.id === id);

            const sold =
                sale ? sale.quantity : 0;

            const icon =
                productIcons[categoryName] || "📦";

            const stockClass =
                stock <= reorder
                    ? "stock-low"
                    : "stock-good";

            return `
                <div class="product-card">

                    <div class="product-image">
                        ${icon}
                    </div>

                    <h3>
                        ${escapeHtml(name)}
                    </h3>

                    <div class="category">
                        ${escapeHtml(categoryName)}
                    </div>

                    <div class="price">
                        ₹${price.toLocaleString("en-IN")}
                    </div>

                    <div class="rating">
                        ⭐ ${rating.toFixed(1)} / 5
                    </div>

                    <div class="product-info">
                        <span>Stock</span>
                        <strong class="${stockClass}">
                            ${stock}
                        </strong>
                    </div>

                    <div class="product-info">
                        <span>Reorder Level</span>
                        <strong>
                            ${reorder}
                        </strong>
                    </div>

                    <div class="product-info">
                        <span>Units Sold</span>
                        <strong>
                            ${sold}
                        </strong>
                    </div>

                    <button
                        class="details-btn"
                        onclick="showProductDetails(${id})"
                    >
                        View Details
                    </button>

                </div>
            `;

        }).join("");
}


/* =========================
   PRODUCT DETAILS
========================= */

function showProductDetails(id) {

    const product =
        products.find(item => getProductId(item) === id);

    if (!product) return;

    const name = getProductName(product);
    const category = getCategory(product);
    const price = getPrice(product);
    const stock = getStock(product);
    const reorder = getReorderLevel(product);
    const rating = productRatings[id] || 4.0;

    const sale =
        getSalesData().find(item => item.id === id);

    const unitsSold =
        sale ? sale.quantity : 0;

    const revenue =
        sale ? sale.revenue : 0;

    const history =
        orders.filter(order =>
            (order.productName || "") === name
        );

    const modal =
        document.getElementById("productModal");

    const details =
        document.getElementById("productDetails");

    details.innerHTML = `

        <h2>${escapeHtml(name)}</h2>

        <p class="category">
            ${escapeHtml(category)}
        </p>

        <hr style="margin:18px 0;border:none;border-top:1px solid #e5e7eb;">

        <div class="customer-details">

            <div class="customer-detail">
                <span>Price</span>
                <strong>
                    ₹${price.toLocaleString("en-IN")}
                </strong>
            </div>

            <div class="customer-detail">
                <span>Current Stock</span>
                <strong>
                    ${stock}
                </strong>
            </div>

            <div class="customer-detail">
                <span>Reorder Level</span>
                <strong>
                    ${reorder}
                </strong>
            </div>

            <div class="customer-detail">
                <span>Units Sold</span>
                <strong>
                    ${unitsSold}
                </strong>
            </div>

            <div class="customer-detail">
                <span>Total Revenue</span>
                <strong>
                    ₹${revenue.toLocaleString("en-IN")}
                </strong>
            </div>

            <div class="customer-detail">
                <span>Rating</span>
                <strong>
                    ⭐ ${rating.toFixed(1)}
                </strong>
            </div>

        </div>

        <h3 style="margin-top:25px;">
            Purchase History
        </h3>

        ${
            history.length
            ?
            `
            <div style="margin-top:12px;">
                ${history.map(order => `
                    <div class="ranking-item">
                        <div class="rank">
                            #${order.id}
                        </div>

                        <div class="ranking-info">
                            <strong>
                                ${escapeHtml(
                                    order.customerName || "Customer"
                                )}
                            </strong>

                            <span>
                                Quantity: ${order.quantity}
                                · ${escapeHtml(
                                    order.orderDate || ""
                                )}
                            </span>
                        </div>
                    </div>
                `).join("")}
            </div>
            `
            :
            `<div class="empty-state">
                No purchase history.
            </div>`
        }

    `;

    modal.classList.add("show");
}


function closeProductModal() {

    const modal =
        document.getElementById("productModal");

    if (modal) {
        modal.classList.remove("show");
    }
}


window.addEventListener("click", event => {

    const modal =
        document.getElementById("productModal");

    if (event.target === modal) {
        closeProductModal();
    }
});


/* =========================
   LOAD ORDERS
========================= */

async function loadOrders() {

    try {

        orders =
            await javaApi("/api/orders");

        if (!Array.isArray(orders)) {
            orders = [];
        }

        renderOrders();
        updateDashboard();
        renderCustomers();

    } catch (error) {

        console.error("Order loading failed:", error);

        orders = [];

        const table =
            document.getElementById("ordersTable");

        if (table) {

            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        Unable to load orders.
                    </td>
                </tr>
            `;
        }
    }
}


/* =========================
   RENDER ORDERS
========================= */

function renderOrders() {

    const table =
        document.getElementById("ordersTable");

    if (!table) return;

    const search =
        (
            document.getElementById("orderSearch")?.value ||
            ""
        ).toLowerCase();

    const filtered =
        orders.filter(order => {

            const customer =
                String(
                    order.customerName || ""
                ).toLowerCase();

            const product =
                String(
                    order.productName || ""
                ).toLowerCase();

            const date =
                String(
                    order.orderDate || ""
                ).toLowerCase();

            return (
                customer.includes(search) ||
                product.includes(search) ||
                date.includes(search) ||
                String(order.id).includes(search)
            );
        });


    if (filtered.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No orders found.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        filtered.map(order => `

            <tr>

                <td>
                    <strong>
                        #${order.id}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        order.customerName || "Unknown"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        order.productName || "Unknown"
                    )}
                </td>

                <td>
                    ${order.quantity || 0}
                </td>

                <td>
                    ${escapeHtml(
                        order.orderDate || ""
                    )}
                </td>

            </tr>

        `).join("");
}


/* =========================
   CUSTOMER ANALYSIS
========================= */

function buildCustomers() {

    const map = {};

    orders.forEach(order => {

        const name =
            order.customerName || "Unknown Customer";

        if (!map[name]) {

            map[name] = {
                name,
                email:
                    customerEmails[name] ||
                    `${name.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
                orders: 0,
                totalQuantity: 0,
                totalSpent: 0,
                products: [],
                lastOrder: ""
            };
        }

        const customer = map[name];

        customer.orders++;

        const quantity =
            Number(order.quantity || 0);

        customer.totalQuantity += quantity;

        const product =
            products.find(
                item =>
                    getProductName(item) ===
                    order.productName
            );

        if (product) {
            customer.totalSpent +=
                quantity * getPrice(product);
        }

        if (order.productName) {
            customer.products.push(
                order.productName
            );
        }

        if (
            !customer.lastOrder ||
            String(order.orderDate || "") >
            String(customer.lastOrder)
        ) {
            customer.lastOrder =
                order.orderDate || "";
        }
    });

    return Object.values(map);
}


/* =========================
   RENDER CUSTOMERS
========================= */

function renderCustomers() {

    const container =
        document.getElementById("customersList");

    if (!container) return;

    const customers =
        buildCustomers();

    document.getElementById("customerCount").textContent =
        customers.length;

    document.getElementById("repeatCustomers").textContent =
        customers.filter(customer =>
            customer.orders > 1
        ).length;


    if (customers.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No customers found.
            </div>
        `;

        return;
    }


    container.innerHTML =
        customers.map(customer => {

            const initial =
                customer.name
                    .charAt(0)
                    .toUpperCase();

            const uniqueProducts =
                [...new Set(customer.products)];

            const repeat =
                customer.orders > 1;

            return `

                <div class="customer-card">

                    <div class="customer-top">

                        <div class="customer-avatar">
                            ${initial}
                        </div>

                        <div>
                            <h3>
                                ${escapeHtml(
                                    customer.name
                                )}
                            </h3>

                            <div class="customer-email">
                                ${escapeHtml(
                                    customer.email
                                )}
                            </div>
                        </div>

                    </div>


                    <div class="customer-details">

                        <div class="customer-detail">
                            <span>Orders</span>
                            <strong>
                                ${customer.orders}
                            </strong>
                        </div>

                        <div class="customer-detail">
                            <span>Products</span>
                            <strong>
                                ${uniqueProducts.length}
                            </strong>
                        </div>

                        <div class="customer-detail">
                            <span>Quantity</span>
                            <strong>
                                ${customer.totalQuantity}
                            </strong>
                        </div>

                        <div class="customer-detail">
                            <span>Total Spent</span>
                            <strong>
                                ₹${customer.totalSpent.toLocaleString("en-IN")}
                            </strong>
                        </div>

                        <div class="customer-detail">
                            <span>Last Order</span>
                            <strong>
                                ${escapeHtml(
                                    customer.lastOrder || "-"
                                )}
                            </strong>
                        </div>

                        <div class="customer-detail">
                            <span>Type</span>
                            <strong>
                                ${repeat ? "Repeat" : "New"}
                            </strong>
                        </div>

                    </div>


                    <div class="status-badge ${
                        repeat ? "success" : ""
                    }">

                        ${
                            repeat
                            ? "🔁 Repeat Customer"
                            : "👤 New Customer"
                        }

                    </div>


                    <div style="margin-top:16px;">

                        <strong>
                            Purchase History
                        </strong>

                        <ul style="
                            margin-top:8px;
                            padding-left:20px;
                            color:#64748b;
                            font-size:13px;
                        ">

                            ${
                                uniqueProducts.map(
                                    product =>
                                        `<li>
                                            ${escapeHtml(product)}
                                        </li>`
                                ).join("")
                            }

                        </ul>

                    </div>

                </div>

            `;

        }).join("");
}


/* =========================
   DASHBOARD
========================= */

function updateDashboard() {

    const salesData =
        getSalesData();

    const customers =
        buildCustomers();

    const totalSales =
        salesData.reduce(
            (sum, item) =>
                sum + item.revenue,
            0
        );

    const lowStock =
        products.filter(product =>
            getStock(product) <=
            getReorderLevel(product)
        );


    document.getElementById("totalProducts").textContent =
        products.length;

    document.getElementById("totalCustomers").textContent =
        customers.length;

    document.getElementById("totalOrders").textContent =
        orders.length;

    document.getElementById("totalSales").textContent =
        "₹" + totalSales.toLocaleString("en-IN");


    renderRecentOrders();
    renderAlerts(lowStock);
    createCharts();
}


/* =========================
   RECENT ORDERS
========================= */

function renderRecentOrders() {

    const container =
        document.getElementById("recentOrders");

    if (!container) return;

    const recent =
        orders.slice(0, 6);


    if (recent.length === 0) {

        container.innerHTML =
            `<div class="empty-state">
                No orders found.
            </div>`;

        return;
    }


    container.innerHTML =
        recent.map(order => `

            <div class="ranking-item">

                <div class="rank">
                    #${order.id}
                </div>

                <div class="ranking-info">

                    <strong>
                        ${escapeHtml(
                            order.customerName || "Customer"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            order.productName || "Product"
                        )}
                        · Qty ${order.quantity || 0}
                    </span>

                </div>

            </div>

        `).join("");
}


/* =========================
   LOW STOCK ALERTS
========================= */

function renderAlerts(lowStock) {

    const container =
        document.getElementById("dashboardAlerts");

    if (!container) return;


    if (lowStock.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                ✅ No low-stock products.
            </div>
        `;

        return;
    }


    container.innerHTML =
        lowStock.map(product => `

            <div class="alert-item">

                <div>
                    <strong>
                        ${escapeHtml(
                            getProductName(product)
                        )}
                    </strong>

                    <div>
                        Stock:
                        ${getStock(product)}
                    </div>
                </div>

                <span>
                    Reorder:
                    ${getReorderLevel(product)}
                </span>

            </div>

        `).join("");
}


/* =========================
   CHARTS
========================= */

function destroyChart(chart) {

    if (chart) {
        chart.destroy();
    }

    return null;
}


function createCharts() {

    if (typeof Chart === "undefined") {
        return;
    }

    const salesData =
        getSalesData()
            .sort(
                (a, b) =>
                    b.quantity - a.quantity
            );

    const labels =
        salesData.map(item => item.name);

    const quantities =
        salesData.map(item => item.quantity);


    salesChart =
        destroyChart(salesChart);

    const salesCanvas =
        document.getElementById("salesChart");

    if (salesCanvas) {

        salesChart =
            new Chart(
                salesCanvas,
                {
                    type: "bar",

                    data: {
                        labels,
                        datasets: [{
                            label: "Units Sold",
                            data: quantities
                        }]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );
    }


    const categoryTotals = {};

    salesData.forEach(item => {

        categoryTotals[item.category] =
            (
                categoryTotals[item.category] ||
                0
            ) + item.quantity;
    });


    categoryChart =
        destroyChart(categoryChart);

    const categoryCanvas =
        document.getElementById("categoryChart");

    if (categoryCanvas) {

        categoryChart =
            new Chart(
                categoryCanvas,
                {
                    type: "doughnut",

                    data: {
                        labels:
                            Object.keys(categoryTotals),

                        datasets: [{
                            data:
                                Object.values(
                                    categoryTotals
                                )
                        }]
                    },

                    options: {
                        responsive: true
                    }
                }
            );
    }
}


/* =========================
   ANALYTICS CHARTS
========================= */

function createAnalyticsCharts() {

    if (typeof Chart === "undefined") {
        return;
    }


    const salesData =
        getSalesData()
            .sort(
                (a, b) =>
                    b.quantity - a.quantity
            );


    analyticsSalesChart =
        destroyChart(
            analyticsSalesChart
        );


    const salesCanvas =
        document.getElementById(
            "analyticsSalesChart"
        );


    if (salesCanvas) {

        analyticsSalesChart =
            new Chart(
                salesCanvas,
                {
                    type: "bar",

                    data: {
                        labels:
                            salesData.map(
                                item => item.name
                            ),

                        datasets: [{
                            label:
                                "Units Sold",

                            data:
                                salesData.map(
                                    item =>
                                        item.quantity
                                )
                        }]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: "y"
                    }
                }
            );
    }


    const customers =
        buildCustomers();


    customerChart =
        destroyChart(
            customerChart
        );


    const customerCanvas =
        document.getElementById(
            "customerChart"
        );


    if (customerCanvas) {

        customerChart =
            new Chart(
                customerCanvas,
                {
                    type: "bar",

                    data: {
                        labels:
                            customers.map(
                                customer =>
                                    customer.name
                            ),

                        datasets: [{
                            label:
                                "Orders",

                            data:
                                customers.map(
                                    customer =>
                                        customer.orders
                                )
                        }]
                    },

                    options: {
                        responsive: true
                    }
                }
            );
    }


    renderRanking(salesData);
}


/* =========================
   SALES RANKING
========================= */

function renderRanking(salesData) {

    const container =
        document.getElementById(
            "rankingList"
        );

    if (!container) return;


    if (salesData.length === 0) {

        container.innerHTML =
            `<div class="empty-state">
                No sales data.
            </div>`;

        return;
    }


    const highest =
        salesData[0];

    const lowest =
        salesData[salesData.length - 1];


    container.innerHTML = `

        <div class="ranking-item">

            <div class="rank">
                1
            </div>

            <div class="ranking-info">

                <strong>
                    Most Sold: ${escapeHtml(
                        highest.name
                    )}
                </strong>

                <span>
                    ${highest.quantity}
                    units sold
                </span>

            </div>

        </div>


        <div class="ranking-item">

            <div class="rank">
                ↓
            </div>

            <div class="ranking-info">

                <strong>
                    Least Sold: ${escapeHtml(
                        lowest.name
                    )}
                </strong>

                <span>
                    ${lowest.quantity}
                    units sold
                </span>

            </div>

        </div>


        ${
            salesData.slice(0, 8)
                .map(
                    (item, index) => `

                    <div class="ranking-item">

                        <div class="rank">
                            ${index + 1}
                        </div>

                        <div class="ranking-info">

                            <strong>
                                ${escapeHtml(
                                    item.name
                                )}
                            </strong>

                            <span>
                                ${item.quantity}
                                units ·
                                ₹${item.revenue.toLocaleString("en-IN")}
                                revenue
                            </span>

                        </div>

                    </div>

                `
                )
                .join("")
        }

    `;
}


/* =========================
   FORECAST
========================= */

async function loadForecast() {

    try {

        const result =
            await pythonApi(
                "/forecast/run"
            );

        if (
            result &&
            Array.isArray(result.forecasts)
        ) {

            forecasts =
                result.forecasts;

        } else {

            forecasts = [];

        }

        renderForecast();

    } catch (error) {

        console.error(
            "Forecast loading failed:",
            error
        );

        const container =
            document.getElementById(
                "forecastList"
            );

        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    Unable to connect to Python
                    forecast service.<br><br>
                    Make sure port 5000 is running.
                </div>
            `;
        }
    }
}


async function runForecast() {

    const button =
        document.querySelector(
            ".primary-btn"
        );

    if (button) {
        button.textContent =
            "Generating...";
        button.disabled = true;
    }

    await loadForecast();

    if (button) {
        button.textContent =
            "Generate Forecast";
        button.disabled = false;
    }
}


function renderForecast() {

    const container =
        document.getElementById(
            "forecastList"
        );

    if (!container) return;


    if (forecasts.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No forecast data available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        forecasts.map(item => {

            const alert =
                Boolean(item.alert);

            return `

                <div class="forecast-card">

                    <h3>
                        ${escapeHtml(
                            item.name
                        )}
                    </h3>

                    <div class="forecast-number">
                        ${item.forecast_quantity}
                    </div>

                    <div>
                        Predicted Demand
                    </div>


                    <div class="forecast-row">
                        <span>
                            Current Stock
                        </span>

                        <strong>
                            ${item.stock_quantity}
                        </strong>
                    </div>


                    <div class="forecast-row">
                        <span>
                            Reorder Level
                        </span>

                        <strong>
                            ${item.reorder_level}
                        </strong>
                    </div>


                    <div class="forecast-row">
                        <span>
                            Status
                        </span>

                        <strong class="${
                            alert
                            ? "alert"
                            : "safe"
                        }">

                            ${
                                alert
                                ? "⚠ Reorder Required"
                                : "✓ Stock OK"
                            }

                        </strong>
                    </div>

                </div>

            `;

        }).join("");
}


/* =========================
   REFRESH
========================= */

async function refreshAll() {

    await Promise.all([
        loadProducts(),
        loadOrders()
    ]);

    await loadForecast();

    updateDashboard();
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================
   START APPLICATION
========================= */

async function initializeApp() {

    console.log(
        "StorePro dashboard starting..."
    );

    try {

        await Promise.all([
            loadProducts(),
            loadOrders()
        ]);

        await loadForecast();

        updateDashboard();

        console.log(
            "StorePro dashboard loaded successfully."
        );

    } catch (error) {

        console.error(
            "Application initialization failed:",
            error
        );
    }
}


document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);
