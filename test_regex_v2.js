
// Revised Regex:
// 1. Prefix: Optional 1, 2, 3, I, II, III
// 2. Book: "Song of Solomon" OR Single Word
// 3. Dot: Optional
// 4. Chapter/Verse: Digits
// 5. Dash: -, –, —
// 6. End Verse: Digits
const SCRIPTURE_REGEX = /\b((?:1|2|3|I|II|III)\s*)?((?:Song\s+of\s+Solomon)|(?:[a-zA-Z]+))\.?\s+(\d+):(\d+)(?:[-–—](\d+))?\b/i;

const testStrings = [
    "Titus 3:5-7",
    "Titus 3:5-7 ",
    "Read Titus 3:5-7.",
    "Titus 3:5–7", // En-dash
    "Titus 3:5—7", // Em-dash
    "Song of Solomon 2:4",
    "1 John 1:9",
    "I Samuel 2:10"
];

testStrings.forEach(str => {
    // Find all matches to see how it handles "Read Titus 3:5-7"
    // Using simple match for verification of the core logic, but simulating the loop behavior of scanScriptures
    const regex = new RegExp(SCRIPTURE_REGEX.source, 'gi');
    const matches = [...str.matchAll(regex)];

    console.log(`Testing "${str}":`);
    if (matches.length > 0) {
        matches.forEach(m => {
            console.log(`  Match: "${m[0]}" -> Book: "${m[2]}", Range: "${m[4]}-${m[5] || ''}"`);
        });
    } else {
        console.log("  NO MATCH");
    }
});
