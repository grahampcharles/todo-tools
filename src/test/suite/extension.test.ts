import * as assert from "assert";
import * as vscode from "vscode";
import {
    cleanDate,
    dayNamePluralToWeekday,
    dayNames,
    dayNameToWeekday,
    daysPassed,
    daysUntilWeekday,
    getDaysFromRecurrencePattern,
    monthNameToNumber,
    todayDay,
    todayName,
} from "../../dates";
import { expect } from "chai";
import {
    getSectionLineNumber,
    SectionBounds,
    stringToLines,
    stripTrailingWhitespace,
} from "../../strings";
import { getDoneTasks } from "../../taskpaper-parsing";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";

suite("Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");

    test("clean date", () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});
