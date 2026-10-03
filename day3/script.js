let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter(note =>
        note.text.toLowerCase().includes(searchWord)
    );
}

console.log(searchNotes("javascript"));
console.log(searchNotes("pizza"));

function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let i = 1; i < notes.length; i++) {
        if (notes[i].text.length > longest.text.length) {
            longest = notes[i];
        }
    }

    return longest;
}

console.log(longestNote());

const originalNotes = notes;
notes = [];

console.log(longestNote());

notes = originalNotes;

function countByCategory() {
    const counts = {};

    for (const note of notes) {
        if (!counts[note.category]) {
            counts[note.category] = 0;
        }

        counts[note.category]++;
    }

    return counts;
}

console.log(countByCategory());
console.log("Counts:", countByCategory());

function getSummary() {
    const counts = countByCategory();
    const total = notes.length;
    const noteWord = total === 1 ? "note" : "notes";

    return `${total} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

console.log(getSummary());
console.log("Summary:", getSummary());

function isDuplicate(text) {
    const normalizedText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === normalizedText
    );
}

console.log(isDuplicate("  CALL MUM  "));
console.log(isDuplicate("Go to the gym"));

function addNote(text, category) {
    const trimmedText = text.trim();
    const validCategories = ["personal", "work", "study"];

    if (trimmedText.length < 1 || trimmedText.length > 200) {
        console.log("Note must be between 1 and 200 characters.");
        return false;
    }

    if (isDuplicate(trimmedText)) {
        console.log("Note already exists.");
        return false;
    }

    if (!validCategories.includes(category)) {
        console.log("Invalid category.");
        return false;
    }

    const newId = notes.length > 0
        ? Math.max(...notes.map(note => note.id)) + 1
        : 1;

    notes.push({
        id: newId,
        text: trimmedText,
        category: category
    });

    console.log("Note added successfully.");
    return true;
}

console.log(addNote("Prepare presentation", "work"));
console.log(addNote("  Call mum  ", "personal"));