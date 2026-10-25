
const form = document.querySelector("#note-form");
const input = document.querySelector("#note-input");
const categorySelect = document.querySelector("#note-category");
const errorMessage = document.querySelector("#error-message");
const searchInput = document.querySelector("#search-input");
const list = document.querySelector("#notes-list");
const count = document.querySelector("#note-count");
const clearAllBtn = document.querySelector("#clear-all");

const STORAGE_KEY = "quicknotes";
const MAX_LENGTH = 200;
const CATEGORIES = ["personal", "work", "study"];

let notes = loadNotes();

function loadNotes() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((note) =>
            note &&
            typeof note.id === "number" &&
            typeof note.text === "string" &&
            note.text.trim() !== "" &&
            note.text.length <= MAX_LENGTH &&
            CATEGORIES.includes(note.category) &&
            typeof note.createdAt === "string"
        );
    } catch (error) {
        console.error("Unable to load saved notes:", error);
        return [];
    }
}

function saveNotes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        return true;
    } catch (error) {
        console.error("Unable to save notes:", error);
        showError("Unable to save notes in this browser.");
        return false;
    }
}

function validate(text) {
    if (text === "") {
        return "Please type a note first.";
    }

    if (text.length > MAX_LENGTH) {
        return "Notes must be 200 characters or fewer.";
    }

    return "";
}

function showError(message) {
    errorMessage.textContent = message;
}

function capitalise(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function countMessage(total) {
    if (total === 0) {
        return "You have no notes yet.";
    }

    if (total === 1) {
        return "You have 1 note.";
    }

    return `You have ${total} notes.`;
}

function createNoteElement(note) {
    const item = document.createElement("li");
    item.classList.add("note", `category-${note.category}`);

    const body = document.createElement("div");
    body.classList.add("note-body");

    const text = document.createElement("p");
    text.classList.add("note-text");
    text.textContent = note.text;

    const metadata = document.createElement("div");
    metadata.classList.add("note-meta");

    const badge = document.createElement("span");
    badge.classList.add("badge");
    badge.textContent = capitalise(note.category);

    const date = document.createElement("span");
    date.textContent = note.createdAt;

    metadata.append(badge, date);
    body.append(text, metadata);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.classList.add("delete-btn");
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
        "aria-label",
        `Delete ${note.category} note`
    );

    deleteButton.addEventListener("click", () => {
        deleteNote(note.id);
    });

    item.append(body, deleteButton);

    return item;
}

function render() {
    const query = searchInput.value.trim().toLowerCase();

    const visibleNotes = notes.filter((note) =>
        note.text.toLowerCase().includes(query)
    );

    list.replaceChildren();

    if (notes.length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.classList.add("empty-message");
        emptyMessage.textContent = "No notes yet. Add your first note above.";
        list.appendChild(emptyMessage);
    } else if (visibleNotes.length === 0) {
        const emptyMessage = document.createElement("li");
        emptyMessage.classList.add("empty-message");
        emptyMessage.textContent = "No notes match your search.";
        list.appendChild(emptyMessage);
    } else {
        visibleNotes.forEach((note) => {
            list.appendChild(createNoteElement(note));
        });
    }

    count.textContent = countMessage(notes.length);
    clearAllBtn.hidden = notes.length === 0;
}

function addNote(text, category) {
    const note = {
        id: Date.now(),
        text: text,
        category: category,
        createdAt: new Date().toLocaleString()
    };

    notes.unshift(note);
    saveNotes();
    render();
}

function deleteNote(id) {
    notes = notes.filter((note) => note.id !== id);
    saveNotes();
    render();
}

function clearAll() {
    if (notes.length === 0) {
        return;
    }

    const confirmed = confirm("Are you sure you want to delete all notes?");

    if (!confirmed) {
        return;
    }

    notes = [];
    saveNotes();
    render();
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = input.value.trim();
    const error = validate(text);

    if (error) {
        showError(error);
        input.focus();
        return;
    }

    if (!CATEGORIES.includes(categorySelect.value)) {
        showError("Please select a valid category.");
        categorySelect.focus();
        return;
    }

    showError("");
    addNote(text, categorySelect.value);

    input.value = "";
    input.focus();
});

input.addEventListener("input", () => {
    if (errorMessage.textContent) {
        showError("");
    }
});

searchInput.addEventListener("input", render);
clearAllBtn.addEventListener("click", clearAll);

render();
