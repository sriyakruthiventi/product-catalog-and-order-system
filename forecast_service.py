from flask import Flask, jsonify
import sqlite3
import math
import os
from datetime import datetime

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "data", "store.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


def generate_forecast():
    conn = get_connection()
    cursor = conn.cursor()

    # Clear previous forecast results
    cursor.execute("DELETE FROM demand_forecast")

    # Calculate total quantity sold and number of orders
    # for every product using the existing order history.
    cursor.execute("""
        SELECT
            p.id,
            p.name,
            COALESCE(SUM(oi.quantity), 0) AS total_quantity,
            COUNT(DISTINCT o.id) AS order_count
        FROM products p
        LEFT JOIN order_items oi
            ON p.id = oi.product_id
        LEFT JOIN orders o
            ON oi.order_id = o.id
        GROUP BY p.id, p.name
        ORDER BY total_quantity DESC
    """)

    rows = cursor.fetchall()

    forecast_data = []

    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for product_id, product_name, total_quantity, order_count in rows:

        # Historical average quantity per order
        if order_count > 0:
            average_demand = total_quantity / order_count
        else:
            average_demand = 0

        # Forecast next demand
        forecast_quantity = math.ceil(average_demand)

        # Alert when forecast demand is relatively high
        alert = 1 if forecast_quantity >= 5 else 0

        # Write into the EXISTING table structure
        cursor.execute("""
            INSERT INTO demand_forecast
            (
                product_id,
                forecast_quantity,
                generated_at,
                alert
            )
            VALUES (?, ?, ?, ?)
        """, (
            product_id,
            forecast_quantity,
            generated_at,
            alert
        ))

        forecast_data.append({
            "productId": product_id,
            "productName": product_name,
            "totalSold": total_quantity,
            "orderCount": order_count,
            "averageDemand": round(average_demand, 2),
            "forecastQuantity": forecast_quantity,
            "alert": alert,
            "generatedAt": generated_at
        })

    conn.commit()
    conn.close()

    return forecast_data


@app.route("/forecast/run", methods=["GET"])
def run_forecast():
    try:
        data = generate_forecast()

        return jsonify({
            "success": True,
            "message": "Demand forecast generated successfully",
            "data": data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/forecast", methods=["GET"])
def get_forecast():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                df.product_id,
                p.name,
                df.forecast_quantity,
                df.generated_at,
                df.alert
            FROM demand_forecast df
            JOIN products p
                ON p.id = df.product_id
            ORDER BY df.forecast_quantity DESC
        """)

        rows = cursor.fetchall()
        conn.close()

        data = []

        for row in rows:
            data.append({
                "productId": row[0],
                "productName": row[1],
                "forecastQuantity": row[2],
                "generatedAt": row[3],
                "alert": row[4]
            })

        return jsonify({
            "success": True,
            "data": data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "Forecast service running"
    })


if __name__ == "__main__":
    print("Demand Forecast Service")
    print("Database:", DB_PATH)
    print("Running at http://localhost:5000")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
