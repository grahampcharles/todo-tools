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
import { it } from "mocha";

import {
    getSectionLineNumber,
    SectionBounds,
    stringToLines,
    stripTrailingWhitespace,
} from "../../strings";
import { getDoneTasks } from "../../taskpaper-parsing";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";
import { testDone, testSettings } from "./testData";
import { Settings } from "../../Settings";
import { parseTaskPaper } from "task-parser/build";

suite("Extension Test Suite", () => {
    vscode.window.showInformationMessage("Start all tests.");

    it("clean date", () => {
        const date1 = cleanDate("1/11");
        expect(date1.year()).eq(2001);
        expect(date1.format("YYYY-MM-DD")).eq(`2001-01-11`);

        const date2 = cleanDate("22-01-13 13:45");
        expect(date2.format("YYYY-MM-DD HH:mm")).eq("2022-01-13 13:45");

        expect(cleanDate("2020-01-03").format("YYYY-MM-DD")).eq(
            "2020-01-03",
            "simple date"
        );
    });

    it("getDaysFromRecurrencePattern", () => {
        expect(getDaysFromRecurrencePattern("2")).to.eql(2, "in two days");
        expect(getDaysFromRecurrencePattern(undefined)).to.eql(1, "undefined");
    });

    it("getDoneTasks", () => {
        const source = new TaskPaperNode(testDone);

        const done = getDoneTasks(source);
        expect(done).to.have.lengthOf(3, "parsed done tasks");
        expect(done[0].tagValue("project")).to.eq(
            "Today",
            "parsed project name from tree"
        );
        expect(done[1].tagValue("project")).to.eq("Today.SubProject");
        expect(done[2].tagValue("project")).to.eq("Later");
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

        // day names
        assert.strictEqual("Sunday", dayNames[0]);
        assert.strictEqual(0, dayNameToWeekday("Sunday"));

        // today's day name
        assert.strictEqual(todayName, dayNames[todayDay.day()]);

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

    it("settings", () => {
        const test = new Settings();
        const settingsNode = parseTaskPaper(testSettings);
        test.update(settingsNode);
        expect(test.autoRun()).eq(false);
        expect(test.runOnOpen()).eq(false);
        expect(test.archiveDoneItems()).eq(false);
        expect(test.sortFutureItems()).eq(false);
        expect(test.recurringItemsAdjacent()).eq(false);
        expect(test.autoRunInterval()).eq(45);
    });
});
