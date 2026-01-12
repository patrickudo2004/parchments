
const SCRIPTURE_REGEX = /\b((?:1|2|3|I|II|III)\s*)?([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\.?\s+(\d+):(\d+)(?:-(\d+))?\b/i;

const testStrings = [
    "Titus 3:5-7",
    "Titus 3:5-7 ",
    "Read Titus 3:5-7.",
    "Titus 3:5–7", // En-dash
    "Titus 3:5—7", // Em-dash
];

testStrings.forEach(str => {
    const match = str.match(SCRIPTURE_REGEX);
    console.log(`Testing "${str}":`, match ? "MATCH" : "NO MATCH");
    if (match) {
        console.log("Groups:", match.slice(1));
    }
});
