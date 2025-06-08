// from vscode-sort-lines
import { TaskPaperNode } from "task-parser";
import { cleanDate, todayDay } from "./dates";
import { addProjectTag } from "./taskpaper-utils";

type NodeComparisonAlgorithm = (inputNode: TaskPaperNode) => boolean;

export function moveNode(
    node?: TaskPaperNode,
    tests?: NodeComparisonAlgorithm | NodeComparisonAlgorithm[],
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

    // ensure test is array
    if (tests !== undefined && !Array.isArray(tests)) {
        tests = [tests];
    }

    // run the tests on the node; default to true if there's no tests
    const move = tests ? tests.some((test) => test(node)) : true;

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

export function isDueBeforeToday(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isBefore(todayDay(), "day")
    );
}

export function isDueToday(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isSame(todayDay(), "day")
    );
}
// isDueTodayOrHasTodayTag
export function hasTodayTag(inputNode: TaskPaperNode): boolean {
    return inputNode.hasTag("today") && !inputNode.hasTag("done");
}

export function isOverdue(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isBefore(todayDay(), "day")
    );
}
