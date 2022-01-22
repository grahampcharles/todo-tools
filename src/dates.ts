// days of the week
import dayjs from "dayjs";
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

const FORMAT_STRINGS = [
    "YYYY-MM-DD hh:mm:ss",
    "YY-MM-DD hh:mm:ss",
    "YY-MM-DD hh:mm",
    "YY-MM-DD",
];

export const dayNames = dayjs.weekdays();

export function cleanDate(dayString: string | undefined): dayjs.Dayjs {
    // attempts to turn the string into a Dayjs object
    var ret = dayjs(dayString);
    if (!ret.isValid()) {
        ret = dayjs(dayString, FORMAT_STRINGS);
    }

    return ret;
}

/// returns -1 on nonexistent
export function dayNameToWeekday(dayName: string): number {
    // find the singular version of the day name
    return dayNames.indexOf(dayName);
}
export function dayNamePluralToWeekday(dayName: string): number {
    // find the singular version of the day name by slicing off the last letter
    // TODO: i8n; maybe replace with @weekly(Tuesday) or something, since day names are differently pluralized in different languages; e.g. los martes
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

export const todayDay = dayjs();
export const todayName = dayNames[todayDay.day()];

export function daysUntilWeekday(
    weekday: number,
    fromday: dayjs.Dayjs = dayjs()
): number {
    var days = weekday - fromday.day();
    if (days <= 0) {
        days = days + 7;
    }
    return days;
}

export function getDaysFromRecurrencePattern(
    recur: string | undefined,
    fromday: dayjs.Dayjs = dayjs()
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
            return daysUntilWeekday(test, fromday);
        }
    }

    // default: recur every day
    return isNaN(days) ? 1 : days;
}
