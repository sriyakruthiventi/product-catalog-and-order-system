package com.store;


import com.sun.net.httpserver.HttpExchange;

import com.sun.net.httpserver.HttpServer;


import java.io.*;

import java.net.*;

import java.net.http.*;

import java.nio.charset.StandardCharsets;

import java.nio.file.*;

import java.time.Duration;

import java.util.*;


public class StoreServer {


    private static final int PORT =
        8081;


    private static final Database DB =
        new Database(
            "../data/store.db"
        );


    private static final AVLTree AVL =
        new AVLTree();


    private static final Path FRONTEND =
        Paths.get("frontend");


    public static void main(
            String[] args)
            throws Exception {


        /* INITIALIZE DATABASE */

        DB.initialize();


        /* LOAD AVL TREE */

        DB.loadAVL(AVL);


        /* CREATE HTTP SERVER */

        HttpServer server =

            HttpServer.create(

                new InetSocketAddress(
                    PORT
                ),

                0

            );


        server.createContext(
            "/",
            StoreServer::handle
        );


        server.setExecutor(
            java.util.concurrent
                .Executors
                .newCachedThreadPool()
        );


        server.start();


        System.out.println(

            "CatalogPro Java Server"

        );


        System.out.println(

            "Open: http://localhost:"
            + PORT

        );


        System.out.println(

            "AVL product cache loaded."

        );
    }


    /* HANDLE REQUEST */

    private static void handle(
            HttpExchange exchange)
            throws IOException {


        addCors(exchange);


        String path =
            exchange
                .getRequestURI()
                .getPath();


        String method =
            exchange.getRequestMethod();


        try {


            /* FRONTEND */

            if (
                path.equals("/")
                ||
                path.equals(
                    "/index.html"
                )
            ) {


                serveFile(

                    exchange,

                    FRONTEND.resolve(
                        "index.html"
                    ),

                    "text/html"
                );
            }


            else if (
                path.equals(
                    "/style.css"
                )
            ) {


                serveFile(

                    exchange,

                    FRONTEND.resolve(
                        "style.css"
                    ),

                    "text/css"
                );
            }


            else if (
                path.equals(
                    "/app.js"
                )
            ) {


                serveFile(

                    exchange,

                    FRONTEND.resolve(
                        "app.js"
                    ),

                    "application/javascript"
                );
            }


            /* HEALTH */

            else if (
                path.equals(
                    "/api/health"
                )
            ) {


                json(

                    exchange,

                    200,

                    """
                    {
                        "status":"ok",
                        "service":
                        "java-store-server"
                    }
                    """
                );
            }


            /* PRODUCTS */

            else if (
                path.equals(
                    "/api/products"
                )
            ) {


                String query =
                    queryParam(

                        exchange
                            .getRequestURI()
                            .getRawQuery(),

                        "q"
                    );


                json(

                    exchange,

                    200,

                    productsJson(
                        DB.getProducts(
                            query
                        )
                    )
                );
            }


            /* ORDERS */

            else if (

                path.equals(
                    "/api/orders"
                )

                &&

                method.equals(
                    "GET"
                )

            ) {


                json(

                    exchange,

                    200,

                    ordersJson(
                        DB.getOrders()
                    )
                );
            }


            /* CREATE ORDER */

            else if (

                path.equals(
                    "/api/orders"
                )

                &&

                method.equals(
                    "POST"
                )

            ) {


                placeOrder(
                    exchange
                );
            }


            /* FORECAST */

            else if (

                path.equals(
                    "/api/forecast/run"
                )

                &&

                method.equals(
                    "POST"
                )

            ) {


                runPythonForecast(
                    exchange
                );
            }


            else {


                json(

                    exchange,

                    404,

                    """
                    {
                        "error":
                        "Not found"
                    }
                    """
                );
            }

        }

        catch (
            IllegalArgumentException e
        ) {


            json(

                exchange,

                400,

                "{\"error\":"
                +
                quote(
                    e.getMessage()
                )
                +
                "}"
            );
        }


        catch (Exception e) {


            e.printStackTrace();


            json(

                exchange,

                500,

                """
                {
                    "error":
                    "Server error"
                }
                """
            );
        }


        finally {

            exchange.close();

        }
    }


    /* PLACE ORDER */

    private static void placeOrder(
            HttpExchange exchange)
            throws Exception {


        String body =

            new String(

                exchange
                    .getRequestBody()
                    .readAllBytes(),

                StandardCharsets.UTF_8

            );


        String name =
            jsonString(
                body,
                "customerName"
            );


        String email =
            jsonString(
                body,
                "email"
            );


        int productId =
            Integer.parseInt(

                jsonString(
                    body,
                    "productId"
                )
            );


        int quantity =
            Integer.parseInt(

                jsonString(
                    body,
                    "quantity"
                )
            );


        int orderId =

            DB.placeOrder(

                name,

                email,

                productId,

                quantity

            );


        json(

            exchange,

            201,

            """
            {
                "message":
                "Order placed",

                "orderId":
            """
            + orderId +
            "}"
        );
    }


    /* CALL PYTHON SERVICE */

    private static void
    runPythonForecast(
            HttpExchange exchange)
            throws Exception {


        HttpClient client =

            HttpClient.newBuilder()

                .connectTimeout(
                    Duration.ofSeconds(2)
                )

                .build();


        HttpRequest request =

            HttpRequest.newBuilder()

                .uri(

                    URI.create(
                        "http://127.0.0.1:5000/forecast/all"
                    )

                )

                .timeout(
                    Duration.ofSeconds(10)
                )

                .POST(

                    HttpRequest
                        .BodyPublishers
                        .ofString("{}")

                )

                .header(
                    "Content-Type",
                    "application/json"
                )

                .build();


        HttpResponse<String> response =

            client.send(

                request,

                HttpResponse
                    .BodyHandlers
                    .ofString()

            );


        json(

            exchange,

            response.statusCode(),

            response.body()

        );
    }


    /* PRODUCTS JSON */

    private static String
    productsJson(
        List<Product> list
    ) {


        StringBuilder json =
            new StringBuilder("[");


        for (
            int i = 0;
            i < list.size();
            i++
        ) {


            Product product =
                list.get(i);


            if (i > 0)

                json.append(",");


            json

                .append("{")

                .append(
                    "\"id\":"
                )
                .append(
                    product.id
                )

                .append(
                    ",\"name\":"
                )
                .append(
                    quote(
                        product.name
                    )
                )

                .append(
                    ",\"category\":"
                )
                .append(
                    quote(
                        product.category
                    )
                )

                .append(
                    ",\"price\":"
                )
                .append(
                    product.price
                )

                .append(
                    ",\"stockQuantity\":"
                )
                .append(
                    product.stockQuantity
                )

                .append(
                    ",\"reorderLevel\":"
                )
                .append(
                    product.reorderLevel
                )

                .append(
                    ",\"forecast\":"
                )
                .append(
                    product.forecast
                )

                .append(
                    ",\"reorderAlert\":"
                )
                .append(
                    product.reorderAlert
                )

                .append("}");
        }


        return json
            .append("]")
            .toString();
    }


    /* ORDERS JSON */

    private static String
    ordersJson(
        List<Map<String,Object>> list
    ) {


        StringBuilder json =
            new StringBuilder("[");


        for (
            int i = 0;
            i < list.size();
            i++
        ) {


            if (i > 0)

                json.append(",");


            Map<String,Object>
                order =
                list.get(i);


            json

                .append("{")

                .append(
                    "\"id\":"
                )
                .append(
                    order.get("id")
                )

                .append(
                    ",\"customerName\":"
                )
                .append(
                    quote(
                        String.valueOf(
                            order.get(
                                "customerName"
                            )
                        )
                    )
                )

                .append(
                    ",\"productName\":"
                )
                .append(
                    quote(
                        String.valueOf(
                            order.get(
                                "productName"
                            )
                        )
                    )
                )

                .append(
                    ",\"quantity\":"
                )
                .append(
                    order.get(
                        "quantity"
                    )
                )

                .append(
                    ",\"orderDate\":"
                )
                .append(
                    quote(
                        String.valueOf(
                            order.get(
                                "orderDate"
                            )
                        )
                    )
                )

                .append("}");
        }


        return json
            .append("]")
            .toString();
    }


    /* GET QUERY PARAMETER */

    private static String queryParam(

            String query,

            String key) {


        if (
            query == null
        )

            return "";


        for (
            String part :
            query.split("&")
        ) {


            String[] values =
                part.split(
                    "=",
                    2
                );


            if (

                values.length == 2

                &&

                values[0].equals(
                    key
                )

            ) {


                return URLDecoder.decode(

                    values[1],

                    StandardCharsets.UTF_8

                );
            }
        }


        return "";
    }


    /* JSON STRING */

    private static String
    jsonString(

        String body,

        String key

    ) {


        String pattern =
            "\"" + key + "\"";


        int keyPosition =
            body.indexOf(
                pattern
            );


        if (
            keyPosition < 0
        ) {

            throw new
                IllegalArgumentException(
                    "Missing " + key
                );
        }


        int colon =
            body.indexOf(
                ':',
                keyPosition
                + pattern.length()
            );


        int start =
            colon + 1;


        while (

            start < body.length()

            &&

            Character.isWhitespace(
                body.charAt(start)
            )

        ) {

            start++;
        }


        if (
            body.charAt(start)
            == '"'
        ) {


            int end =
                body.indexOf(
                    '"',
                    start + 1
                );


            return body.substring(
                start + 1,
                end
            );
        }


        int end = start;


        while (

            end < body.length()

            &&

            "0123456789"
                .indexOf(
                    body.charAt(end)
                ) >= 0

        ) {

            end++;
        }


        return body.substring(
            start,
            end
        );
    }


    /* JSON ESCAPE */

    private static String
    quote(String text) {


        if (
            text == null
        )

            return "null";


        return

            "\""

            +

            text
                .replace(
                    "\\",
                    "\\\\"
                )
                .replace(
                    "\"",
                    "\\\""
                )
                .replace(
                    "\n",
                    "\\n"
                )

            +

            "\"";
    }


    /* SERVE FRONTEND FILE */

    private static void serveFile(

            HttpExchange exchange,

            Path path,

            String contentType

    )
    throws IOException {


        byte[] bytes =
            Files.readAllBytes(
                path
            );


        exchange
            .getResponseHeaders()
            .set(
                "Content-Type",
                contentType
                + "; charset=UTF-8"
            );


        exchange.sendResponseHeaders(
            200,
            bytes.length
        );


        exchange
            .getResponseBody()
            .write(bytes);
    }


    /* SEND JSON */

    private static void json(

            HttpExchange exchange,

            int status,

            String body

    )
    throws IOException {


        exchange
            .getResponseHeaders()
            .set(
                "Content-Type",
                "application/json; charset=UTF-8"
            );


        byte[] bytes =
            body.getBytes(
                StandardCharsets.UTF_8
            );


        exchange.sendResponseHeaders(
            status,
            bytes.length
        );


        exchange
            .getResponseBody()
            .write(bytes);
    }


    /* CORS */

    private static void addCors(
            HttpExchange exchange) {


        exchange
            .getResponseHeaders()
            .set(
                "Access-Control-Allow-Origin",
                "*"
            );


        exchange
            .getResponseHeaders()
            .set(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );
    }
}


