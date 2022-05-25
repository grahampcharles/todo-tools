// from vscode-sort-lines
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { cleanDate, todayDay } from "./dates";

type NodeComparisonAlgorithm = (inputNode: TaskPaperNode) => boolean;

export function moveNode(
    node?: TaskPaperNode,
    test?: NodeComparisonAlgorithm,
    target?: TaskPaperNode
) {
    if (target === undefined || node === undefined) {
        return;
    }

    // check if node is already in target
    // TODO:  will this work?
    // if not, add a comparison (isParent())
    if (node.parent === target) {
        return;
    }

    const move = test ? test(node) : true;

    if (move) {
        const newNode = node.clone();
        newNode.depth = target.depth + 1;
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
