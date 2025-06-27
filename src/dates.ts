// days of the week
// TODO: much of this code could be removed by creating a dates module and exporting a custom dayjs
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timeZone from "dayjs/plugin/timezone.js";
import localeData from "dayjs/plugin/localeData.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import updateLocale from 'dayjs/plugin/updateLocale';

// extend the parse formatter
dayjs.extend(customParseFormat);

// extend the locale updater
dayjs.extend(updateLocale);

// work in the local time zone and locale
dayjs.extend(localeData);
dayjs.extend(utc);
dayjs.extend(timeZone);
dayjs.tz.guess();

// two-digit YY strings because that's how ToDo+ marks items done
const FORMAT_STRINGS = [
    "YYYY-MM-DD hh:mm:ss",
    "YY-MM-DD hh:mm:ss",
    "YYYY-MM-DD hh:mm",
    "YY-MM-DD hh:mm",
    "YYYY-MM-DD",
    "YY-MM-DD",
    "M/D",
    "M-D",
];

export const RELATIVE_DAYS = ["yesterday", "today", "tomorrow"];
export const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
export const dayNames = dayjs.weekdays();
export const dayNamesShort = dayjs.weekdaysShort();
export const dayNamesMin = dayjs.weekdaysMin();
export const dayNamesSingleLetter = ['U', 'M', 'T', 'W', 'R', 'F', 'S']; // i18n!!!

export function cleanDate(dayString: string | undefined): dayjs.Dayjs {
    // attempts to turn the string into a Dayjs object
    if (dayString === undefined) {
        return dayjs();
    }

    // try a format string
    const ret = dayjs(dayString, FORMAT_STRINGS);
    if (ret.isValid()) {
        return ret;
    }

    // try a relative day name token
    const relativeDayIndex = RELATIVE_DAYS.findIndex(
        (item: string) => item === dayString
    );
    if (relativeDayIndex !== -1) {
        const ret = dayjs().add(relativeDayIndex - 1, "day"); // -1 because "yesterday" will have an index of 0
        if (ret.isValid()) {
            return ret;
        }
    }

    // try a day name token
    const dayNumber = dayNameToWeekday(dayString);
    if (dayNumber !== -1) {
        const ret = nextWeekday(dayNumber, todayDay());
        if (ret.isValid()) {
            return ret;
        }
    }

    // default to today
    return dayjs();
}

export function todayDay(): Dayjs {
    return dayjs();
}
export function todayName(): string {
    return dayNames[todayDay().day()];
}

export function normalizeDayName(dayName: string): string {
    // look in dayNames, dayNamesShort, and dayNamesMin for the day name
    // if it exists, return the full name from dayNames at the same index

    // if the array has only members with exactly the same number of letters, trim the dayName to that number of letters (e.g. Thurs => Thu)

    let index = findStringInArray(dayName, dayNames);
    if (index === -1) {
        index = findStringInArray(dayName, dayNamesShort);
    }
    if (index === -1) {
        index = findStringInArray(dayName, dayNamesMin);
    }
    if (index === -1) {
        index = findStringInArray(dayName, dayNamesSingleLetter
        ); // special weekday names
    }
    if (index === -1) {
        return dayName; // not found, return the original
    }
    return dayNames[index];

}

export function findStringInArray(input: string, array: string[]): number {

    const allStringsSameLength = array.every(
        (item) => item.length === array[0].length);
    const searchInput = allStringsSameLength ? input.slice(0, array[0].length) : input;
    return array.findIndex((item) => item.toLowerCase() === searchInput.toLowerCase());

}

/// returns -1 on nonexistent
export function dayNameToWeekday(dayName: string): number {
    // find the singular version of the day name
    return dayNames.indexOf(normalizeDayName(dayName));
}

export function monthNameToNumber(monthName: string): number {
    // find the month name in the month array
    return dayjs.months().indexOf(monthName);
}

export function daysPassed(dtBegin: Date, dtEnd: Date): number {
    const millisecondsPerDay = 1000 * 3600 * 24;
    return Math.floor(
        (treatAsUTC(dtEnd) - treatAsUTC(dtBegin)) / millisecondsPerDay
    );
}

export function treatAsUTC(date: Date): number {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result.getTime();
}

export function daysUntilWeekday(
    weekday: number | number[],
    fromDay: dayjs.Dayjs = dayjs()
): number {
    const weekdays = Array.isArray(weekday) ? weekday : [weekday];
    let minDays = Infinity;

    for (const day of weekdays) {
        let days = day - fromDay.day();
        if (days <= 0) {
            days += 7;
        }
        minDays = Math.min(minDays, days);
    }

    return minDays;
}
export function nextWeekday(
    weekday: number | number[],
    fromDay: dayjs.Dayjs = dayjs()
): dayjs.Dayjs {
    const days = daysUntilWeekday(weekday, fromDay);
    return fromDay.add(days, "day");
}


export function nextAnnual(
    anniversary: string,
    fromDay: dayjs.Dayjs = dayjs()
): dayjs.Dayjs {
    let currentAnniverary = cleanDate(anniversary);
    currentAnniverary = currentAnniverary.year(fromDay.year());

    while (
        fromDay.isSame(currentAnniverary) ||
        fromDay.isAfter(currentAnniverary)
    ) {
        currentAnniverary = currentAnniverary.add(1, "year");
    }

    return currentAnniverary;
}

export function getDaysFromRecurrencePattern(
    recur: string | undefined,
    fromDay: dayjs.Dayjs = dayjs()
): number {
    // what's the new due date?
    if (recur === undefined) {
        return 1;
    } // default
    const days = parseInt(recur);

    if (Number.isNaN(days)) {
        // NON-NUMERIC recurrence patterns

        // pattern 1: day of the week, pluralized
        const test = dayNameToWeekday(recur);
        if (test !== -1) {
            // set to be due on the next day of that name
            return daysUntilWeekday(test, fromDay);
        }
    }

    // default: recur every day
    return isNaN(days) ? 1 : days;
}
