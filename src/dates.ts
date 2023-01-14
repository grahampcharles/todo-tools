// days of the week
// TODO: much of this code could be removed by creating a dates module and exporting a custom dayjs
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timeZone from "dayjs/plugin/timezone";
import localeData from "dayjs/plugin/localeData";
import customParseFormat from "dayjs/plugin/customParseFormat";

// extend the parse formatter
dayjs.extend(customParseFormat);

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

export function cleanDate(dayString: string | undefined): dayjs.Dayjs {
    // attempts to turn the string into a Dayjs object
    if (dayString === undefined) {
        return dayjs();
    }

    // try a format string
    var ret = dayjs(dayString, FORMAT_STRINGS);
    if (ret.isValid()) {
        return ret;
    }

    // try a relative day name token
    const relativeDayIndex = RELATIVE_DAYS.findIndex(
        (item: string) => item === dayString
    );
    if (relativeDayIndex !== -1) {
        ret = dayjs().add(relativeDayIndex - 1, "day"); // -1 because "yesterday" will have an index of 0
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

/// returns -1 on nonexistent
export function dayNameToWeekday(dayName: string): number {
    // find the singular version of the day name
    return dayNames.indexOf(dayName);
}
export function dayNamePluralToWeekday(dayName: string): number {
    // find the singular version of the day name by slicing off the last letter
    // TODO: i8n; maybe replace with @weekly(Tuesday) or something, since day names
    // are differently pluralized in different languages; e.g. los martes
    return dayNames.indexOf(dayName.slice(0, -1));
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
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result.getTime();
}

export function daysUntilWeekday(
    weekday: number,
    fromDay: dayjs.Dayjs = dayjs()
): number {
    var days = weekday - fromDay.day();
    if (days <= 0) {
        days = days + 7;
    }
    return days;
}
export function nextWeekday(
    weekday: number,
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
    currentAnniverary.set("year", fromDay.year()) ;

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
    var days = parseInt(recur);

    if (isNaN(days)) {
        //// NON-NUMERIC recurrence patterns

        // pattern 1: day of the week, pluralized
        var test = dayNamePluralToWeekday(recur);
        if (test !== -1) {
            // set to be due on the next day of that name
            return daysUntilWeekday(test, fromDay);
        }
    }

    // default: recur every day
    return isNaN(days) ? 1 : days;
}
