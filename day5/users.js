const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const apiUrl = "https://jsonplaceholder.typicode.com/users";

let users = [];

async function loadUsers() {
    loadButton.disabled = true;
    statusMessage.textContent = "Loading users...";
    usersList.replaceChildren();

    try {
        const response = await fetch(apiUrl);

        ```
if (!response.ok) {
  throw new Error("Failed to load users. Please try again.");
}

const data = await response.json();

if (!Array.isArray(data)) {
  throw new Error("The server returned invalid user data.");
}

users = data;
renderUsers(users);

statusMessage.textContent = "Users loaded successfully.";
```

    } catch (error) {
        users = [];
        usersList.replaceChildren();
        statusMessage.textContent =
            "Error loading users. Check your connection and try again.";
    } finally {
        loadButton.disabled = false;
    }
}

function renderUsers(list) {
    usersList.replaceChildren();

    if (list.length === 0) {
        const message = document.createElement("li");
        message.textContent = "No users match your filter.";
        usersList.appendChild(message);
        return;
    }

    list.forEach(function (user) {
        const listItem = document.createElement("li");

        ```
const name = document.createElement("h3");
name.textContent = user.name;

const email = document.createElement("p");
email.textContent = "Email: " + user.email;

const city = document.createElement("p");
city.textContent = "City: " + user.address.city;

const company = document.createElement("p");
company.textContent = "Company: " + user.company.name;

listItem.appendChild(name);
listItem.appendChild(email);
listItem.appendChild(city);
listItem.appendChild(company);

usersList.appendChild(listItem);
```

    });
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", function () {
    const searchTerm = filterInput.value.trim().toLowerCase();

    const filteredUsers = users.filter(function (user) {
        return user.name.toLowerCase().includes(searchTerm);
    });

    renderUsers(filteredUsers);
});
