import * as vscode from "vscode";
import { Settings } from "./Settings";
import {
    parseTaskDocument,
    getProjectByName,
    processTaskNode,
    addProject,
    taskUnknownToBottom,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { replaceLines } from "./sort-lines";

const settings = new Settings();

// versioning
var minutesIdle: number = 0;
const IS_DEBUG = false;
const TIMEOUT_INTERVAL = (IS_DEBUG ? 2 : 60) * 1000; // one minute between runs
var timer: NodeJS.Timeout;
var lastVersion: number;
var maxStackSize = 999;
var versions = { stack: new Array<number>(), position: -1 };

export function documentOnChange(event: vscode.TextDocumentChangeEvent) {
    function hash(text: string): number {
        var hash = 0;
        if (text.length === 0) {
            return hash;
        }
        for (var i = 0; i < text.length; i++) {
            var char = text.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    if (!event.document) {
        return;
    }

    minutesIdle = 0; // clear idle register

    // trigger idle counter
    var currentHash = hash(event.document.getText());

    if (versions.stack.length === 0) {
        versions.stack.push(currentHash);
        versions.position = 0;
        documentIsIdle();
    } else {
        var previous = versions.stack.indexOf(currentHash);
        if (previous > -1) {
            if (previous < versions.position) {
                versions.position = previous;
            } else if (previous > versions.position) {
                versions.position = previous;
            }
        } else {
            versions.stack.splice(
                versions.position + 1,
                versions.stack.length - versions.position
            );
            versions.stack.push(currentHash);
            versions.position = versions.stack.length - 1;

            if (versions.stack.length > maxStackSize) {
                var previousLength = versions.stack.length;
                versions.stack = versions.stack.splice(-maxStackSize);
                versions.position -= previousLength - maxStackSize;
            }

            documentIsIdle();
        }
    }
}

export function documentOnOpen() {
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
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return;
    }

    // clear current timer
    if (timer) {
        clearTimeout(timer);
    }

    // in case they were manually changed
    updateSettings(textEditor)
        .then(() => {
            if (settings.autoRun()) {
                minutesIdle++;
                if (IS_DEBUG) {
                    console.log(`idle, minute ${minutesIdle}`);
                }

                if (minutesIdle >= settings.autoRunInterval()) {
                    minutesIdle = 0; // reset counter
                    performCopyAndSave();
                }
            }
        })
        .finally(() => {
            var version = textEditor.document.version;
            if (!lastVersion || version > lastVersion) {
                timer = setTimeout(documentIsIdle, TIMEOUT_INTERVAL);
            }
        });
}

/**
 * Perform the copy of items to the Today section,
 * Save the results
 */
export function performCopyAndSave() {
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
                    console.log(reason.message);
                }
            });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.log(err.message);
        }
    }
}

/**
 *Perform the copy of any due recurring tasks into the Today section
 */
export async function performCopy(): Promise<boolean> {
    const textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return false;
    }

    // get items
    var allItems = await parseTaskDocument(textEditor);
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

    // get special projects
    var archiveProject: TaskPaperNode | undefined,
        todayProject: TaskPaperNode | undefined,
        futureProject: TaskPaperNode | undefined;
    [archiveProject, todayProject, futureProject] =
        getSpecialProjects(allItems);

    // process task node
    processTaskNode(
        allItems,
        settings,
        archiveProject,
        todayProject,
        futureProject
    );

    // sort unknowns to bottom
    [archiveProject, todayProject, futureProject].forEach((project) => {
        if (project !== undefined) {
            project.children = project.children.sort(taskUnknownToBottom);
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
    TaskPaperNode | undefined
] {
    return [
        getProjectByName(node, "Archive"),
        getProjectByName(node, "Today"),
        getProjectByName(node, "Future"),
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
