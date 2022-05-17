import * as vscode from "vscode";
import { Settings } from "./Settings";
import {
    parseTaskDocument,
    getProjectByName,
    processTaskNode,
    projectExistsByName,
    addProject,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { replaceLines } from "./sort-lines";
import { create } from "domain";

const settings = new Settings();
var minuteCount: number = 0;
const TIMEOUT_INTERVAL = 60 * 1000; // one minute between runs

export function processTasks() {
    const textEditor = vscode.window.activeTextEditor;
    if (textEditor) {
        performCopy(textEditor);
    }
}

export function documentOnOpen() {
    const textEditor = vscode.window.activeTextEditor;
    updateSettings(textEditor).then(() => {
        if (textEditor && settings.runOnOpen()) {
            performCopyAndSave(textEditor);
        }
        setTimeout(documentOnEveryMinute, TIMEOUT_INTERVAL);
    });
}

function documentOnEveryMinute() {
    const textEditor = vscode.window.activeTextEditor;

    // in case they were manually changed
    updateSettings(textEditor).then(() => {
        if (textEditor && settings.autoRun()) {
            minuteCount++;
            if (minuteCount >= settings.autoRunInterval()) {
                minuteCount = 0; // reset counter
                performCopyAndSave(textEditor);
            }
        }
    });

    // re-run in a minute
    setTimeout(documentOnEveryMinute, TIMEOUT_INTERVAL);
}

/**
 * Perform the copy of items to the Today section,
 * Save the results
 *
 * @param {vscode.TextEditor} textEditor
 */
export function performCopyAndSave(textEditor: vscode.TextEditor) {
    if (!["todo", "taskpaper"].includes(textEditor.document.languageId)) {
        return;
    }

    try {
        performCopy(textEditor)
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
 *
 * @param {vscode.TextEditor} textEditor
 * @return {*}  {Promise<boolean>}
 */
async function performCopy(textEditor: vscode.TextEditor): Promise<boolean> {
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
        addProject(allItems, "Future", "bottom");
    }
    if (settings.archiveDoneItems()) {
        addProject(allItems, "Archive", "bottom");
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
