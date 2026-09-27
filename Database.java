package com.store;

import java.sql.*;

import java.time.LocalDateTime;

import java.util.*;


public class Database {


    private final String url;


    public Database(
            String dbPath) {

        url =
            "jdbc:sqlite:"
            + dbPath;
    }


    private Connection connect()
            throws SQLException {

        Connection connection =
            DriverManager
                .getConnection(url);


        try (
            Statement statement =
                connection.createStatement()
        ) {

            statement.execute(
                "PRAGMA foreign_keys = ON"
            );
        }


        return connection;
    }


    /* DATABASE TABLE CREATION */

    public void initialize()
            throws SQLException {


        try (

            Connection connection =
                connect();

            Statement statement =
                connection.createStatement()

        ) {


            /* PRODUCTS */

            statement.executeUpdate(

                """
                CREATE TABLE IF NOT EXISTS products (

                    id INTEGER
                    PRIMARY KEY
                    AUTOINCREMENT,

                    name TEXT
                    NOT NULL
                    UNIQUE,

                    category TEXT
                    NOT NULL,

                    price REAL
                    NOT NULL,

                    stock_quantity INTEGER
                    NOT NULL,

                    reorder_level INTEGER
                    NOT NULL

                )
                """
            );


            /* CUSTOMERS */

            statement.executeUpdate(

                """
                CREATE TABLE IF NOT EXISTS customers (

                    id INTEGER
                    PRIMARY KEY
                    AUTOINCREMENT,

                    name TEXT
                    NOT NULL,

                    email TEXT
                    NOT NULL
                    UNIQUE

                )
                """
            );


            /* ORDERS */

            statement.executeUpdate(

                """
                CREATE TABLE IF NOT EXISTS orders (

                    id INTEGER
                    PRIMARY KEY
                    AUTOINCREMENT,

                    customer_id INTEGER
                    NOT NULL,

                    order_date TEXT
                    NOT NULL,

                    FOREIGN KEY
                    (customer_id)
                    REFERENCES customers(id)

                )
                """
            );


            /* ORDER ITEMS */

            statement.executeUpdate(

                """
                CREATE TABLE IF NOT EXISTS order_items (

                    id INTEGER
                    PRIMARY KEY
                    AUTOINCREMENT,

                    order_id INTEGER
                    NOT NULL,

                    product_id INTEGER
                    NOT NULL,

                    quantity INTEGER
                    NOT NULL,

                    unit_price REAL
                    NOT NULL,

                    FOREIGN KEY
                    (order_id)
                    REFERENCES orders(id),

                    FOREIGN KEY
                    (product_id)
                    REFERENCES products(id)

                )
                """
            );


            /* DEMAND FORECAST */

            statement.executeUpdate(

                """
                CREATE TABLE IF NOT EXISTS demand_forecast (

                    product_id INTEGER
                    PRIMARY KEY,

                    forecast_quantity REAL
                    NOT NULL,

                    generated_at TEXT
                    NOT NULL,

                    alert INTEGER
                    NOT NULL DEFAULT 0,

                    FOREIGN KEY
                    (product_id)
                    REFERENCES products(id)

                )
                """
            );
        }


        seedProducts();
    }


    /* SAMPLE PRODUCTS */

    private void seedProducts()
            throws SQLException {


        try (

            Connection connection =
                connect();

            PreparedStatement statement =
                connection.prepareStatement(

                    """
                    INSERT OR IGNORE INTO products
                    (
                        name,
                        category,
                        price,
                        stock_quantity,
                        reorder_level
                    )

                    VALUES (?, ?, ?, ?, ?)
                    """
                )

        ) {


            Object[][] products = {

                {
                    "Wireless Keyboard",
                    "Accessories",
                    1299,
                    18,
                    8
                },

                {
                    "USB-C Hub",
                    "Accessories",
                    899,
                    7,
                    8
                },

                {
                    "Mechanical Keyboard",
                    "Accessories",
                    3499,
                    5,
                    6
                },

                {
                    "Wireless Mouse",
                    "Accessories",
                    999,
                    24,
                    10
                },

                {
                    "Laptop Stand",
                    "Office",
                    1499,
                    11,
                    6
                },

                {
                    "Web Camera",
                    "Electronics",
                    2199,
                    9,
                    5
                },

                {
                    "Bluetooth Speaker",
                    "Electronics",
                    1799,
                    13,
                    7
                },

                {
                    "Notebook Pack",
                    "Stationery",
                    299,
                    30,
                    10
                }

            };


            for (
                Object[] product :
                products
            ) {


                statement.setString(
                    1,
                    (String) product[0]
                );


                statement.setString(
                    2,
                    (String) product[1]
                );


                statement.setDouble(
                    3,
                    ((Number)
                        product[2])
                        .doubleValue()
                );


                statement.setInt(
                    4,
                    ((Number)
                        product[3])
                        .intValue()
                );


                statement.setInt(
                    5,
                    ((Number)
                        product[4])
                        .intValue()
                );


                statement.addBatch();
            }


            statement.executeBatch();
        }
    }


    /* GET PRODUCTS */

    public List<Product>
    getProducts(
        String query
    )
    throws SQLException {


        List<Product> list =
            new ArrayList<>();


        String sql =

            """
            SELECT
                p.*,

                COALESCE(
                    f.forecast_quantity,
                    0
                ) AS forecast,

                COALESCE(
                    f.alert,
                    0
                ) AS alert

            FROM products p

            LEFT JOIN demand_forecast f

            ON p.id =
               f.product_id

            WHERE
                lower(p.name)
                LIKE ?

            OR

                lower(p.category)
                LIKE ?

            ORDER BY p.id
            """;


        String search =

            "%" +

            (
                query == null
                ? ""
                : query.toLowerCase()
            )

            + "%";


        try (

            Connection connection =
                connect();

            PreparedStatement statement =
                connection.prepareStatement(sql)

        ) {


            statement.setString(
                1,
                search
            );


            statement.setString(
                2,
                search
            );


            ResultSet result =
                statement.executeQuery();


            while (
                result.next()
            ) {


                Product product =
                    new Product(

                        result.getInt(
                            "id"
                        ),

                        result.getString(
                            "name"
                        ),

                        result.getString(
                            "category"
                        ),

                        result.getDouble(
                            "price"
                        ),

                        result.getInt(
                            "stock_quantity"
                        ),

                        result.getInt(
                            "reorder_level"
                        )

                    );


                product.forecast =
                    result.getDouble(
                        "forecast"
                    );


                product.reorderAlert =
                    result.getInt(
                        "alert"
                    ) == 1;


                list.add(product);
            }
        }


        return list;
    }


    /* PLACE ORDER */

    public int placeOrder(

        String customerName,

        String email,

        int productId,

        int quantity

    )
    throws SQLException {


        if (quantity <= 0)

            throw new
                IllegalArgumentException(
                    "Quantity must be positive."
                );


        try (
            Connection connection =
                connect()
        ) {


            connection
                .setAutoCommit(false);


            try {


                int stock;

                double price;


                /* GET PRODUCT */

                try (

                    PreparedStatement statement =
                        connection.prepareStatement(

                            """
                            SELECT
                                stock_quantity,
                                price

                            FROM products

                            WHERE id = ?
                            """
                        )

                ) {


                    statement.setInt(
                        1,
                        productId
                    );


                    ResultSet result =
                        statement.executeQuery();


                    if (
                        !result.next()
                    ) {

                        throw new
                            IllegalArgumentException(
                                "Product not found."
                            );
                    }


                    stock =
                        result.getInt(
                            "stock_quantity"
                        );


                    price =
                        result.getDouble(
                            "price"
                        );
                }


                if (
                    quantity > stock
                ) {

                    throw new
                        IllegalArgumentException(
                            "Not enough stock."
                        );
                }


                /* CUSTOMER */

                int customerId = 0;


                try (

                    PreparedStatement statement =
                        connection.prepareStatement(

                            """
                            INSERT INTO customers
                            (
                                name,
                                email
                            )

                            VALUES (?, ?)

                            ON CONFLICT(email)

                            DO UPDATE SET
                                name =
                                excluded.name
                            """,

                            Statement
                                .RETURN_GENERATED_KEYS

                        )

                ) {


                    statement.setString(
                        1,
                        customerName
                    );


                    statement.setString(
                        2,
                        email
                    );


                    statement.executeUpdate();


                    ResultSet keys =
                        statement
                            .getGeneratedKeys();


                    if (
                        keys.next()
                    ) {

                        customerId =
                            keys.getInt(1);
                    }
                }


                if (
                    customerId == 0
                ) {


                    try (

                        PreparedStatement statement =
                            connection.prepareStatement(

                                """
                                SELECT id
                                FROM customers
                                WHERE email = ?
                                """
                            )

                    ) {


                        statement.setString(
                            1,
                            email
                        );


                        ResultSet result =
                            statement
                                .executeQuery();


                        result.next();


                        customerId =
                            result.getInt(
                                1
                            );
                    }
                }


                /* CREATE ORDER */

                int orderId;


                try (

                    PreparedStatement statement =
                        connection.prepareStatement(

                            """
                            INSERT INTO orders
                            (
                                customer_id,
                                order_date
                            )

                            VALUES (?, ?)
                            """,

                            Statement
                                .RETURN_GENERATED_KEYS
                        )

                ) {


                    statement.setInt(
                        1,
                        customerId
                    );


                    statement.setString(
                        2,
                        LocalDateTime
                            .now()
                            .toString()
                    );


                    statement.executeUpdate();


                    ResultSet keys =
                        statement
                            .getGeneratedKeys();


                    if (
                        !keys.next()
                    ) {

                        throw new SQLException(
                            "Could not create order."
                        );
                    }


                    orderId =
                        keys.getInt(1);
                }


                /* ORDER ITEM */

                try (

                    PreparedStatement statement =
                        connection.prepareStatement(

                            """
                            INSERT INTO order_items

                            (
                                order_id,
                                product_id,
                                quantity,
                                unit_price
                            )

                            VALUES (?, ?, ?, ?)
                            """
                        )

                ) {


                    statement.setInt(
                        1,
                        orderId
                    );


                    statement.setInt(
                        2,
                        productId
                    );


                    statement.setInt(
                        3,
                        quantity
                    );


                    statement.setDouble(
                        4,
                        price
                    );


                    statement.executeUpdate();
                }


                /* UPDATE STOCK */

                try (

                    PreparedStatement statement =
                        connection.prepareStatement(

                            """
                            UPDATE products

                            SET stock_quantity =
                                stock_quantity - ?

                            WHERE id = ?
                            """
                        )

                ) {


                    statement.setInt(
                        1,
                        quantity
                    );


                    statement.setInt(
                        2,
                        productId
                    );


                    statement.executeUpdate();
                }


                connection.commit();


                return orderId;


            }

            catch (Exception e) {


                connection.rollback();


                if (
                    e instanceof SQLException
                ) {

                    throw
                        (SQLException)e;
                }


                throw e;

            }

            finally {

                connection
                    .setAutoCommit(true);
            }
        }
    }


    /* GET ORDERS */

    public List<Map<String,Object>>
    getOrders()
    throws SQLException {


        List<Map<String,Object>>
            list =
            new ArrayList<>();


        String sql =

            """
            SELECT

                o.id,

                c.name
                AS customer_name,

                p.name
                AS product_name,

                oi.quantity,

                o.order_date

            FROM orders o

            JOIN customers c

            ON c.id =
               o.customer_id

            JOIN order_items oi

            ON oi.order_id =
               o.id

            JOIN products p

            ON p.id =
               oi.product_id

            ORDER BY
                o.id DESC

            LIMIT 20
            """;


        try (

            Connection connection =
                connect();

            Statement statement =
                connection.createStatement();

            ResultSet result =
                statement.executeQuery(sql)

        ) {


            while (
                result.next()
            ) {


                Map<String,Object>
                    order =
                    new LinkedHashMap<>();


                order.put(
                    "id",
                    result.getInt("id")
                );


                order.put(
                    "customerName",
                    result.getString(
                        "customer_name"
                    )
                );


                order.put(
                    "productName",
                    result.getString(
                        "product_name"
                    )
                );


                order.put(
                    "quantity",
                    result.getInt(
                        "quantity"
                    )
                );


                order.put(
                    "orderDate",
                    result.getString(
                        "order_date"
                    )
                );


                list.add(order);
            }
        }


        return list;
    }


    /* LOAD PRODUCTS INTO AVL */

    public void loadAVL(
        AVLTree tree
    )
    throws SQLException {


        try (

            Connection connection =
                connect();

            Statement statement =
                connection
                    .createStatement();

            ResultSet result =
                statement.executeQuery(

                    "SELECT id,name FROM products"

                )

        ) {


            while (
                result.next()
            ) {


                tree.insert(

                    result.getString(
                        "name"
                    ),

                    result.getInt(
                        "id"
                    )

                );
            }
        }
    }
}