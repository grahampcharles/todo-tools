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
    nextWeekday,
    todayDay,
    todayName,
} from "../../dates";
import { expect } from "chai";
import { it } from "mocha";

import {
    getSectionLineNumber,
    SectionBounds,
    stringToLines,
    stripTrailingWhitespace,
} from "../../strings";
import {
    testArchive1Source,
    testDocument,
    testDocumentWithHigh,
    testDocumentWithSubprojectLines,
    testSettings,
} from "./testData";
import { Settings } from "../../Settings";
import dayjs, { Dayjs } from "dayjs";
import {
    isBlankLine,
    processTaskNode,
    taskDueDateCompare,
    taskBlankToBottom,
} from "../../taskpaper-parsing";
import { TaskPaperNode } from "../../task-parser";
import { getSpecialProjects } from "../../todo-tools";
import {
    isDueToday,
    isDueTodayOrBefore,
    isFuture,
    isOverdue,
} from "../../move-nodes";

const aBeforeB = -1;
const bBeforeA = 1;
const aAndBSame = 0;

suite("Extension Test Suite", () => {
    it("test document with subproject lines", () => {
        const node = new TaskPaperNode(testDocumentWithSubprojectLines);

        const project = node.children[0];
        expect(project).to.have.property("children").of.length(2);

        const subproject1 = project.children[0];
        expect(subproject1).to.have.property("value").eq("SubProject 1");
    });

    it("clean date", () => {
        const date1 = cleanDate("1/11");
        const targetYear = new Date().getFullYear();

        expect(date1.year()).eq(targetYear);
        expect(date1.format("YYYY-MM-DD")).eq(`${targetYear}-01-11`);

        const date2 = cleanDate("22-01-13 13:45");
        expect(date2.format("YYYY-MM-DD HH:mm")).eq("2022-01-13 13:45");

        expect(cleanDate("2020-01-03").format("YYYY-MM-DD")).eq(
            "2020-01-03",
            "simple date"
        );
    });

    it("next due date; annual", () => {
        // completed annual items: should be moved to next year
        const dueDate = cleanDate("1/11");
        const thisYear = dueDate.year();
        const nextYear = thisYear + 1;

        const done = dueDate.add(1, "day"); // done the day after it was due
        const nextDueDate = cleanDate(`${thisYear}-01-11`, done);
        expect(nextDueDate.year()).eq(nextYear);
        expect(nextDueDate.format("YYYY-MM-DD")).eq(`${nextYear}-01-11`);
    });

    it("getDaysFromRecurrencePattern", () => {
        expect(getDaysFromRecurrencePattern("2")).to.eql(2, "in two days");
        expect(getDaysFromRecurrencePattern(undefined)).to.eql(1, "undefined");
    });

    it("getSectionLineNumber", () => {
        const section = ["Project:", "\t-item", "", "Future:"];
        const bounds: SectionBounds = getSectionLineNumber(section, "Future");
        expect(bounds).to.have.property("first").eql(3);
        expect(bounds).to.have.property("last").eql(-1);
    });

    it("date functions", () => {
        const date1 = new Date(2020, 1, 3);
        const date2 = new Date(2020, 1, 5);
        assert.strictEqual(2, daysPassed(date1, date2));

        expect(
            nextWeekday(1, dayjs("2022-05-10")).format("YYYY-MM-DD")
        ).to.equal("2022-05-16", "next weekday");

        // day names
        assert.strictEqual("Sunday", dayNames[0]);
        assert.strictEqual(0, dayNameToWeekday("Sunday"));

        // today's day name
        const todayNameString = todayName();
        assert.strictEqual(todayNameString, dayNames[todayDay().day()]);

        expect(monthNameToNumber("September")).to.equal(
            8,
            "month name to number"
        );
        expect(dayNameToWeekday("Monday")).to.equal(1, "day name to weekday");
        expect(dayNamePluralToWeekday("Monday")).to.equal(
            -1,
            "day name plural to weekday"
        );
        expect(dayNameToWeekday("Mondays")).to.equal(
            -1,
            "day name to weekday -- not plural"
        );
        expect(dayNamePluralToWeekday("Mondays")).to.equal(
            1,
            "day name plural to weekday"
        );

        const day = cleanDate("2022-01-11"); // this is a Tuesday, day 2
        expect(daysUntilWeekday(2, day)).to.equal(7, "until Tuesday");
        expect(daysUntilWeekday(3, day)).to.equal(1, "until Wednesday");
        expect(daysUntilWeekday(0, day)).to.equal(5, "until Sunday");
    });

    it("clean date", () => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // "sv" -> Sweden, which formats as YYYY-MM-DD
        expect(cleanDate("today").format("YYYY-MM-DD")).to.equal(
            today.toLocaleDateString("sv")
        );
        expect(cleanDate("tomorrow").format("YYYY-MM-DD")).to.equal(
            tomorrow.toLocaleDateString("sv")
        );
        expect(cleanDate("1").format("YYYY-MM-DD")).to.equal(
            tomorrow.toLocaleDateString("sv")
        );
        expect(cleanDate("2").format("YYYY-MM-DD")).to.equal(
            dayAfterTomorrow.toLocaleDateString("sv")
        );
        expect(cleanDate("yesterday").format("YYYY-MM-DD")).to.equal(
            yesterday.toLocaleDateString("sv")
        );
        expect(
            cleanDate("Monday", dayjs("2022-02-11")).format("YYYY-MM-DD")
        ).to.equal("2022-02-14");
    });

    it("string utilities", () => {
        expect(stringToLines(`test\ntest2`)).to.have.lengthOf(
            2,
            "stringToLines, \\n"
        );
        expect(stringToLines(`test\rtest2`)).to.have.lengthOf(
            2,
            "stringToLines, \\r"
        );
        expect(stringToLines(`test\r\ntest2`)).to.have.lengthOf(
            2,
            "stringToLines, \\r\\n"
        );

        const section = ["Project:", "\t-item", "", "Future:"];
        expect(stringToLines(section.join("\r\n"))).to.have.lengthOf(
            4,
            "string to lines CRLF, with empty"
        );
        expect(stringToLines(section.join("\n"))).to.have.lengthOf(
            4,
            "string to lines LF, with empty"
        );
    });

    it("stripTrailingWhitespace", () => {
        const test = `line 1\nline 2\t\nline 3  \n\nline 4`;
        const result = stripTrailingWhitespace(test);
        expect(result).eq(`line 1\nline 2\nline 3\n\nline 4`);
    });

    it("getSpecialProjects", () => {
        const items = new TaskPaperNode(testArchive1Source);

        var archiveProject: TaskPaperNode | undefined,
            todayProject: TaskPaperNode | undefined,
            futureProject: TaskPaperNode | undefined,
            overdueProject: TaskPaperNode | undefined;

        [archiveProject, todayProject, futureProject, overdueProject] =
            getSpecialProjects(items);

        expect(todayProject).to.have.property("value", "Today");
        expect(archiveProject).to.have.property("value", "Archive");
        expect(futureProject).to.be.undefined;
        expect(overdueProject).to.be.undefined;
    });

    it("settings", () => {
        const test = new Settings();
        const settingsNode = new TaskPaperNode(testSettings);
        test.update(settingsNode);
        expect(test.autoRun()).eq(false);
        expect(test.runOnOpen()).eq(false);
        expect(test.archiveDoneItems()).eq(false);
        expect(test.sortByDueDate()).eq(false);
        expect(test.recurringItemsAdjacent()).eq(false);
        expect(test.autoRunInterval()).eq(45);
        expect(test.overdueSection()).eq(false);
    });

    it("date comparisons", () => {
        const today = todayDay().format("YYYY-MM-DD");
        const testTask = new TaskPaperNode(`  - test item @due(${today})`);

        const answer1 = isDueTodayOrBefore(testTask);
        expect(answer1).to.equal(true, "today is due today or before");

        testTask.setTag("due", todayDay().add(-1, "day").format("YYYY-MM-DD"));
        const answer2 = isDueTodayOrBefore(testTask);
        expect(answer2).to.equal(true, "yesterday is due today");

        testTask.setTag("due", todayDay().add(1, "day").format("YYYY-MM-DD"));
        const answer3 = isDueTodayOrBefore(testTask);
        expect(answer3).to.equal(false, "tomorrow is not due today");
    });

    type DueDateCompareTest = [TaskPaperNode, TaskPaperNode, number];

    it("due date comparing", () => {
        const tests = new Array<[string, string, number]>();

        tests.push(
            ["", "should be first", bBeforeA],
            ["notes shouldn't change at all", "nope", aAndBSame],
            [
                "- task with due date, go to bottom @due(2022-01-01)",
                "- task without due date, go to top",
                bBeforeA,
            ],
            [
                "- task with later due date, go to bottom @due(2022-02-01)",
                "- task with earlier due date, go to top @due(2022-01-01)",
                bBeforeA,
            ],
            [
                "- ZZZ task with same due dates, alphabetize @due(2022-02-01)",
                "- task with same due dates, alphabetize @due(2022-02-01)",
                bBeforeA,
            ],
            [
                "- task with same due dates, alphabetize @due(2022-02-01)",
                "- ZZZ task with same due dates, alphabetize @due(2022-02-01)",
                aBeforeB,
            ],
            ["", "- blank line should always come after tasks", bBeforeA]
        );

        const dueDateTests: Array<DueDateCompareTest> = tests.map((item) => [
            new TaskPaperNode(item[0]),
            new TaskPaperNode(item[1]),
            item[2],
        ]);

        dueDateTests.forEach((testArrayItem: DueDateCompareTest, index) => {
            const result = taskDueDateCompare(
                testArrayItem[0],
                testArrayItem[1]
            );

            expect(result).to.eq(
                testArrayItem[2],
                `due date comparison fail at index ${index}`
            );
        });
    });

    // task, isToday, isOverdue, isFuture
    type TaskFlagCompareTest = [TaskPaperNode, boolean, boolean, boolean];
    it("task flags", () => {
        const todayString = todayDay().format("YYYY-MM-DD");

        const taskFlagTests = new Array<Dayjs>();
        taskFlagTests.push(
            dayjs(todayString),
            dayjs(todayString).add(1, "day"),
            dayjs(todayString).subtract(1, "day")
        );

        // run tests
        taskFlagTests
            .map(
                (date) =>
                    [
                        new TaskPaperNode(
                            `  - sample task @due(${date.format("YYYY-MM-DD")})`
                        ),
                        date.isSame(todayDay(), "day"),
                        date.isBefore(todayDay(), "day"),
                        date.isAfter(todayDay(), "day"),
                    ] as TaskFlagCompareTest
            )
            .forEach((taskFlagTest, index) => {
                const today = isDueToday(taskFlagTest[0]);
                const overdue = isOverdue(taskFlagTest[0]);
                const future = isFuture(taskFlagTest[0]);

                expect(today).to.eq(
                    taskFlagTest[1],
                    `today fail at index ${index}`
                );
                expect(overdue).to.eq(
                    taskFlagTest[2],
                    `overdue fail at index ${index}`
                );
                expect(future).to.eq(
                    taskFlagTest[3],
                    `future fail at index ${index}`
                );
            });
    });

    it("project sorting, including @high tag", () => {
        const project = new TaskPaperNode(testDocumentWithHigh);

        const sorted = project.children[0].children.sort(taskDueDateCompare);

        const expectations = ["not due", "due first", "due second", ""];

        sorted.forEach((node, index) => {
            const expectation = expectations[index];
            const nodeValue = node.value ?? "";
            expect(nodeValue).to.equal(
                expectation,
                `'${nodeValue}' out of order at index ${index}`
            );
        });

        // last one should be a blank line
        // DEBUG: no, task-parser now removes blank lines.
        // const lastLine = sorted[sorted.length - 1];
        // const isBlank = isBlankLine(lastLine);
        // expect(isBlank).to.eq(
        //     true,
        //     "last line of sorted project should be blank"
        // );
    });

    it("project sorting", () => {
        const project = new TaskPaperNode(testDocument);

        const sorted = project.children[0].children.sort(taskDueDateCompare);

        const expectations = ["not due", "due first", "due second"];

        sorted.forEach((node, index) => {
            const expectation = expectations[index];
            const nodeValue = node.value ?? "";
            expect(nodeValue).to.equal(
                expectation,
                `'${nodeValue}' out of order at index ${index}`
            );
        });
    });

    it("task updating", () => {
        const items = new TaskPaperNode(testArchive1Source);

        var archiveProject: TaskPaperNode | undefined,
            todayProject: TaskPaperNode | undefined,
            futureProject: TaskPaperNode | undefined,
            overdueProject: TaskPaperNode | undefined;
        [archiveProject, todayProject, futureProject, overdueProject] =
            getSpecialProjects(items);

        processTaskNode(
            items,
            new Settings(),
            archiveProject,
            todayProject,
            futureProject,
            overdueProject
        );
    });

    it("is blank line", () => {
        const tests = ["", "this is a test", "\t\t", "\t\ttest: test"];
        const results = [true, false, true, false];

        tests.forEach((test, index) => {
            const expectation = results[index];
            const actual = isBlankLine(new TaskPaperNode(test));
            expect(actual).to.equal(expectation, `fail on '${test}'`);
        });
    });

    it("blank line sorting", () => {
        const blankLineTests = new Array<[string, string]>();
        blankLineTests.push(
            ["", "test on top"],
            ["", "  - test on top"],
            ["test on top", ""],
            ["- test on top", ""]
        );
        const results = [bBeforeA, bBeforeA, aBeforeB, aBeforeB];

        blankLineTests.forEach((test, index) => {
            const aNode = new TaskPaperNode(test[0]);
            const bNode = new TaskPaperNode(test[1]);
            const sortTest = taskBlankToBottom(aNode, bNode);

            expect(sortTest).to.eq(results[index], `fail at index ${index}`);
        });
    });
});
