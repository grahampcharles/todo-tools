import * as vscode from "vscode";
import { Settings } from "./Settings";
import { getSection } from "./taskpaper-utils";
import {
    deleteLine,
    addLinesToSection,
    replaceLine,
    editorLines,
    insertLineAfter,
} from "./editor-utils";
import { getSectionLineNumber, stringToLines } from "./strings";
import {
    getDoneTasks,
    getDueTasks,
    getFutureTasks,
    getUpdates,
    parseTaskDocument,
} from "./taskpaper-parsing";
import { TaskPaperNode } from "task-parser/build/TaskPaperNode";

let consoleChannel = vscode.window.createOutputChannel("ToDoTools");
const settings = new Settings();

/**
 *activate
 * this method is called when the extension is activated
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    // get reference to the active text editor
    const textEditor = vscode.window.activeTextEditor;

    // if there is one, then perform a copy
    if (textEditor && settings.autoRun()) {
        automaticPerformCopy(textEditor);
    }

    //  implement commands with registerCommand
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

    // automatic re-run function
    const autoRunFunction = function () {
        consoleChannel.appendLine("auto-run called");
        let textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
            automaticPerformCopy(textEditor);
        }
    };

    // get option for the automatic re-run interval
    if (textEditor) {
        consoleChannel.appendLine("auto-run interval set");
        // set the auto-run function to run
        setInterval(autoRunFunction, settings.autoRunInterval());
    }

    // implement a mock "pretend we just opened" command
    disposable = vscode.commands.registerCommand("todotools.runOnOpen", () => {
        let textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
            automaticPerformCopy(textEditor);
        }
    });
    context.subscriptions.push(disposable);

    ////////////////
    /// FUNCTIONS //
    ////////////////

    /**
     *Automatically run the copy and then save.
     * @param {vscode.TextEditor} editor
     */
    function automaticPerformCopy(editor: vscode.TextEditor) {
        performCopyAndSave(editor);
    }

    /**
     * Perform the copy of items to the Today section,
     * Save the results
     *
     * @param {vscode.TextEditor} editor
     */
    function performCopyAndSave(editor: vscode.TextEditor) {
        try {
            performCopy(editor)
                .then(() => editor.document.save())
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
    async function performCopy(
        textEditor: vscode.TextEditor
    ): Promise<boolean> {
        // find the today line number
        if (
            !(
                getSectionLineNumber(editorLines(textEditor), "Today") ===
                undefined
            )
        ) {
            // no point going on if there's no Today section
            // TODO: *create* a Today section?

            // get the "future" section
            var text = textEditor.document.getText();
            const future = getSection(stringToLines(text), "Future");

            var items = await parseTaskDocument(textEditor);
            if (items === undefined) {
                return false;
            }

            // 1. get FUTURE tasks
            ////////////////////////////////////
            var futureTasks = getFutureTasks(items);

            if (settings.recurringItemsAdjacent()) {
                // option: create the future tasks adjacent to the current ones

                // go from bottom to top
                const sorted = futureTasks.sort(
                    (taskA, taskB) => taskB.index.line - taskA.index.line
                );

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

                // process any updates
                await processUpdates(items, textEditor);

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
            const due = getDueTasks(items);

            // process any node updates
            // TODO: that this will cause badness if Today is not the first section!
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
                // re-parse document to account for changes in part 1
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
        }

        // nothing to execute: return true
        return new Promise<boolean>(() => true);
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
    }
    return true;
}

export function deactivate() {}
