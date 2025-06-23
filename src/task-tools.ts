import dayjs, { Dayjs } from "dayjs";
import { TaskPaperNode } from "task-parser";
import {
    cleanDate,
    dayNameToWeekday,
    nextAnnual,
    nextWeekday,
    todayDay,
} from "./dates";

export function getNextDueDate(node: TaskPaperNode): Dayjs {
    /// retrieves the next due date

    // Get the "source date" -- the day
    // after which to generate the next task
    // This is the date the task was last done,
    // or if that's unknown, then default to
    // today. For done annual items, default to the higher
    // of the due date or the done date.

    // in any case, never return a due date before today
    const isAnnual = node.hasTag("annual");

    const doneDate = cleanDate(node.tagValue("done"));
    const dueDate = cleanDate(node.tagValue("due"));
    const recurString = node.tagValue("recur") ?? "";

    const sourceDate = isAnnual
        ? latestDate([doneDate, dueDate, todayDay()])
        : latestDate([doneDate, todayDay()]);

    /// next recurrence date
    // next annual: find it

    if (isAnnual) {
        const ret = nextAnnual(node.tagValue("annual") || "1/1", sourceDate);
        if (ret.isValid()) {
            return ret;
        }
    }


    // simple number: just add it
    const dayOffset = parseInt(recurString);
    if (!isNaN(dayOffset)) {
        const ret = (sourceDate ?? dayjs()).add(dayOffset, "day");
        if (ret.isValid()) {
            return ret;
        }
    }

    // next weekday: find it
    const weekday = dayNameToWeekday(recurString);
    if (weekday !== -1) {
        const ret = nextWeekday(weekday, sourceDate);
        if (ret.isValid()) {
            return ret;
        }
    }

    // next working day
    if (recurString === "weekday") {
        const day = sourceDate.day();
        // if today is a weekend or Friday, then next weekday is next Monday
        if (day === 0 || day === 6 || day === 5) {
            return nextWeekday(1, sourceDate);
        }
        // otherwise, next weekday is tomorrow
        return nextWeekday(day + 1, sourceDate);
    }

    return cleanDate(node.tagValue("recur") || "1");
}

export function latestDate(dates: Dayjs[]) {
    return dates.reduce(function (prev, current) {
        return prev.isAfter(current) ? prev : current;
    });
}
