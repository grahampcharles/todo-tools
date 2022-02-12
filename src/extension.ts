import * as vscode from "vscode";
import { Settings } from "./Settings";
import {
    deleteLine,
    addLinesToSection,
    replaceLine,
    editorLines,
    insertLineAfter,
    insertLinesAfter,
} from "./editor-utils";
import {
    getDoneTasks,
    getUpdates,
    parseTaskDocument,
    filterProjects,
    getDueTasks,
    dueSort,
    processTaskNode,
    getNewTodays,
    getNewFutures,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";

const settings = new Settings();
var minuteCount: number = 0;
const TIMEOUT_INTERVAL = 60 * 1000; // one minute between runs

/**
 *activate
 * this method is called when the extension is activated
 * @export
 * @param {vscode.ExtensionContext} context
 */
export async function activate(context: vscode.ExtensionContext) {
    // start by running code once
    documentOnOpen();

    //  register commands
    let disposable = vscode.commands.registerCommand(
        "todotools.processTasks",
        () => {
            let textEditor = vscode.window.activeTextEditor;
            if (textEditor) {
                performCopy(textEditor);
            }
        }
    );
    context.subscriptions.push(disposable);

    // re-run on open a new document
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(
            async (doc: vscode.TextDocument) => {
                documentOnOpen();
            }
        )
    );

    // set a timer to do the automatic re-run interval
    setTimeout(documentOnEveryMinute, TIMEOUT_INTERVAL); // run every minute

    // implement a mock "pretend we just opened" command
    disposable = vscode.commands.registerCommand("todotools.runOnOpen", () => {
        let textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
            performCopyAndSave(textEditor);
        }
    });

    context.subscriptions.push(disposable);
}

////////////////
/// FUNCTIONS //
////////////////

function documentOnOpen() {
    const textEditor = vscode.window.activeTextEditor;
    updateSettings(textEditor).then(() => {
        if (textEditor && settings.runOnOpen()) {
            performCopyAndSave(textEditor);
        }
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
function performCopyAndSave(textEditor: vscode.TextEditor) {
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
    // flag that items have been added; suppress sort if nothing added
    var itemsAdded = false;

    // get items
    var items = await parseTaskDocument(textEditor);
    if (items === undefined) {
        return false;
    }

    // update settings
    await updateSettings(textEditor);

    // 1. process task node
    ////////////////////////////////////
    const newTasks = processTaskNode(items);

    // process any task update flags
    await processUpdates(items, textEditor);

    // 2. insert new tasks in reverse order (so they get
    // added to the end of the document first)
    const newTasksSorted = newTasks
        // filter to remove tasks that already exist
        .filter((task) => !items?.containsItem(task))
        // sort from bottom to top
        .sort((taskA, taskB) => taskB.index.line - taskA.index.line);

    for (const task of newTasksSorted) {
        await insertLineAfter(
            textEditor,
            task.index.line - 1, // node index is 1-based; vscode editor is 0-based
            task.toString()
        );
        itemsAdded = true;
    }

    // reprocess items
    items = await parseTaskDocument(textEditor);
    if (items === undefined) {
        return false;
    }

    // 3. move items to Today if @due <= today and not @done
    const newTodays = getNewTodays(items);

    if (newTodays.length > 0) {
        // delete the originals
        await processUpdates(items, textEditor);

        // add to Today
        await addLinesToSection(
            textEditor,
            "Today",
            newTodays.map((node) => node.toString()),
            "top"
        );

        // reprocess items
        items = await parseTaskDocument(textEditor);
        if (items === undefined) {
            return false;
        }
        itemsAdded = true;
    }

    // 4. get future items
    if (!settings.recurringItemsAdjacent()) {
        const newFutures = getNewFutures(items);

        if (newFutures.length > 0) {
            // delete the originals
            await processUpdates(items, textEditor);

            // add to Today
            await addLinesToSection(
                textEditor,
                "Future",
                newFutures.map((node) => node.toString())
            );

            // reprocess items
            items = await parseTaskDocument(textEditor);
            if (items === undefined) {
                return false;
            }

            itemsAdded = true;
        }
    }

    // 5. move done items to Archive
    if (settings.archiveDoneItems()) {
        // get done items
        const done = getDoneTasks(items);

        if (done.length > 0) {
            // process any node updates
            await processUpdates(items, textEditor);

            // add the new lines to the Archive section
            await addLinesToSection(
                textEditor,
                "Archive",
                done.map((item) => item.toString())
            );

            // re-parse document to account for changes
            items = await parseTaskDocument(textEditor);
            if (items === undefined) {
                return false;
            }
            itemsAdded = true;
        }
    }

    // 6. sort DUE tasks by due date (if anything has been changed)
    if (settings.sortFutureItems() && itemsAdded) {
        // get done items from all non-archive projects
        const projects = filterProjects(items);

        // for all the projects from bottom to top, get the due tasks
        projects.sort((a: TaskPaperNode, b: TaskPaperNode) => {
            return b.index.line - a.index.line;
        });

        for (const projectNode of projects) {
            const due = getDueTasks(projectNode);

            if (due.length > 0) {
                due.forEach((dueNode) => dueNode.setTag("action", "DELETE"));

                await insertLinesAfter(textEditor, projectNode.lastLine(), [
                    ...due
                        .sort(dueSort)
                        .map((dueNode) => dueNode.toString(["action"])),
                    "",
                ]);

                // process any node updates
                await processUpdates(items, textEditor);
            }
        }
    }

    // nothing to execute: return true
    return new Promise<boolean>(() => true);
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

async function processUpdates(
    items: TaskPaperNode,
    textEditor: vscode.TextEditor
): Promise<boolean> {
    // Process any updates and deletes, in reverse order of line
    // returns a flat map of only nodes that require an update
    var updates = getUpdates(items).sort(
        (nodeA, nodeB) => nodeB.index.line - nodeA.index.line
    );

    for (const updateNode of updates) {
        if (updateNode.tagValue("action") === "DELETE") {
            // delete the line
            await deleteLine(textEditor, updateNode.index.line);
        }
        if (updateNode.tagValue("action") === "UPDATE") {
            // replace the line
            await replaceLine(
                textEditor,
                updateNode.index.line,
                updateNode.toString(["action"])
            );
        }
        updateNode.removeTag("action"); // handled
    }
    return true;
}

export function deactivate() {}
