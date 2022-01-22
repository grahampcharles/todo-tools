import * as vscode from "vscode";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";
import { parseTaskPaper } from "task-parser/build/index";
import { cleanDate, getDaysFromRecurrencePattern } from "./dates";

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

/**
 *Returns all tasks that are @due today or earlier, not @done, and not in "Today"
 *
 * @export
 * @param {TaskPaperNode} node
 * @return {*}  {TaskPaperNode[]}
 */
export function getDueTasks(node: TaskPaperNode): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // does this node have children? if so, act on the children
    // but skip the Today project
    if (!(node.type === "project" && node.value?.toLowerCase() === "today")) {
        if (node.children !== undefined) {
            node.children.forEach((childNode) =>
                results.push(...getDueTasks(childNode))
            );
        }
    }

    // only act on undone tasks
    if (node.type !== "task" || node.hasTag("done")) {
        return results;
    }

    // push any tasks that are due on or before today
    if (
        node.hasTag("due") &&
        cleanDate(node.tagValue("due")).isSameOrBefore(dayjs(), "day")
    ) {
        // return a clone of the task
        const newNode = node.clone();
        // clear metatags relating to task completion
        newNode.removeTag(["project", "lasted", "started"]);
        // force all "Today" nodes to depth 2
        newNode.depth = 2;
        results.push(newNode);

        // set the task to be erased
        node.setTag("action", "DELETE");
    }

    return results;
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
        if (node.type === "project") {
            projectName.push(node.value || "Untitled Project");
        }
        node.children.forEach((childNode) =>
            results.push(...getDoneTasks(childNode, projectName))
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
export function getFutureTasks(input: TaskPaperNode): TaskPaperNode[] {
    const results = new Array<TaskPaperNode>();

    // does this node have children? if so, act on the children
    if (input.children !== undefined) {
        input.children.forEach((child) =>
            results.push(...getFutureTasks(child))
        );
    }

    // only further process tasks
    if (input.type !== "task") {
        return results;
    }

    // clone the node
    const newNode = input.clone();

    // filter for the recurring events (recur OR annual)
    // that have been done OR don't have a due date
    if (
        newNode.hasTag(["recur", "annual"]) &&
        (!newNode.hasTag("due") || newNode.hasTag("done"))
    ) {
        // get the updated due date; default to now
        var due: dayjs.Dayjs = dayjs(""); // intentionally invalid

        if (newNode.hasTag("recur")) {
            due = cleanDate(newNode.tagValue("done") || undefined);
            due = due.add(
                getDaysFromRecurrencePattern(newNode.tagValue("recur"), due),
                "day"
            );
        }
        if (newNode.hasTag("annual")) {
            due = cleanDate(newNode.tagValue("annual")).year(dayjs().year());
            if (due.isBefore(dayjs())) {
                due = due.add(1, "year");
            }
        }

        // valid due date?
        if (!due.isValid()) {
            return results;
        }

        // set the updated due date
        newNode.setTag("due", due.format("YYYY-MM-DD"));

        // remove the recur flag from the current location
        input.removeTag(["recur", "annual"]);

        // if there's a @done, flag this item to be updated in its current location;
        // otherwise, flag this item to be deleted from its current location
        input.setTag("action", input.hasTag("done") ? "UPDATE" : "DELETE");

        // copy this item without @done, @lasted, @started
        newNode.removeTag(["done", "lasted", "started"]);
        results.push(newNode);
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
