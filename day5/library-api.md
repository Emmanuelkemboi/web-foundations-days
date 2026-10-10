# Library Books REST API

## Overview

This REST API manages books in a library. The resource is `books`, and the examples use `/api/books` as the base path.

## Endpoints

### 1. List all books

* **Method:** GET
* **Path:** `/api/books`
* **Description:** Returns a list of all books.
* **Success status:** `200 OK`
* **Example request body:** None required.

### 2. Get one book

* **Method:** GET
* **Path:** `/api/books/{id}`
* **Description:** Returns the book matching the specified ID.
* **Success status:** `200 OK`
* **Example request body:** None required.

### 3. Create a book

* **Method:** POST
* **Path:** `/api/books`
* **Description:** Creates a new book in the library.
* **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958
}
```

* **Success status:** `201 Created`

### 4. Update a book

* **Method:** PUT
* **Path:** `/api/books/{id}`
* **Description:** Replaces the details of the specified book.
* **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1959
}
```

* **Success status:** `200 OK`

### 5. Delete a book

* **Method:** DELETE
* **Path:** `/api/books/{id}`
* **Description:** Deletes the book matching the specified ID.
* **Success status:** `204 No Content`
* **Example request body:** None required.

### 6. List books by author

* **Method:** GET
* **Path:** `/api/books?author=Chinua%20Achebe`
* **Description:** Returns books written by the specified author using a query parameter.
* **Success status:** `200 OK`
* **Example request body:** None required.

## Error Responses

### 400 Bad Request

* **Meaning:** The request contains invalid or missing data.
* **Example:** Creating a book without a required title or author.

### 404 Not Found

* **Meaning:** The requested resource does not exist.
* **Example:** Requesting `GET /api/books/9999` when no book has that ID.
