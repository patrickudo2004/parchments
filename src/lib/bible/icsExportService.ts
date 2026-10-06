import type { ReadingPlan } from '@/types/database';
import { getDailySegments, advanceChapters } from '@/stores/readingPlanStore';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';

export interface CalendarDayEntry {
    date: Date;
    dayNumber: number;
    title: string;
    passagesSummary: string;
    description: string;
}

/**
 * Formats a Date object to iCalendar UTC timestamp format (YYYYMMDDTHHMMSSZ)
 */
export const formatIcsDateTime = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Formats a Date object to iCalendar Date-only format (YYYYMMDD)
 */
export const formatIcsDate = (date: Date): string => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

/**
 * Escapes text for RFC 5545 iCalendar values
 */
export const escapeIcsText = (text: string): string => {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
};

/**
 * Generates daily scheduled entries for any ReadingPlan (curated or sequential tracks)
 */
export const generatePlanCalendarEntries = (plan: ReadingPlan): CalendarDayEntry[] => {
    const entries: CalendarDayEntry[] = [];
    const startDate = new Date(plan.startDate);

    // Case 1: Curated / Topical / Word Study / Chronological Schedule
    if (plan.curatedSchedule && plan.curatedSchedule.length > 0) {
        plan.curatedSchedule.forEach((item, index) => {
            const eventDate = new Date(startDate);
            eventDate.setDate(startDate.getDate() + index);

            const passagesSummary = item.passages.map(p => {
                const range = p.verseStart ? `:${p.verseStart}${p.verseEnd ? `-${p.verseEnd}` : ''}` : '';
                return `${p.book} ${p.chapter}${range}`;
            }).join(', ');

            entries.push({
                date: eventDate,
                dayNumber: item.day || index + 1,
                title: item.title || `Day ${index + 1}: ${passagesSummary}`,
                passagesSummary,
                description: `Parchments Lectio Plan: ${plan.name}\n\nAssigned Passages:\n${passagesSummary}${item.topic ? `\nTopic: ${item.topic}` : ''}${item.notes ? `\n\nStudy Notes:\n${item.notes}` : ''}\n\nOpen Parchments to read and journal.`
            });
        });
        return entries;
    }

    // Case 2: Sequential Track Schedule
    const totalDays = Math.max(1, Math.ceil((plan.endDate - plan.startDate) / (1000 * 60 * 60 * 24)));
    
    // Simulate tracks advancement from startBook and chaptersPerDay
    const simulatedTracks = plan.tracks.map(t => ({
        ...t,
        simulatedBook: t.startBook,
        simulatedChapter: 1,
        isFinished: false
    }));

    for (let day = 0; day < totalDays; day++) {
        const eventDate = new Date(startDate);
        eventDate.setDate(startDate.getDate() + day);

        const trackReadings: string[] = [];

        simulatedTracks.forEach(track => {
            if (track.isFinished) return;

            const segments = getDailySegments({
                name: track.name,
                startBook: track.startBook,
                endBook: track.endBook,
                chaptersPerDay: track.chaptersPerDay,
                currentBook: track.simulatedBook,
                currentChapter: track.simulatedChapter
            });

            if (segments.length > 0) {
                const summary = segments.map(s => {
                    if (s.chapters.length === 1) return `${s.book} ${s.chapters[0]}`;
                    return `${s.book} ${s.chapters[0]}-${s.chapters[s.chapters.length - 1]}`;
                }).join(', ');
                trackReadings.push(`${track.name}: ${summary}`);

                // Advance simulated cursor
                const nextPos = advanceChapters(
                    track.simulatedBook,
                    track.simulatedChapter,
                    track.chaptersPerDay,
                    track.startBook,
                    track.endBook
                );
                track.simulatedBook = nextPos.book;
                track.simulatedChapter = nextPos.chapter;

                if (track.endBook && nextPos.book === track.endBook) {
                    const endBookData = BIBLE_BOOKS.find(b => b.name === track.endBook);
                    if (endBookData && nextPos.chapter > endBookData.chapters) {
                        track.isFinished = true;
                    }
                }
            }
        });

        if (trackReadings.length === 0) break; // Finished all tracks

        const passagesSummary = trackReadings.join(' • ');
        entries.push({
            date: eventDate,
            dayNumber: day + 1,
            title: `Lectio: ${passagesSummary}`,
            passagesSummary,
            description: `Parchments Lectio Plan: ${plan.name}\nDay ${day + 1} of ${totalDays}\n\nAssigned Readings:\n${trackReadings.join('\n')}\n\nOpen Parchments to read and complete today's session.`
        });
    }

    return entries;
};

/**
 * Builds RFC 5545 standard .ics file content
 */
export const buildIcsString = (plan: ReadingPlan): string => {
    const entries = generatePlanCalendarEntries(plan);
    const now = formatIcsDateTime(new Date());

    let ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Parchments App//Lectio Bible Reading Plan//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeIcsText(`Parchments - ${plan.name}`)}`,
        'X-WR-TIMEZONE:UTC'
    ];

    entries.forEach((entry, idx) => {
        // Schedule event at 07:00 AM local time or date-only
        const dStart = formatIcsDate(entry.date);
        const uid = `lectio-${plan.id}-day-${entry.dayNumber}-${idx}@parchments.app`;

        ics.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${now}`,
            `DTSTART;VALUE=DATE:${dStart}`,
            `SUMMARY:${escapeIcsText(`📖 ${entry.title}`)}`,
            `DESCRIPTION:${escapeIcsText(entry.description)}`,
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Daily Bible Reading Reminder',
            'TRIGGER:-PT15M',
            'END:VALARM',
            'END:VEVENT'
        );
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
};

/**
 * Triggers universal cross-platform download of the .ics file
 */
export const downloadPlanIcs = async (plan: ReadingPlan): Promise<void> => {
    const icsContent = buildIcsString(plan);
    const fileName = `${plan.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-reading-plan.ics`;

    // 1. Try Web Share API with file if supported (iOS / Android Web)
    if (typeof navigator !== 'undefined' && (navigator as any).share && (navigator as any).canShare) {
        try {
            const file = new File([icsContent], fileName, { type: 'text/calendar;charset=utf-8' });
            if ((navigator as any).canShare({ files: [file] })) {
                await (navigator as any).share({
                    files: [file],
                    title: `${plan.name} Reading Plan`,
                    text: `Import ${plan.name} into your Calendar.`
                });
                return;
            }
        } catch {
            // Fall back to standard blob download
        }
    }

    // 2. Standard Blob Download (Desktop Web, Tauri, Android browsers)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/**
 * Generates an instant "Add Today's Reading to Google Calendar" web link
 */
export const getGoogleCalendarAddUrl = (entry: CalendarDayEntry): string => {
    const dStr = formatIcsDate(entry.date);
    const nextDay = new Date(entry.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDStr = formatIcsDate(nextDay);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `📖 ${entry.title}`,
        dates: `${dStr}/${nextDStr}`,
        details: entry.description
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
