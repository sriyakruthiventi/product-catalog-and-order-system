let products = [];

let selectedProductId = null;


const $ = (id) => {

    return document.getElementById(id);

};


/* API FUNCTION */

async function api(url, options = {}) {

    const response =
        await fetch(url, options);

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.error ||
            "Request failed"
        );

    }

    return data;
}


/* MESSAGE */

function showMessage(text) {

    $("message").textContent = text;

    $("message")
        .classList
        .remove("hidden");

    setTimeout(() => {

        $("message")
            .classList
            .add("hidden");

    }, 3000);

}


/* DISPLAY PRODUCTS */

function renderProducts(list) {

    $("productGrid").innerHTML =
        list.map(p => `

        <article class="card">

            <span class="category">
                ${p.category}
            </span>

            <h3>
                ${p.name}
            </h3>

            <div class="price">
                ₹${Number(p.price).toFixed(2)}
            </div>


            <div class="meta">

                <div>
                    <b>Stock</b>
                    <br>
                    ${p.stockQuantity}
                </div>

                <div>
                    <b>Forecast</b>
                    <br>
                    ${p.forecast ?? "—"}
                </div>

            </div>


            <p
                class="${p.reorderAlert
                    ? "alert"
                    : "ok"}">

                ${
                    p.reorderAlert
                    ? "⚠ Reorder recommended"
                    : "✓ Stock level okay"
                }

            </p>


            <button
                onclick="openOrder(${p.id})">

                Order Now

            </button>

        </article>

    `).join("");


    $("productCount").textContent =
        list.length;


    $("alertCount").textContent =
        list.filter(
            p => p.reorderAlert
        ).length;

}


/* CATEGORIES */

function fillCategories() {

    const categories =
        [
            ...new Set(
                products.map(
                    p => p.category
                )
            )
        ].sort();


    $("categoryFilter").innerHTML =

        `<option value="">
            All Categories
        </option>` +

        categories
            .map(
                c =>
                `<option value="${c}">
                    ${c}
                </option>`
            )
            .join("");

}


/* LOAD PRODUCTS */

async function loadProducts() {

    products =
        await api("/api/products");

    fillCategories();

    renderProducts(products);

}


/* SEARCH */

function filterProducts() {

    const q =
        $("searchInput")
        .value
        .toLowerCase();


    const category =
        $("categoryFilter")
        .value;


    const list =
        products.filter(p =>

            (
                p.name
                    .toLowerCase()
                    .includes(q)

                ||

                p.category
                    .toLowerCase()
                    .includes(q)
            )

            &&

            (
                !category ||
                p.category === category
            )

        );


    renderProducts(list);

}


/* OPEN ORDER WINDOW */

function openOrder(id) {

    selectedProductId = id;


    const product =
        products.find(
            x => x.id === id
        );


    $("selectedProduct").textContent =
        `${product.name} — ₹${product.price.toFixed(2)}`;


    $("orderModal")
        .classList
        .remove("hidden");

}


/* CLOSE MODAL */

$("closeModal").onclick = () => {

    $("orderModal")
        .classList
        .add("hidden");

};


/* PLACE ORDER */

$("orderForm").onsubmit =
    async (event) => {

        event.preventDefault();


        try {

            await api(
                "/api/orders",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        customerName:
                            $("customerName")
                            .value,

                        email:
                            $("email")
                            .value,

                        productId:
                            selectedProductId,

                        quantity:
                            Number(
                                $("quantity")
                                .value
                            )

                    })

                }
            );


            $("orderModal")
                .classList
                .add("hidden");


            $("orderForm").reset();


            showMessage(
                "Order placed successfully."
            );


            await loadProducts();

            await loadOrders();


        }

        catch (error) {

            alert(error.message);

        }

    };


/* LOAD ORDERS */

async function loadOrders() {

    const orders =
        await api("/api/orders");


    $("ordersTable").innerHTML =

        orders.length

        ?

        `

        <table>

            <thead>

                <tr>

                    <th>ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Date</th>

                </tr>

            </thead>


            <tbody>

                ${
                    orders.map(o => `

                        <tr>

                            <td>
                                #${o.id}
                            </td>

                            <td>
                                ${o.customerName}
                            </td>

                            <td>
                                ${o.productName}
                            </td>

                            <td>
                                ${o.quantity}
                            </td>

                            <td>
                                ${o.orderDate}
                            </td>

                        </tr>

                    `).join("")
                }

            </tbody>

        </table>

        `

        :

        "<p style='padding:16px'>No orders yet.</p>";

}


/* SEARCH EVENT */

$("searchInput")
    .addEventListener(
        "input",
        filterProducts
    );


/* CATEGORY EVENT */

$("categoryFilter")
    .addEventListener(
        "change",
        filterProducts
    );


/* REFRESH */

$("refreshBtn").onclick =
    loadProducts;


/* ORDERS */

$("ordersBtn").onclick =
    loadOrders;


/* FORECAST */

$("forecastBtn").onclick =
    async () => {

        try {

            await api(
                "/api/forecast/run",
                {
                    method: "POST"
                }
            );


            await loadProducts();


            showMessage(
                "Demand forecast updated."
            );

        }

        catch (error) {

            alert(
                "Start the Python forecast service first."
            );

        }

    };


/* INITIAL LOAD */

loadProducts()
    .catch(
        error =>
            alert(error.message)
    );


loadOrders()
    .catch(
        () => {}
    );