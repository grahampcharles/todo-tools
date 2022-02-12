import * as vscode from "vscode";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";
import { parseTaskPaper } from "task-parser/build/index";
import {
    cleanDate,
    DEFAULT_DATE_FORMAT,
    getDaysFromRecurrencePattern,
    todayDay,
} from "./dates";

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
export async function parseTaskDocument(
    editor: vscode.TextEditor
): Promise<TaskPaperNode | undefined> {
    // parse the taskpaper again if possible
    try {
        return parseTaskPaper(editor.document.getText());
    } catch (error: any) {
        // report error to user
        await vscode.window.showInformationMessage(error.toString());
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

export function filterProjects(node: TaskPaperNode): TaskPaperNode[] {
    // returns only project nodes, flattened;
    const results = new Array<TaskPaperNode>();

    // skip Archive
    if (node.type === "project" && node.value?.toLowerCase() === "archive") {
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

export function getDoneTasks(
    node: TaskPaperNode,
    projectName: string[] = []
): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // don't act on a top-level Archive project
    if (
        node.type === "project" &&
        node.value?.toLowerCase() === "archive" &&
        node.depth === 1
    ) {
        return results;
    }

    // does this node have children? if so, act on the children
    if (node.children !== undefined) {
        // add the project name to the parser
        const newProjectName = [
            ...projectName,
            ...(node.type === "project" ? [node.value || "Untitled"] : []),
        ];

        node.children.forEach((childNode) =>
            results.push(...getDoneTasks(childNode, newProjectName))
        );
    }

    // only act on done tasks
    if (!(node.type === "task" && node.hasTag("done"))) {
        return results;
    }

    // return a clone of the task
    const newNode = node.clone();

    // add a project metatag (unless it already has one)
    if (!newNode.hasTag("project")) {
        newNode.setTag("project", projectName.join("."));
    }

    // force all "Archive" nodes to depth 2
    newNode.depth = 2;
    results.push(newNode);

    // set the task to be erased
    node.setTag("action", "DELETE");

    return results;
}

// Returns tasks that have an action flag set
export function getUpdates(node: TaskPaperNode): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // does this node have children? if so, act on the children
    if (node.children !== undefined) {
        node.children.forEach((child) => results.push(...getUpdates(child)));
    }

    if (node.hasTag("action")) {
        results.push(node);
    }
    return results;
}

// Returns tasks that have a future recurrence flag
export function replaceDueTokens(input: TaskPaperNode): void {
    // only further process tasks that have due dates
    if (input.type !== "task" || !input.hasTag("due")) {
        return;
    }

    // replace date tokens
    const due = cleanDate(input.tagValue("due"));
    if (due.isValid()) {
        const dueFormatted = due.format(DEFAULT_DATE_FORMAT);
        if (dueFormatted !== input.tagValue("due")) {
            input.setTag("due", dueFormatted);
            input.setTag("action", "UPDATE");
        }
    }
}

// processes all tasks
export function processTaskNode(input: TaskPaperNode): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // does this node have children? if so, act on the children
    if (input.children !== undefined) {
        input.children.forEach((child) =>
            results.push(...processTaskNode(child))
        );
    }

    // only further process tasks
    if (input.type !== "task") {
        return results;
    }

    // handle special @due tokens
    replaceDueTokens(input);

    // if there's a due date and no done date,
    // stop processing; we don't recur any task
    // that's due and undone
    if (input.hasTag("due") && !input.hasTag("done")) {
        return results;
    }

    // check for a recurrence pattern
    if (input.hasTag(["recur", "annual"])) {
        // Get the "source date" -- the day
        // after which to generate the next task
        // This is the date the task was last done,
        // or if that's unknown, then today.
        var sourceDate = cleanDate(input.tagValue("done"));

        /// next recurrence date
        const nextDate = cleanDate(
            input.tagValue("recur") || input.tagValue("annual") || "1",
            sourceDate
        );

        /// case 1: already @done, so clone the node
        if (input.hasTag("done")) {
            // clone the node
            const newNode = input.clone();

            newNode.removeTag(["done", "started", "lasted"]);
            newNode.setTag("due", nextDate.format(DEFAULT_DATE_FORMAT));

            // add new node to results
            results.push(newNode);

            // clear the recurrence from the original
            input.removeTag(["recur", "annual"]);
        } else {
            /// case 2: not yet @done, so just set the due date
            input.setTag("due", nextDate.format(DEFAULT_DATE_FORMAT));
        }

        /// set update flag
        input.setTag("action", "UPDATE");
    }

    return results;
}

// Returns tasks should move to Today
export function getNewTodays(input: TaskPaperNode): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // skip Today and Archive projects
    if (
        input.type === "project" &&
        ["Today", "Archive"].includes(input.value ?? "")
    ) {
        return results;
    }

    // does this node have children? if so, act on the children
    input.children.forEach((child) => results.push(...getNewTodays(child)));

    // if this is a task where due <= today, then add it to the list
    if (
        input.type === "task" &&
        input.hasTag("due") &&
        !input.hasTag("done") &&
        cleanDate(input.tagValue("due")).isSameOrBefore(todayDay)
    ) {
        const newNode = input.clone();
        newNode.depth = 2;
        results.push(newNode);

        // delete from the original spot
        input.setTag("action", "DELETE");
    }

    return results;
}

// Returns tasks should move to Future
export function getNewFutures(input: TaskPaperNode): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // skip Today project
    if (input.type === "project" && input.value !== "Today") {
        return results;
    }

    // does this node have children? if so, act on the children
    input.children.forEach((child) => results.push(...getNewFutures(child)));

    // if this is a task where due <= today, then add it to the list
    if (
        input.type === "task" &&
        input.hasTag("due") &&
        cleanDate(input.tagValue("due")).isAfter(todayDay)
    ) {
        const newNode = input.clone();
        newNode.depth = 2;
        results.push(newNode);

        // delete from the original spot
        input.setTag("action", "DELETE");
    }

    return results;
}

export function removeDuplicates(
    nodeList: TaskPaperNode[],
    masterNode: TaskPaperNode
): TaskPaperNode[] {
    // removes any items in the nodeList that already exist on the masterNode
    return nodeList.filter((node) => {
        return !masterNode.containsItem(node);
    });
}

export function dueSort(a: TaskPaperNode, b: TaskPaperNode) {
    if (!a.hasTag("due") || !b.hasTag("due")) {
        return 0;
    }
    return dayjs(b.tagValue("due")).isSameOrBefore(a.tagValue("due")) ? 1 : -1;
}
