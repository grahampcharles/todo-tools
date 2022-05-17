// from vscode-sort-lines
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import * as vscode from "vscode";
import { InputType } from "zlib";
import { cleanDate, todayDay } from "./dates";

type NodeComparer = (inputNode: TaskPaperNode) => boolean;
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

function makeNodeTest(comparison?: NodeComparisonAlgorithm): NodeComparer {
    return function (inputNode: TaskPaperNode): boolean {
        if (comparison === undefined) {
            return false;
        }
        return comparison(inputNode);
    };
}

export const comparisonSequences = {
    dueToday: makeNodeTest(isDueToday),
    isDone: makeNodeTest(isDone),
    isFuture: makeNodeTest(isFuture),
};

function isDone(inputNode: TaskPaperNode): boolean {
    // TODO: only return true if is done before today?
    return inputNode.hasTag("done");
}

function isFuture(inputNode: TaskPaperNode): boolean {
    // TODO: only return true if is done before today?
    return (
        inputNode.hasTag("due") &&
        cleanDate(inputNode.tagValue("due")).isAfter(todayDay)
    );
}

function isDueToday(inputNode: TaskPaperNode): boolean {
    return (
        inputNode.hasTag("due") &&
        !inputNode.hasTag("done") &&
        cleanDate(inputNode.tagValue("due")).isSameOrBefore(todayDay)
    );
}
