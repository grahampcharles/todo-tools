// from vscode-sort-lines
import { TaskPaperNode } from "./task-parser";
import { cleanDate, todayDay } from "./dates";
import { addProjectTag } from "./taskpaper-utils";

type NodeComparisonAlgorithm = (inputNode: TaskPaperNode) => boolean;

export function moveNode(
    node?: TaskPaperNode,
    test?: NodeComparisonAlgorithm,
    target?: TaskPaperNode,
    addProjectTagOnMove: boolean = false
) {
    // guards
    const nodeOrTargetMissing = target === undefined || node === undefined;
    if (nodeOrTargetMissing) {
        return;
    }
    const nodeHasBeenDeleted = target.tagValue("ACTION") === "DELETE";
    if (nodeHasBeenDeleted) {
        return;
    }
    const nodeAlreadyInTarget = node.parent === target;
    if (nodeAlreadyInTarget) {
        return;
    }

    // run the test on the node
    const move = test ? test(node) : true;

    if (move) {
        const newNode = node.clone();
        if (addProjectTagOnMove) {
            addProjectTag(newNode);
        }

        newNode.depth = target.depth + 1;
        newNode.parent = target;

        target.children.push(newNode);

        node.setTag("ACTION", "DELETE");
    }
}

// TODO: for these, only return true for tasks?

export function isDone(inputNode: TaskPaperNode): boolean {
    // TODO: only return true if is done before today?
    // TODO: only return true for tasks?
    return inputNode.hasTag("done");
}

export function isFuture(inputNode: TaskPaperNode): boolean {
    // TODO: only return true for tasks?
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isAfter(todayDay(), "day")
    );
}

export function isDueTodayOrBefore(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isSameOrBefore(todayDay(), "day")
    );
}

export function isDueToday(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isSame(todayDay(), "day")
    );
}

export function isOverdue(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isBefore(todayDay(), "day")
    );
}
