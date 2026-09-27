package com.store;


/*
 * AVL Tree
 *
 * Used for fast product searching.
 *
 * Search complexity:
 * O(log n)
 */

public class AVLTree {


    private static class Node {

        String key;

        int productId;

        int height = 1;

        Node left;

        Node right;


        Node(
                String key,
                int productId) {

            this.key = key;

            this.productId =
                    productId;
        }
    }


    private Node root;


    private int height(Node node) {

        if (node == null)

            return 0;

        return node.height;
    }


    private int balance(Node node) {

        if (node == null)

            return 0;

        return
            height(node.left)
            -
            height(node.right);
    }


    /* RIGHT ROTATION */

    private Node rotateRight(Node y) {

        Node x = y.left;

        Node temp = x.right;


        x.right = y;

        y.left = temp;


        y.height =
            1 +
            Math.max(
                height(y.left),
                height(y.right)
            );


        x.height =
            1 +
            Math.max(
                height(x.left),
                height(x.right)
            );


        return x;
    }


    /* LEFT ROTATION */

    private Node rotateLeft(Node x) {

        Node y = x.right;

        Node temp = y.left;


        y.left = x;

        x.right = temp;


        x.height =
            1 +
            Math.max(
                height(x.left),
                height(x.right)
            );


        y.height =
            1 +
            Math.max(
                height(y.left),
                height(y.right)
            );


        return y;
    }


    /* INSERT */

    private Node insert(
            Node node,
            String key,
            int productId) {


        if (node == null)

            return new Node(
                key,
                productId
            );


        int comparison =
            key.compareToIgnoreCase(
                node.key
            );


        if (comparison < 0) {

            node.left =
                insert(
                    node.left,
                    key,
                    productId
                );

        }

        else if (comparison > 0) {

            node.right =
                insert(
                    node.right,
                    key,
                    productId
                );

        }

        else {

            node.productId =
                productId;

            return node;
        }


        node.height =
            1 +
            Math.max(
                height(node.left),
                height(node.right)
            );


        int balanceFactor =
            balance(node);


        /* LL */

        if (
            balanceFactor > 1
            &&
            key.compareToIgnoreCase(
                node.left.key
            ) < 0
        ) {

            return rotateRight(node);
        }


        /* RR */

        if (
            balanceFactor < -1
            &&
            key.compareToIgnoreCase(
                node.right.key
            ) > 0
        ) {

            return rotateLeft(node);
        }


        /* LR */

        if (
            balanceFactor > 1
            &&
            key.compareToIgnoreCase(
                node.left.key
            ) > 0
        ) {

            node.left =
                rotateLeft(
                    node.left
                );

            return rotateRight(node);
        }


        /* RL */

        if (
            balanceFactor < -1
            &&
            key.compareToIgnoreCase(
                node.right.key
            ) < 0
        ) {

            node.right =
                rotateRight(
                    node.right
                );

            return rotateLeft(node);
        }


        return node;
    }


    public void insert(
            String key,
            int productId) {

        root =
            insert(
                root,
                key,
                productId
            );
    }


    /* SEARCH */

    public Integer search(
            String key) {

        Node current =
            root;


        while (current != null) {

            int comparison =
                key.compareToIgnoreCase(
                    current.key
                );


            if (comparison == 0)

                return current.productId;


            if (comparison < 0)

                current =
                    current.left;

            else

                current =
                    current.right;
        }


        return null;
    }
}