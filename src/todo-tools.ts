import * as vscode from "vscode";
import { Settings } from "./Settings";
import {
    parseTaskDocument,
    getProjectByName,
    processTaskNode,
    addProject,
    taskBlankToBottom,
    updateStatistics,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "./task-parser";
import { replaceCurrentLine, replaceLines } from "./sort-lines";
import dayjs from "dayjs";
import { DEFAULT_DATE_FORMAT } from "./dates";
import { stat } from "fs";

const settings = new Settings();

// versioning
var minutesIdle: number = 0;
const IS_DEBUG = true;
const SECONDS_PER_MINUTE = IS_DEBUG ? 10 : 60; // one minute between runs (or two seconds in debug)
// const outputChannel = vscode.window.createOutputChannel("ToDo Tools");
// outputChannel.show();
var timer: NodeJS.Timeout;
var lastIdleTicks: number = 0;
const IDLE_TICKS = 1 * 1000;

export function log(message: string) {
    // DO NOT LOG to the output channel!
    // Logging causes a document change event.
    // See: https://github.com/eclipse-theia/theia/issues/8855
    // if (outputChannel !== undefined && IS_DEBUG) {
    //     outputChannel.appendLine(message);
    if (IS_DEBUG) {
        console.log(message);
    }
}

export function documentOnChange(event: vscode.TextDocumentChangeEvent) {
    minutesIdle = 0; // clear idle register

    if (event.contentChanges.length > 0) {
        log("documentOnChange");
        const nowTicks = new Date().getTime();

        // only fire idle once a second at most
        if (nowTicks - lastIdleTicks > IDLE_TICKS) {
            lastIdleTicks = nowTicks;
            documentIsIdle(); // restart idle sensor
        }
    }
}

export function documentOnOpen() {
    log("documentOnOpen");

    const textEditor = vscode.window.activeTextEditor;
    updateSettings(textEditor);

    if (textEditor && settings.runOnOpen()) {
        performCopyAndSave();
    }

    minutesIdle = 0; // clear counter
    documentIsIdle(); // restart counter
}

function stopTimer() {
    // clear current timer
    if (timer) {
        log("stopping timer");
        clearTimeout(timer);
    }
}

function documentIsIdle() {
    log("documentIsIdle");

    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return;
    }

    // clear current timer
    stopTimer();

    // in case they were manually changed
    updateSettings(textEditor);

    if (settings.autoRun()) {
        minutesIdle++;
        log(`idle for ${minutesIdle} minutes`);
    }

    if (minutesIdle >= settings.autoRunInterval()) {
        minutesIdle = 0; // reset counter
        performCopyAndSave();
    }

    log(`restarting minute timer (minute = ${SECONDS_PER_MINUTE} seconds)`);
    timer = setTimeout(documentIsIdle, SECONDS_PER_MINUTE * 1000);
}

/**
 * Perform the copy of items to the Today section,
 * Save the results
 */
function performCopyAndSave() {
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return false;
    }

    if (!["todo", "taskpaper"].includes(textEditor.document.languageId)) {
        return;
    }

    try {
        performCopy()
            .then(async () => textEditor.document.save())
            .catch((reason: any) => {
                if (reason instanceof Error) {
                    log(reason.message);
                }
            })
            .finally(() => {
                // restart timer
                documentIsIdle();
            });
    } catch (err: unknown) {
        if (err instanceof Error) {
            log(err.message);
        }
    }
}

export async function setDue(daysAhead: number): Promise<boolean> {
    // get current task, if the cursor is under a task
    const task = taskUnderCursor(vscode.window.activeTextEditor);
    const format = DEFAULT_DATE_FORMAT; // kludge; why is this not importing?

    if (task === undefined || vscode.window.activeTextEditor === undefined) {
        return new Promise<boolean>(() => false);
    }

    // set this duedate
    const day = dayjs().add(daysAhead, "day");
    task.setTag("due", day.format(format));

    // update the line
    return replaceCurrentLine(vscode.window.activeTextEditor, task.toString());
}

export async function setPriority(
    priority: string | undefined = undefined,
    priorityValue: string | undefined = undefined
): Promise<boolean> {
    // get current task, if the cursor is under a task
    const task = taskUnderCursor(vscode.window.activeTextEditor);

    if (task === undefined || vscode.window.activeTextEditor === undefined) {
        return new Promise<boolean>(() => false);
    }

    // remove all priorities
    task.removeTag(["high", "medium", "low", "priority"]);

    // set this priority
    if (priority !== undefined) {
        task.setTag(priority, priorityValue);
    }

    // update the line
    return replaceCurrentLine(vscode.window.activeTextEditor, task.toString());
}

// return the task on which the cursor sits
const taskUnderCursor = (
    textEditor: vscode.TextEditor | undefined
): TaskPaperNode | undefined => {
    if (!textEditor || !textEditor.selection.isSingleLine) {
        return undefined;
    }

    const textLine = textEditor.document.lineAt(
        textEditor.selection.start.line
    ).text;
    const node = new TaskPaperNode(textLine);

    if (node.type !== "task") {
        return undefined;
    }
    return node;
};

/**
 *Perform the copy of any due recurring tasks into the Today section
 */
export async function performCopy(): Promise<boolean> {
    log("performCopy");

    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return false;
    }

    // get items
    let allItems = parseTaskDocument(textEditor);
    if (allItems === undefined) {
        return false;
    }

    // update settings
    await updateSettings(textEditor);

    // create special projects if needed
    if (!settings.recurringItemsAdjacent()) {
        addProject(allItems, "Today", "top");
        addProject(allItems, "Future", "above settings");
    }
    if (settings.archiveDoneItems()) {
        addProject(allItems, "Archive", "above settings");
    }
    if (settings.overdueSection()) {
        addProject(allItems, "Overdue", "top");
    }
    if (settings.statisticsSection()) {
        addProject(allItems, "Statistics", "above settings");
    }

    // get special projects
    var archiveProject: TaskPaperNode | undefined,
        todayProject: TaskPaperNode | undefined,
        futureProject: TaskPaperNode | undefined,
        overdueProject: TaskPaperNode | undefined,
        statisticsProject: TaskPaperNode | undefined;
    [
        archiveProject,
        todayProject,
        futureProject,
        overdueProject,
        statisticsProject,
    ] = getSpecialProjects(allItems);

    if (!settings.overdueSection()) {
        overdueProject = todayProject;
    }

    // process task node
    processTaskNode(
        allItems,
        settings,
        archiveProject,
        todayProject,
        futureProject,
        overdueProject
    );

    // add statistics
    if (settings.statisticsSection()) {
        updateStatistics(allItems, statisticsProject);
    }

    // sort unknowns to bottom
    [
        archiveProject,
        todayProject,
        futureProject,
        overdueProject,
        statisticsProject,
    ].forEach((project) => {
        if (project !== undefined) {
            project.children = project.children.sort(taskBlankToBottom);
        }
    });

    // return a promise to write out the document
    return Promise.resolve(writeOutItems(allItems));
}

function writeOutItems(items: TaskPaperNode): Thenable<boolean> {
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        // noop
        return new Promise<boolean>(() => true);
    }

    return replaceLines(
        textEditor,
        0,
        textEditor.document.lineCount - 1,
        items.toStringWithChildren()
    );
}

export function getSpecialProjects(
    node: TaskPaperNode
): [
    TaskPaperNode | undefined,
    TaskPaperNode | undefined,
    TaskPaperNode | undefined,
    TaskPaperNode | undefined,
    TaskPaperNode | undefined
] {
    return [
        getProjectByName(node, "Archive"),
        getProjectByName(node, "Today"),
        getProjectByName(node, "Future"),
        getProjectByName(node, "Overdue"),
        getProjectByName(node, "Statistics"),
    ];
}

function updateSettings(textEditor: vscode.TextEditor | undefined) {
    // update settings from current document
    if (textEditor) {
        const doc = parseTaskDocument(textEditor);
        if (doc) {
            settings.update(doc);
        }
    }
}

export function deactivate() {}
