import * as vscode from "vscode";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { parseTaskPaper } from "task-parser/index";
import { cleanDate, DEFAULT_DATE_FORMAT } from "./dates";
import { Settings } from "./Settings";
import { comparisonSequences, moveNode } from "./move-nodes";
import { caseInsensitiveCompare } from "./sort-lines";

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
    if (input.type !== "task" || !input.hasTag("due")) {
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

export function processTaskNode(
    taskNode: TaskPaperNode,
    settings: Settings,
    archive: TaskPaperNode | undefined,
    today: TaskPaperNode | undefined,
    future: TaskPaperNode | undefined
): void {
    var newNode: TaskPaperNode | undefined = undefined;

    // if (taskNode.value?.includes("plan trip")) {
    //     console.log();
    // }

    // does this node have children? if so, act on the children
    if (taskNode.children.length > 0) {
        taskNode.children.forEach((child) =>
            processTaskNode(child, settings, archive, today, future)
        );

        // remove any deleted children
        taskNode.children = taskNode.children.filter((item) => {
            return item.tagValue("ACTION") === "DELETE" ? false : true;
        });

        // sort the child tasks
        if (settings.sortFutureItems() && taskNode.type === "project") {
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

    // if task is done (or has no due date) check for a recurrence pattern
    if (
        taskNode.hasTag(["recur", "annual"]) &&
        (taskNode.hasTag("done") || !taskNode.hasTag("due"))
    ) {
        // Get the "source date" -- the day
        // after which to generate the next task
        // This is the date the task was last done,
        // or if that's unknown, then today.
        var sourceDate = cleanDate(taskNode.tagValue("done"));

        /// next recurrence date
        const nextDate = cleanDate(
            taskNode.tagValue("recur") || taskNode.tagValue("annual") || "1",
            sourceDate
        );

        /// case 1: already @done, so clone the node
        if (taskNode.hasTag("done")) {
            // clone the node
            newNode = taskNode.clone();

            newNode.removeTag(["done", "started", "lasted", "project"]);
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

    /// TODAY
    moveNode(taskNode, comparisonSequences.dueToday, today);
    moveNode(newNode, comparisonSequences.dueToday, today);

    /// ARCHIVE
    if (settings.archiveDoneItems()) {
        moveNode(taskNode, comparisonSequences.isDone, archive);
    }

    /// FUTURE
    if (!settings.recurringItemsAdjacent()) {
        moveNode(taskNode, comparisonSequences.isFuture, future);
    }

    return;
}

export function taskUnknownToBottom(
    aNode: TaskPaperNode,
    bNode: TaskPaperNode
): number {
    if (aNode.type === "unknown") {
        return 1;
    }
    if (bNode.type === "unknown") {
        return -1;
    }
    return 0;
}

export function taskDueDateCompare(
    aNode: TaskPaperNode,
    bNode: TaskPaperNode
): number {
    // one has no value (e.g. blank line); always sort to bottom
    // TODO: I think this is redundant?
    if (aNode.value === "") {
        return 1;
    }
    if (bNode.value === "") {
        return -1;
    }

    // no due dates: alphabetical order
    if (!aNode.hasTag("due") && !bNode.hasTag("due")) {
        return caseInsensitiveCompare(aNode.value ?? "", bNode.value ?? "");
    }

    // one due date: sort item with no due date to the top
    if (!aNode.hasTag("due") || !bNode.hasTag("due")) {
        return aNode.hasTag("due") ? 1 : -1;
    }

    // two due dates
    const aDate = cleanDate(aNode.tagValue("due"));
    const bDate = cleanDate(bNode.tagValue("due"));

    if (aDate.isSame(bDate)) {
        return 0;
    }

    return aDate.isBefore(bDate) ? -1 : 1;
}
