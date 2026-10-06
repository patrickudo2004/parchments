import type { ReadingPlanTrack, CuratedPlanDay, PlanType } from '@/types/database';

export interface LectioPreset {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    category: 'sequential' | 'topical' | 'chronological' | 'books';
    type: PlanType;
    durationDays: number;
    tracks?: Omit<ReadingPlanTrack, 'currentBook' | 'currentChapter'>[];
    curatedSchedule?: CuratedPlanDay[];
    templateType?: 'freeform' | 'lectio_divina';
}

export const LECTIO_PRESETS: LectioPreset[] = [
    // 1. Classical One-Year Canonical
    {
        id: 'canonical',
        title: 'Classical One-Year Canonical',
        subtitle: 'OT 3 ch/day + NT 1 ch/day',
        description: 'The standard journey through the scriptures in a year: 3 chapters Old Testament and 1 chapter New Testament daily.',
        category: 'sequential',
        type: 'sequential',
        durationDays: 365,
        tracks: [
            { name: 'Old Testament', startBook: 'Genesis', endBook: 'Malachi', chaptersPerDay: 3 },
            { name: 'New Testament', startBook: 'Matthew', endBook: 'Revelation', chaptersPerDay: 1 }
        ],
        templateType: 'freeform'
    },

    // 2. The Lectio 24-Chapter Devotional
    {
        id: '24ch',
        title: 'The Lectio 24-Chapter Devotional',
        subtitle: '10 OT + 10 NT + 2 Psalms + 2 Proverbs',
        description: 'Optimized intensive deep-study: 10 chapters OT, 10 chapters NT, 2 Psalms, and 2 Proverbs daily.',
        category: 'sequential',
        type: 'sequential',
        durationDays: 90,
        tracks: [
            { name: 'Old Testament', startBook: 'Genesis', endBook: 'Malachi', chaptersPerDay: 10 },
            { name: 'New Testament', startBook: 'Matthew', endBook: 'Revelation', chaptersPerDay: 10 },
            { name: 'Psalms', startBook: 'Psalms', endBook: 'Psalms', chaptersPerDay: 2 },
            { name: 'Proverbs', startBook: 'Proverbs', endBook: 'Proverbs', chaptersPerDay: 2 }
        ],
        templateType: 'freeform'
    },

    // 3. The 4 Gospels (Matthew to John)
    {
        id: 'gospels',
        title: 'The 4 Gospels in 90 Days',
        subtitle: 'Matthew, Mark, Luke, & John (1 ch/day)',
        description: 'Walk through the life, miracles, cross, and resurrection of Christ across all four Evangelists.',
        category: 'books',
        type: 'sequential',
        durationDays: 89,
        tracks: [
            { name: 'The Gospels', startBook: 'Matthew', endBook: 'John', chaptersPerDay: 1 }
        ],
        templateType: 'lectio_divina'
    },

    // 4. Romans in 16 Days
    {
        id: 'romans',
        title: 'Romans in 16 Days',
        subtitle: '1 chapter daily with deep reflection',
        description: 'Paul’s masterwork on justification by faith, grace, the Spirit, and Christian living.',
        category: 'books',
        type: 'sequential',
        durationDays: 16,
        tracks: [
            { name: 'Epistle to the Romans', startBook: 'Romans', endBook: 'Romans', chaptersPerDay: 1 }
        ],
        templateType: 'lectio_divina'
    },

    // 5. Paul's Prison Epistles
    {
        id: 'prison-epistles',
        title: 'Paul’s Prison Epistles (12 Days)',
        subtitle: 'Ephesians, Philippians, & Colossians',
        description: 'Meditate on the cosmic Christ, joy amidst chains, and walking worthy of our heavenly calling.',
        category: 'books',
        type: 'sequential',
        durationDays: 14,
        tracks: [
            { name: 'Ephesians & Colossians', startBook: 'Ephesians', endBook: 'Colossians', chaptersPerDay: 1 }
        ],
        templateType: 'lectio_divina'
    },

    // 6. 30 Days on Faith & Trust (Topical)
    {
        id: 'topical-faith',
        title: '30 Days on Faith & Trust',
        subtitle: 'Curated topical passages across OT & NT',
        description: 'Strengthen your conviction in God’s promises through key scriptures from Abraham to Hebrews 11.',
        category: 'topical',
        type: 'topical',
        durationDays: 30,
        templateType: 'lectio_divina',
        curatedSchedule: [
            { day: 1, title: 'Day 1: The Definition of Faith', passages: [{ book: 'Hebrews', chapter: 11, verseStart: 1, verseEnd: 6 }] },
            { day: 2, title: 'Day 2: Abraham Believed the Lord', passages: [{ book: 'Genesis', chapter: 15, verseStart: 1, verseEnd: 6 }] },
            { day: 3, title: 'Day 3: Believing Against Hope', passages: [{ book: 'Romans', chapter: 4, verseStart: 13, verseEnd: 25 }] },
            { day: 4, title: 'Day 4: Trust in the Lord with All Your Heart', passages: [{ book: 'Proverbs', chapter: 3, verseStart: 5, verseEnd: 12 }] },
            { day: 5, title: 'Day 5: Help My Unbelief', passages: [{ book: 'Mark', chapter: 9, verseStart: 14, verseEnd: 29 }] },
            { day: 6, title: 'Day 6: Mustard Seed Faith', passages: [{ book: 'Matthew', chapter: 17, verseStart: 14, verseEnd: 21 }] },
            { day: 7, title: 'Day 7: Faith and Works', passages: [{ book: 'James', chapter: 2, verseStart: 14, verseEnd: 26 }] },
            { day: 8, title: 'Day 8: Walking by Faith, Not by Sight', passages: [{ book: '2 Corinthians', chapter: 5, verseStart: 1, verseEnd: 10 }] },
            { day: 9, title: 'Day 9: The Shield of Faith', passages: [{ book: 'Ephesians', chapter: 6, verseStart: 10, verseEnd: 18 }] },
            { day: 10, title: 'Day 10: Faith Over Fear in the Storm', passages: [{ book: 'Mark', chapter: 4, verseStart: 35, verseEnd: 41 }] },
            { day: 11, title: 'Day 11: The Faith of the Centurion', passages: [{ book: 'Luke', chapter: 7, verseStart: 1, verseEnd: 10 }] },
            { day: 12, title: 'Day 12: By Grace You Are Saved Through Faith', passages: [{ book: 'Ephesians', chapter: 2, verseStart: 1, verseEnd: 10 }] },
            { day: 13, title: 'Day 13: The Righteous Shall Live by Faith', passages: [{ book: 'Habakkuk', chapter: 2, verseStart: 1, verseEnd: 4 }] },
            { day: 14, title: 'Day 14: Looking Unto Jesus, the Author of Faith', passages: [{ book: 'Hebrews', chapter: 12, verseStart: 1, verseEnd: 4 }] },
            { day: 15, title: 'Day 15: Overcoming the World by Faith', passages: [{ book: '1 John', chapter: 5, verseStart: 1, verseEnd: 5 }] },
            { day: 16, title: 'Day 16: Faith Tested by Fire', passages: [{ book: '1 Peter', chapter: 1, verseStart: 3, verseEnd: 9 }] },
            { day: 17, title: 'Day 17: Abraham Offering Isaac', passages: [{ book: 'Genesis', chapter: 22, verseStart: 1, verseEnd: 14 }] },
            { day: 18, title: 'Day 18: Caleb’s Wholehearted Faith', passages: [{ book: 'Joshua', chapter: 14, verseStart: 6, verseEnd: 15 }] },
            { day: 19, title: 'Day 19: Faith of Shadrach, Meshach, and Abednego', passages: [{ book: 'Daniel', chapter: 3, verseStart: 13, verseEnd: 25 }] },
            { day: 20, title: 'Day 20: Faith in God’s Covenant Faithfulness', passages: [{ book: 'Lamentations', chapter: 3, verseStart: 21, verseEnd: 26 }] },
            { day: 21, title: 'Day 21: Peter Walking on the Water', passages: [{ book: 'Matthew', chapter: 14, verseStart: 22, verseEnd: 33 }] },
            { day: 22, title: 'Day 22: The Syrophoenician Woman’s Great Faith', passages: [{ book: 'Matthew', chapter: 15, verseStart: 21, verseEnd: 28 }] },
            { day: 23, title: 'Day 23: The Blind Man Healed by Faith', passages: [{ book: 'Mark', chapter: 10, verseStart: 46, verseEnd: 52 }] },
            { day: 24, title: 'Day 24: Faith Working Through Love', passages: [{ book: 'Galatians', chapter: 5, verseStart: 1, verseEnd: 6 }] },
            { day: 25, title: 'Day 25: Asking in Faith Without Wavering', passages: [{ book: 'James', chapter: 1, verseStart: 2, verseEnd: 8 }] },
            { day: 26, title: 'Day 26: The Good Fight of Faith', passages: [{ book: '1 Timothy', chapter: 6, verseStart: 11, verseEnd: 16 }] },
            { day: 27, title: 'Day 27: Confidence and Reward', passages: [{ book: 'Hebrews', chapter: 10, verseStart: 32, verseEnd: 39 }] },
            { day: 28, title: 'Day 28: Kept by the Power of God', passages: [{ book: 'Jude', chapter: 1, verseStart: 20, verseEnd: 25 }] },
            { day: 29, title: 'Day 29: Faithful is He Who Promised', passages: [{ book: 'Hebrews', chapter: 11, verseStart: 8, verseEnd: 19 }] },
            { day: 30, title: 'Day 30: Unshakeable Kingdom', passages: [{ book: 'Hebrews', chapter: 12, verseStart: 25, verseEnd: 29 }] }
        ]
    },

    // 7. The Names & Character of God (21 Days)
    {
        id: 'names-of-god',
        title: 'The Names & Character of God',
        subtitle: '21 Days in the Divine Attributes',
        description: 'Meditate on Elohim, Yahweh, El Shaddai, Yahweh Yireh, Yahweh Rapha, and Christ the Word.',
        category: 'topical',
        type: 'topical',
        durationDays: 21,
        templateType: 'lectio_divina',
        curatedSchedule: [
            { day: 1, title: 'Day 1: Elohim — The Creator', passages: [{ book: 'Genesis', chapter: 1, verseStart: 1, verseEnd: 5 }] },
            { day: 2, title: 'Day 2: Yahweh — I AM THAT I AM', passages: [{ book: 'Exodus', chapter: 3, verseStart: 13, verseEnd: 15 }] },
            { day: 3, title: 'Day 3: El Shaddai — God Almighty', passages: [{ book: 'Genesis', chapter: 17, verseStart: 1, verseEnd: 8 }] },
            { day: 4, title: 'Day 4: Yahweh Yireh — The Lord Will Provide', passages: [{ book: 'Genesis', chapter: 22, verseStart: 9, verseEnd: 14 }] },
            { day: 5, title: 'Day 5: Yahweh Rapha — The Lord Who Heals', passages: [{ book: 'Exodus', chapter: 15, verseStart: 22, verseEnd: 26 }] },
            { day: 6, title: 'Day 6: Yahweh Nissi — The Lord My Banner', passages: [{ book: 'Exodus', chapter: 17, verseStart: 8, verseEnd: 16 }] },
            { day: 7, title: 'Day 7: Yahweh Shalom — The Lord Is Peace', passages: [{ book: 'Judges', chapter: 6, verseStart: 19, verseEnd: 24 }] },
            { day: 8, title: 'Day 8: Yahweh Rohi — The Lord Is My Shepherd', passages: [{ book: 'Psalms', chapter: 23, verseStart: 1, verseEnd: 6 }] },
            { day: 9, title: 'Day 9: Yahweh Tsidkenu — The Lord Our Righteousness', passages: [{ book: 'Jeremiah', chapter: 23, verseStart: 5, verseEnd: 6 }] },
            { day: 10, title: 'Day 10: Yahweh Shammah — The Lord Is There', passages: [{ book: 'Ezekiel', chapter: 48, verseStart: 35, verseEnd: 35 }] },
            { day: 11, title: 'Day 11: The God of Compassion and Grace', passages: [{ book: 'Exodus', chapter: 34, verseStart: 5, verseEnd: 7 }] },
            { day: 12, title: 'Day 12: The Holy One of Israel', passages: [{ book: 'Isaiah', chapter: 6, verseStart: 1, verseEnd: 8 }] },
            { day: 13, title: 'Day 13: The Everlasting Father', passages: [{ book: 'Isaiah', chapter: 9, verseStart: 6, verseEnd: 7 }] },
            { day: 14, title: 'Day 14: The Word Made Flesh', passages: [{ book: 'John', chapter: 1, verseStart: 1, verseEnd: 14 }] },
            { day: 15, title: 'Day 15: The Bread of Life', passages: [{ book: 'John', chapter: 6, verseStart: 35, verseEnd: 40 }] },
            { day: 16, title: 'Day 16: The Light of the World', passages: [{ book: 'John', chapter: 8, verseStart: 12, verseEnd: 12 }] },
            { day: 17, title: 'Day 17: The Resurrection and the Life', passages: [{ book: 'John', chapter: 11, verseStart: 21, verseEnd: 27 }] },
            { day: 18, title: 'Day 18: The Way, the Truth, and the Life', passages: [{ book: 'John', chapter: 14, verseStart: 1, verseEnd: 6 }] },
            { day: 19, title: 'Day 19: The True Vine', passages: [{ book: 'John', chapter: 15, verseStart: 1, verseEnd: 8 }] },
            { day: 20, title: 'Day 20: King of Kings and Lord of Lords', passages: [{ book: 'Revelation', chapter: 19, verseStart: 11, verseEnd: 16 }] },
            { day: 21, title: 'Day 21: The Alpha and Omega', passages: [{ book: 'Revelation', chapter: 22, verseStart: 12, verseEnd: 16 }] }
        ]
    },

    // 8. The Sermon on the Mount (7 Days)
    {
        id: 'sermon-on-the-mount',
        title: 'The Sermon on the Mount (7 Days)',
        subtitle: 'Matthew Chapters 5 to 7 in depth',
        description: 'Jesus’ kingdom manifesto: the Beatitudes, righteousness of the heart, prayer, and the house on the rock.',
        category: 'topical',
        type: 'topical',
        durationDays: 7,
        templateType: 'lectio_divina',
        curatedSchedule: [
            { day: 1, title: 'Day 1: The Beatitudes', passages: [{ book: 'Matthew', chapter: 5, verseStart: 1, verseEnd: 12 }] },
            { day: 2, title: 'Day 2: Salt, Light, and Law Fulfilled', passages: [{ book: 'Matthew', chapter: 5, verseStart: 13, verseEnd: 26 }] },
            { day: 3, title: 'Day 3: Purity, Integrity, and Love for Enemies', passages: [{ book: 'Matthew', chapter: 5, verseStart: 27, verseEnd: 48 }] },
            { day: 4, title: 'Day 4: Secret Giving, Prayer, and Fasting', passages: [{ book: 'Matthew', chapter: 6, verseStart: 1, verseEnd: 18 }] },
            { day: 5, title: 'Day 5: Heavenly Treasures and Freedom from Anxiety', passages: [{ book: 'Matthew', chapter: 6, verseStart: 19, verseEnd: 34 }] },
            { day: 6, title: 'Day 6: Judging, Asking, and the Golden Rule', passages: [{ book: 'Matthew', chapter: 7, verseStart: 1, verseEnd: 14 }] },
            { day: 7, title: 'Day 7: Fruit and the Two Foundations', passages: [{ book: 'Matthew', chapter: 7, verseStart: 15, verseEnd: 29 }] }
        ]
    }
];

/**
 * Parses user-pasted text lines into a CuratedPlanDay array.
 * Supported format example:
 * Day 1: John 3:1-16 | The New Birth
 * Day 2: Romans 8:1-17 | Life in the Spirit
 */
export const parsePastedCuratedText = (rawText: string): CuratedPlanDay[] => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const schedule: CuratedPlanDay[] = [];

    lines.forEach((line, idx) => {
        // Strip optional "Day X:" prefix
        let clean = line.replace(/^Day\s*\d+\s*[:\-\.]?\s*/i, '').trim();
        let topic = '';

        if (clean.includes('|')) {
            const parts = clean.split('|');
            clean = parts[0].trim();
            topic = parts[1].trim();
        }

        // Match book, chapter, and optional verse range: e.g. "John 3:1-16" or "Genesis 1"
        const match = clean.match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/);
        if (match) {
            const book = match[1].trim();
            const chapter = Number(match[2]);
            const verseStart = match[3] ? Number(match[3]) : null;
            const verseEnd = match[4] ? Number(match[4]) : null;

            schedule.push({
                day: idx + 1,
                title: topic || `Day ${idx + 1}: ${book} ${chapter}${verseStart ? `:${verseStart}` : ''}`,
                topic: topic || undefined,
                passages: [{
                    book,
                    chapter,
                    verseStart,
                    verseEnd
                }]
            });
        }
    });

    return schedule;
};
