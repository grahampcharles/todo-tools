import * as vscode from "vscode";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import {
    cleanDate,
    todayDay,
    DEFAULT_DATE_FORMAT,
    RELATIVE_DAYS,
} from "./dates";
import { Settings } from "./Settings";
import {
    isDone,
    isDueToday,
    isDueTodayOrBefore,
    isFuture,
    isOverdue,
    moveNode,
} from "./move-nodes";
import { caseInsensitiveCompare } from "./sort-lines";
import { TaskPaperNode } from "./task-parser";

// work in the local time zone
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.guess();

// date comparison extension
dayjs.extend(isSameOrBefore);

/**
 *parseTaskDocument
 *
 * @export
 * @param {*} document Document returned by the taskpaper parser.
 * @return {*} all the tasks in the document.
 */
export function parseTaskDocument(
    editor: vscode.TextEditor
): TaskPaperNode | undefined {
    try {
        const ret = new TaskPaperNode(editor.document.getText());
        return ret;
    } catch (error: any) {
        // report error to user
        vscode.window.showInformationMessage(error.toString());
        return undefined;
    }
}

// returns a top-level project with the given name
export function getProjectByName(
    node: TaskPaperNode,
    name: string
): TaskPaperNode | undefined {
    return node.children.find(
        (node: TaskPaperNode) => node.type === "project" && node.value === name
    );
}

export function addProject(
    node: TaskPaperNode,
    name: string,
    location: "bottom" | "top" | "above settings" = "above settings"
) {
    // already exists?
    if (projectExistsByName(node, name)) {
        return;
    }

    const newProject = new TaskPaperNode(`${name}:`); // colon makes it a project
    newProject.children.push(new TaskPaperNode("")); // blank line (TODO: check if this automatic?)

    if (location === "top") {
        node.children.unshift(newProject);
        return;
    }

    if (location === "above settings") {
        const settingsIndex = node.children.findIndex(
            (child) => child.value?.toLowerCase() === "settings"
        );
        if (settingsIndex !== -1) {
            node.children.splice(settingsIndex, 0, newProject);
            return;
        }
    }

    // default to bottom
    node.children.push(newProject);
}

// returns a top-level project with the given name
export function projectExistsByName(
    node: TaskPaperNode,
    name: string
): boolean {
    return (
        node.children.find(
            (node: TaskPaperNode) =>
                node.type === "project" && node.value === name
        ) !== undefined
    );
}

export function filterProjects(node: TaskPaperNode): TaskPaperNode[] {
    // returns only project nodes, flattened;
    const results = new Array<TaskPaperNode>();

    // skip Archive
    if (node.type === "project" && node.value?.toLowerCase() === "archive") {
        return results;
    }

    // skip Settings
    if (node.type === "project" && node.value?.toLowerCase() === "settings") {
        return results;
    }

    // does this node have children? if so, act on the children
    if (node.children !== undefined) {
        node.children.forEach((childNode) =>
            results.push(...filterProjects(childNode))
        );
    }

    // only push projects on the stack
    if (node.type === "project") {
        results.push(node);
    }

    return results;
}

/**
 *Returns all tasks that are @due and not @done; does *not* recurse
 *
 * @export
 * @param {TaskPaperNode} node
 * @return {*}  {TaskPaperNode[]}
 */
export function getDueTasks(node: TaskPaperNode): TaskPaperNode[] {
    // return any direct-child tasks that are due on or before today
    return node.children.filter(
        (childNode: TaskPaperNode) =>
            childNode.type === "task" &&
            childNode.hasTag("due") &&
            !childNode.hasTag("done")
    );
}

// replaces date tokens (like "today", "Monday") with clean due dates
export function replaceDueTokens(input: TaskPaperNode): void {
    // only further process tasks that have due dates
    if (input.type !== "task") {
        return;
    }

    // pre-process special tags (yesterday, today, tomorrow)
    RELATIVE_DAYS.forEach((relativeDay) => {
        if (input.hasTag(relativeDay)) {
            if (!input.hasTag("due")) {
                input.setTag("due", relativeDay);
            }
            input.removeTag(relativeDay);
        }
    });

    // if there's a due date, clean it
    if (!input.hasTag("due")) {
        return;
    }

    // replace date tokens
    const due = cleanDate(input.tagValue("due"));
    if (due.isValid()) {
        const dueFormatted = due.format(DEFAULT_DATE_FORMAT);
        if (dueFormatted !== input.tagValue("due")) {
            input.setTag("due", dueFormatted);
        }
    }
}

export function addRelativeDateFlag(input: TaskPaperNode) {
    if (input.hasTag("done") || !input.hasTag("due")) {
        return;
    }

    const due = cleanDate(input.tagValue("due"));
    if (due.isValid()) {
        // add relative date flags
        if (due.isSame(todayDay(), "day")) {
            input.setTag("today", undefined);
        }
        if (due.add(1, "day").isSame(todayDay(), "day")) {
            input.setTag("yesterday", undefined);
        }
        if (due.subtract(1, "day").isSame(todayDay(), "day")) {
            input.setTag("tomorrow", undefined);
        }
    }
}

export function updateStatistics(
    taskNode: TaskPaperNode,
    statsProject: TaskPaperNode | undefined
) {
    if (statsProject === undefined) {
        return;
    }

    const statistics = getStatistics(taskNode);

    const doneProject = new TaskPaperNode("\tDone:");
    const dueProject = new TaskPaperNode("\tDue:");

    pushStatisticMapToProject(statistics.done, doneProject);
    pushStatisticMapToProject(statistics.due, dueProject);

    statsProject.children = [
        new TaskPaperNode(`\tToday: ${statistics.today}`),
        new TaskPaperNode(`\tOverdue: ${statistics.overdue}`),
        doneProject,
        // dueProject,
    ];
}

export function pushStatisticMapToProject(
    map: Map<string, number>,
    project: TaskPaperNode
) {
    for (let [date, value] of map) {
        project.children.push(new TaskPaperNode(`\t\t${date}: ${value}`));
    }
}

type StatisticsType = {
    done: Map<string, number>;
    due: Map<string, number>;
    today: number;
    overdue: number;
};

export function getStatistics(node: TaskPaperNode): StatisticsType {
    const ret = {
        done: new Map<string, number>(),
        due: new Map<string, number>(),
        today: 0,
        overdue: 0,
    } as StatisticsType;

    console.log(node.value);

    if (node.value === "Archive") {
        console.log("made it!");
    }

    // get this task count
    if (isDone(node)) {
        addTally(ret.done, node.tagValue("done"));
    }
    if (isDueTodayOrBefore(node)) {
        addTally(ret.due, node.tagValue("due"));
    }
    if (isOverdue(node)) {
        ret.overdue += 1;
    }
    if (isDueToday(node)) {
        ret.today += 1;
    }

    // get child task counts
    node.children.forEach((childNode) => {
        const childStats = getStatistics(childNode);

        if (childStats.done.size > 0) {
            for (let [date, value] of childStats.done) {
                addTally(ret.done, date, value);
            }
        }

        if (childStats.due.size > 0) {
            for (let [date, value] of childStats.due) {
                addTally(ret.due, date, value);
            }
        }

        ret.overdue += childStats.overdue;
        ret.today += childStats.today;
    });

    return ret;
}

export function addTally(
    accumulator: Map<string, number>,
    date: string | undefined,
    count: number = 1
) {
    const dateString = cleanDate(date).format("YYYY-MM-DD");
    accumulator.set(dateString, (accumulator.get(dateString) ?? 0) + count);
}

export function processTaskNode(
    taskNode: TaskPaperNode,
    settings: Settings,
    archive: TaskPaperNode | undefined,
    today: TaskPaperNode | undefined,
    future: TaskPaperNode | undefined,
    overdue: TaskPaperNode | undefined
): void {
    var newNode: TaskPaperNode | undefined = undefined;

    // does this node have children? if so, act on the children
    if (taskNode.children.length > 0) {
        taskNode.children.forEach((child) =>
            processTaskNode(child, settings, archive, today, future, overdue)
        );

        // remove any deleted children
        taskNode.children = taskNode.children.filter((item) => {
            return item.tagValue("ACTION") === "DELETE" ? false : true;
        });

        // sort the child tasks
        if (settings.sortByDueDate() && taskNode.type === "project") {
            taskNode.children = taskNode.children.sort(taskDueDateCompare);
        }
    }

    /// if this is a task, make some updates
    // only further process tasks
    if (taskNode.type !== "task") {
        return;
    }

    // handle special @due tokens
    replaceDueTokens(taskNode);

    // add relative date tag
    if (settings.addTodayTomorrowYesterday()) {
        addRelativeDateFlag(taskNode);
    }

    // if task is done (or has no due date) check for a recurrence pattern
    const taskHasRecurrenceAndIsDone =
        taskNode.hasTag(["recur", "annual"]) &&
        (taskNode.hasTag("done") || !taskNode.hasTag("due"));

    if (taskHasRecurrenceAndIsDone) {
        // Get the "source date" -- the day
        // after which to generate the next task
        // This is the date the task was last done,
        // or if that's unknown, then default to
        // today. For done annual items, default to the higher
        // of the due date or the done date.
        const isAnnual = (taskNode.tagValue("due") ?? "")?.length <= 5;

        const doneDate = cleanDate(taskNode.tagValue("done"));
        const dueDate = cleanDate(taskNode.tagValue("due"));

        const sourceDate =
            isAnnual && dueDate.isAfter(doneDate) ? dueDate : doneDate;

        /// next recurrence date
        const nextDate = cleanDate(
            taskNode.tagValue("recur") || taskNode.tagValue("annual") || "1",
            sourceDate
        );

        /// case 1: already @done, so clone the node
        if (taskNode.hasTag("done")) {
            // clone the node
            newNode = taskNode.clone();

            newNode.removeTag([
                "done",
                "started",
                "lasted",
                "project",
                "duration",
                "today",
                "tomorrow",
                "yesterday",
            ]);
            newNode.setTag("due", nextDate.format(DEFAULT_DATE_FORMAT));

            // add new node as a sibling
            taskNode.parent?.children.push(newNode);

            // clear the recurrence from the original
            taskNode.removeTag(["recur", "annual", "project"]);
        } /// case 2: not yet @done, so just set the due date
        else {
            taskNode.setTag("due", nextDate.format(DEFAULT_DATE_FORMAT));
        }
    }

    /// move nodes as needed
    if (settings.overdueSection()) {
        /// TODAY / OVERDUE
        moveNode(taskNode, isDueToday, today);
        moveNode(newNode, isDueToday, today);

        moveNode(taskNode, isOverdue, overdue);
        moveNode(newNode, isOverdue, overdue);
    } else {
        /// TODAY
        moveNode(taskNode, isDueTodayOrBefore, today);
        moveNode(newNode, isDueTodayOrBefore, today);
    }

    /// ARCHIVE
    if (settings.archiveDoneItems()) {
        moveNode(taskNode, isDone, archive, true);
    }

    /// FUTURE
    if (!settings.recurringItemsAdjacent()) {
        moveNode(taskNode, isFuture, future);
        moveNode(newNode, isFuture, future);
    }

    return;
}

export function taskBlankToBottom(
    aNode: TaskPaperNode,
    bNode: TaskPaperNode
): number {
    if (isBlankLine(aNode)) {
        return isBlankLine(bNode) ? 0 : 1;
    }
    if (isBlankLine(bNode)) {
        return -1;
    }
    return 0;
}

export function isBlankLine(node: TaskPaperNode): boolean {
    if (node.type !== "unknown") {
        return false;
    }
    // return false if match anything non-whitespace
    return (node.value ?? "").match(/\S.*/gm) === null;
}

export function taskDueDateCompare(
    aNode: TaskPaperNode,
    bNode: TaskPaperNode
): number {
    const aBeforeB = -1;
    const bBeforeA = 1;
    const aAndBSame = 0;

    // always sort blank lines to bottom
    if (isBlankLine(aNode)) {
        return isBlankLine(bNode) ? aAndBSame : bBeforeA;
    }
    if (isBlankLine(bNode)) {
        return aBeforeB;
    }

    // only sort tasks
    if (!(aNode.type === "task" && bNode.type === "task")) {
        return 0;
    }

    // no due dates: alphabetical order
    if (!aNode.hasTag("due") && !bNode.hasTag("due")) {
        return caseInsensitiveCompare(aNode.value ?? "", bNode.value ?? "");
    }

    // one due date: sort item with no due date to the top
    if (!aNode.hasTag("due") || !bNode.hasTag("due")) {
        return aNode.hasTag("due") ? bBeforeA : aBeforeB;
    }

    // two due dates
    // is one (and only) one node high priority?
    if (aNode.hasTag("high") && !bNode.hasTag("high")) {
        return aBeforeB;
    }
    if (bNode.hasTag("high") && !aNode.hasTag("high")) {
        return bBeforeA;
    }
    // is one (and only) one node low priority?
    if (aNode.hasTag("low") && !bNode.hasTag("low")) {
        return bBeforeA;
    }
    if (bNode.hasTag("low") && !aNode.hasTag("low")) {
        return aBeforeB;
    }

    // is one (and only) one node already started?
    if (aNode.hasTag("started") && !bNode.hasTag("started")) {
        return aBeforeB;
    }
    if (bNode.hasTag("started") && !aNode.hasTag("started")) {
        return bBeforeA;
    }

    // same priority: sort by date
    const aDate = cleanDate(aNode.tagValue("due"));
    const bDate = cleanDate(bNode.tagValue("due"));

    if (aDate.isSame(bDate, "day")) {
        // same date: alphabetical order
        return caseInsensitiveCompare(aNode.value ?? "", bNode.value ?? "");
    }

    return aDate.isBefore(bDate, "day") ? aBeforeB : bBeforeA;
}
