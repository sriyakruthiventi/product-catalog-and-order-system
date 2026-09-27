package com.store;

import java.time.LocalDateTime;


public class Order {

    public int id;

    public int customerId;

    public int productId;

    public int quantity;

    public LocalDateTime orderDate;


    public Order(
            int id,
            int customerId,
            int productId,
            int quantity,
            LocalDateTime orderDate) {

        this.id = id;

        this.customerId = customerId;

        this.productId = productId;

        this.quantity = quantity;

        this.orderDate = orderDate;
    }
}