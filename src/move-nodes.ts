// from vscode-sort-lines
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { cleanDate, todayDay } from "./dates";

type NodeComparisonAlgorithm = (inputNode: TaskPaperNode) => boolean;

export function moveNode(
    node?: TaskPaperNode,
    test?: NodeComparisonAlgorithm,
    target?: TaskPaperNode
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
        newNode.depth = target.depth + 1;
        newNode.parent = target;
        target.children.push(newNode);

        node.setTag("ACTION", "DELETE");
    }
}

export function isDone(inputNode: TaskPaperNode): boolean {
    // TODO: only return true if is done before today?
    return inputNode.hasTag("done");
}

export function isFuture(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isAfter(todayDay, "day")
    );
}

export function isDueTodayOrBefore(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isSameOrBefore(todayDay, "day")
    );
}

export function isDueToday(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isSame(todayDay, "day")
    );
}

export function isOverdue(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isBefore(todayDay, "day")
    );
}
