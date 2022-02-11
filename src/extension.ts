import * as vscode from "vscode";
import { Settings } from "./Settings";
import { getSection } from "./taskpaper-utils";
import {
    deleteLine,
    addLinesToSection,
    replaceLine,
    editorLines,
    insertLineAfter,
    insertLinesAfter,
} from "./editor-utils";
import { getSectionLineNumber, stringToLines } from "./strings";
import {
    getDoneTasks,
    getNewDueTasks,
    getFutureTasks,
    getUpdates,
    parseTaskDocument,
    filterProjects,
    getDueTasks,
    dueSort,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";

let consoleChannel = vscode.window.createOutputChannel("ToDoTools");
const settings = new Settings();
var loopCount: number = 0;

/**
 *activate
 * this method is called when the extension is activated
 * @export
 * @param {vscode.ExtensionContext} context
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log("activate");

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
    setInterval(documentOnEveryMinute, 1000 * 10); // run every minute

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
    console.log("one minute...");

    const textEditor = vscode.window.activeTextEditor;

    // in case they were manually changed
    updateSettings(textEditor).then(() => {
        if (textEditor && settings.autoRun()) {
            loopCount++;
            if (loopCount >= settings.autoRunInterval()) {
                loopCount = 0; // reset counter
                performCopyAndSave(textEditor);
            }
        }
    });
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
    // find the today line number
    if (getSectionLineNumber(editorLines(textEditor), "Today") === undefined) {
        // no point going on if there's no Today section
        // TODO: *create* a Today section?
        return false;
    }

    // get the "future" section
    var text = textEditor.document.getText();
    const future = getSection(stringToLines(text), "Future");

    var items = await parseTaskDocument(textEditor);
    if (items === undefined) {
        return false;
    }

    // update settings
    await updateSettings(textEditor);

    // 1. get FUTURE tasks
    ////////////////////////////////////
    var futureTasks = getFutureTasks(items);

    // process any updates from getFutureTasks
    await processUpdates(items, textEditor);

    if (settings.recurringItemsAdjacent()) {
        // option: create the future tasks adjacent to the current ones

        const sorted = futureTasks
            // filter to remove tasks that already exist
            .filter((task) => !items?.containsItem(task))
            // sort from bottom to top
            .sort((taskA, taskB) => taskB.index.line - taskA.index.line);

        for (const task of sorted) {
            await insertLineAfter(
                textEditor,
                task.index.line - 1, // node index is 1-based; vscode editor is 0-based
                task.toString()
            );
        }
    } else {
        // option: copy the future tasks to the future
        var futureString = futureTasks.map((node) => node.toString());

        /// 2. ADD FUTURES
        // remove anything that's already in the future section,
        // and deduplicate
        futureString = futureString
            .filter((v) => !future.includes(v))
            .filter((v, i, a) => a.indexOf(v) === i);

        // add futures
        await addLinesToSection(textEditor, "Future", futureString);
    }

    // 3. move DUE tasks to Today
    ///////////////////////////////

    // re-parse document to account for changes in part 1
    items = await parseTaskDocument(textEditor);
    if (items === undefined) {
        return false;
    }

    // get newly due items
    const due = getNewDueTasks(items);

    // process any node updates
    // TODO: note that this will cause badness if Today is not the first section!
    await processUpdates(items, textEditor);

    // add the new lines to the today section
    await addLinesToSection(
        textEditor,
        "Today",
        due.map((item) => item.toString())
    );

    // 4. move DONE tasks to Archive
    /////////////////////////////////

    if (settings.archiveDoneItems()) {
        // TODO: fix re-parsing so it doesn't happen every time
        // re-parse document to account for changes
        items = await parseTaskDocument(textEditor);
        if (items === undefined) {
            return false;
        }

        // get done items
        const done = getDoneTasks(items);

        // process any node updates
        await processUpdates(items, textEditor);

        // add the new lines to the Archive section
        await addLinesToSection(
            textEditor,
            "Archive",
            done.map((item) => item.toString())
        );
    }

    // 5. sort DUE tasks by die date
    if (settings.sortFutureItems()) {
        // re-parse document to account for changes
        items = await parseTaskDocument(textEditor);
        if (items === undefined) {
            return false;
        }

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
