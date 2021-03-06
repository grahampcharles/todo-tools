import * as vscode from "vscode";
import { Settings } from "./Settings";
import {
    parseTaskDocument,
    getProjectByName,
    processTaskNode,
    addProject,
    taskBlankToBottom,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { replaceCurrentLine, replaceLines } from "./sort-lines";
import dayjs from "dayjs";
import { DEFAULT_DATE_FORMAT } from "./dates";
import { replaceLine } from "./editor-utils";

const settings = new Settings();

// versioning
var minutesIdle: number = 0;
const IS_DEBUG = false;
const TIMEOUT_INTERVAL = (IS_DEBUG ? 2 : 60) * 1000; // one minute between runs
const outputChannel = vscode.window.createOutputChannel("ToDo Tools");
var timer: NodeJS.Timeout;
var lastIdleTicks: number = 0;
const IDLE_TICKS = 1 * 1000;

// TODO: why need versions?
var maxStackSize = 999;
var versions = { stack: new Array<number>(), position: -1 };

function log(message: string) {
    if (outputChannel !== undefined && IS_DEBUG) {
        outputChannel.appendLine(message);
    }
}

export function documentOnChange(event: vscode.TextDocumentChangeEvent) {
    // function hash(text: string): number {
    //     var hash = 0;
    //     if (text.length === 0) {
    //         return hash;
    //     }
    //     for (var i = 0; i < text.length; i++) {
    //         var char = text.charCodeAt(i);
    //         hash = (hash << 5) - hash + char;
    //         hash = hash & hash; // Convert to 32bit integer
    //     }
    //     return hash;
    // }

    // log("documentOnChange");

    // if (!event.document) {
    //     return;
    // }

    minutesIdle = 0; // clear idle register

    const nowTicks = new Date().getTime();

    // only fire idle once a second at most
    if (nowTicks - lastIdleTicks > IDLE_TICKS) {
        lastIdleTicks = nowTicks;
        documentIsIdle(); // restart idle sensor
    }
    // // trigger idle counter
    // var currentHash = hash(event.document.getText());

    // if (versions.stack.length === 0) {
    //     versions.stack.push(currentHash);
    //     versions.position = 0;
    //     documentIsIdle();
    // } else {
    //     var previous = versions.stack.indexOf(currentHash);
    //     if (previous > -1) {
    //         if (previous < versions.position) {
    //             versions.position = previous;
    //         } else if (previous > versions.position) {
    //             versions.position = previous;
    //         }
    //     } else {
    //         versions.stack.splice(
    //             versions.position + 1,
    //             versions.stack.length - versions.position
    //         );
    //         versions.stack.push(currentHash);
    //         versions.position = versions.stack.length - 1;

    //         if (versions.stack.length > maxStackSize) {
    //             var previousLength = versions.stack.length;
    //             versions.stack = versions.stack.splice(-maxStackSize);
    //             versions.position -= previousLength - maxStackSize;
    //         }

    //         documentIsIdle();
    //     }
    // }
}

export function documentOnOpen() {
    log("documentOnOpen");
    const textEditor = vscode.window.activeTextEditor;
    updateSettings(textEditor).then(() => {
        if (textEditor && settings.runOnOpen()) {
            performCopyAndSave();
        }
    });
    minutesIdle = 0; // clear counter
    documentIsIdle(); // restart counter
}

function documentIsIdle() {
    log("documentIsIdle");
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return;
    }

    // clear current timer
    if (timer) {
        log("stoppingTimer");
        clearTimeout(timer);
    }

    // in case they were manually changed
    updateSettings(textEditor)
        .then(() => {
            log("settingsRetrieved");

            log(`autoRun: ${settings.autoRun()}`);

            if (settings.autoRun()) {
                minutesIdle++;
                log(`idle, minute ${minutesIdle}`);
            }

            if (minutesIdle >= settings.autoRunInterval()) {
                minutesIdle = 0; // reset counter
                performCopyAndSave();
            }
        })
        .finally(() => {
            log(`restartingTimer, ${TIMEOUT_INTERVAL / 1000} seconds`);
            timer = setTimeout(documentIsIdle, TIMEOUT_INTERVAL);
        });
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
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return false;
    }

    // get items
    let allItems = await parseTaskDocument(textEditor);
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

    // get special projects
    var archiveProject: TaskPaperNode | undefined,
        todayProject: TaskPaperNode | undefined,
        futureProject: TaskPaperNode | undefined,
        overdueProject: TaskPaperNode | undefined;
    [archiveProject, todayProject, futureProject, overdueProject] =
        getSpecialProjects(allItems);

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

    // sort unknowns to bottom
    [archiveProject, todayProject, futureProject, overdueProject].forEach(
        (project) => {
            if (project !== undefined) {
                project.children = project.children.sort(taskBlankToBottom);
            }
        }
    );

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
    TaskPaperNode | undefined
] {
    return [
        getProjectByName(node, "Archive"),
        getProjectByName(node, "Today"),
        getProjectByName(node, "Future"),
        getProjectByName(node, "Overdue"),
    ];
}

async function updateSettings(textEditor: vscode.TextEditor | undefined) {
    // update settings from current document
    if (textEditor) {
        const doc = await parseTaskDocument(textEditor);
        if (doc) {
            settings.update(doc);
        }
    }
}

export function deactivate() {}
