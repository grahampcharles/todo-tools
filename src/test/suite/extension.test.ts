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
    nextAnnual,
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
    testWithMultilineCommentsShort,
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
    isDueBeforeToday,
    isDueToday,
    isFuture,
    isOverdue,
} from "../../move-nodes";
import { getNextDueDate, latestDate } from "../../task-tools";

const aBeforeB = -1;
const bBeforeA = 1;
const aAndBSame = 0;

suite("Extension Test Suite", () => {
    it("edge notes cases", () => {
        const document = new TaskPaperNode(testWithMultilineCommentsShort);
        const project = document.children[0];
        const subProject = project.children[0];
        const subsubProject1 = subProject.children[0];
        const subsubProject2 = subProject.children[1];

        expect(document.children).to.have.lengthOf(1, "document");
        expect(project.children).to.have.lengthOf(1, "project");
        expect(subProject.children).to.have.lengthOf(
            2,
            `subProject: ${subProject.children.length}`
        );
        expect(subsubProject1.children).to.have.lengthOf(1, "subsubProject1");
        expect(subsubProject2.children).to.have.lengthOf(3, "subsubProject2");
    });

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
        // completed annual items: should be moved to the year after they were done or due
        const node = new TaskPaperNode("- test task");
        node.setTag("annual", "9/19");
        node.setTag("due", "2122-09-19");
        node.setTag("done", "2122-09-18");

        let nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq("2123-09-19");
    });

    it("next due date; day of the week", () => {
        const node = new TaskPaperNode("- test task");
        node.setTag("recur", "Friday");
        node.setTag("due", "2122-09-18");
        node.setTag("done", "2122-09-18"); // this is a Friday

        let nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq("2122-09-25"); // the next Friday

        node.setTag("done", "2122-09-19"); // this is a Saturday
        nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq("2122-09-25"); // the next Friday
    });

    it("next due date; number of days recurrence", () => {
        const node = new TaskPaperNode("- test task");
        node.setTag("recur", "3");
        node.setTag("due", "2122-09-18");
        node.setTag("done", "2122-09-18");

        let nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq("2122-09-21");

        node.setTag("done", "2122-09-17");
        nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq("2122-09-20");
    });

    it("next due date; number of days recurrence, in the past", () => {
        const node = new TaskPaperNode("- test task");
        node.setTag("recur", "3");
        node.setTag("due", "2012-09-18");
        node.setTag("done", "2012-09-18");

        let nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq(
            todayDay().add(3, "day").format("YYYY-MM-DD")
        );

        node.setTag("done", "2012-09-17");
        nextDueDate = getNextDueDate(node);
        expect(nextDueDate.format("YYYY-MM-DD")).to.eq(
            todayDay().add(3, "day").format("YYYY-MM-DD")
        );
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

        expect(
            nextAnnual("5/10", dayjs("2022-05-01")).format("YYYY-MM-DD")
        ).to.equal("2022-05-10", "next annual (before)");

        expect(
            nextAnnual("5/10", dayjs("2022-05-11")).format("YYYY-MM-DD")
        ).to.equal("2023-05-10", "next annual (after)");

        expect(
            nextAnnual("9/19", dayjs("2021-09-20")).format("YYYY-MM-DD")
        ).to.equal("2022-09-19", "next annual (after 2)");

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
        expect(cleanDate("yesterday").format("YYYY-MM-DD")).to.equal(
            yesterday.toLocaleDateString("sv")
        );
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

    it("latest date", () => {
        const date1 = dayjs("2022-01-01");
        const date2 = dayjs("2022-02-01");

        const latestFromTwo = latestDate([date1, date2]);
        expect(latestFromTwo.format("YYYY-MM-DD")).to.eql("2022-02-01");

        const latestFromThree = latestDate([date1, date2, todayDay()]);
        expect(latestFromThree.format("YYYY-MM-DD")).to.eql(
            todayDay().format("YYYY-MM-DD")
        );
    });

    it("due on day of week", () => {
        const WEEKDAY_MONDAY = 1;
        const nextMonday = nextWeekday(WEEKDAY_MONDAY, todayDay());
        const testTask = new TaskPaperNode(`  - test item @due(Tuesday)`);

        const dueDate = testTask.tagValue("due") || "";
        const isSameDate = nextMonday.isSame(dueDate);
        expect(isSameDate).to.equal(true, "item due date is set to next Monday");

    });

    it("due today/yeterday comparisons", () => {
        const today = todayDay().format("YYYY-MM-DD");
        const testTask = new TaskPaperNode(`  - test item @due(${today})`);

        testTask.setTag("due", todayDay().add(-1, "day").format("YYYY-MM-DD"));
        const answer2 = isDueBeforeToday(testTask);
        expect(answer2).to.equal(true, "yesterday is due before today");

        testTask.setTag("due", todayDay().add(1, "day").format("YYYY-MM-DD"));
        const answer3 = isDueBeforeToday(testTask);
        expect(answer3).to.equal(false, "tomorrow is not due nefore today");
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
});
