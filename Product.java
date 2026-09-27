package com.store;

public class Product {

    public int id;

    public String name;

    public String category;

    public double price;

    public int stockQuantity;

    public int reorderLevel;

    public double forecast;

    public boolean reorderAlert;


    public Product(
            int id,
            String name,
            String category,
            double price,
            int stockQuantity,
            int reorderLevel) {

        this.id = id;

        this.name = name;

        this.category = category;

        this.price = price;

        this.stockQuantity = stockQuantity;

        this.reorderLevel = reorderLevel;
    }
}