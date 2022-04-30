import { allowedNodeEnvironmentFlags } from "process";
import * as vscode from "vscode";
import * as todoTools from "./todo-tools";

/**
 *activate
 * this method is called when the extension is activated
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    const commands = [
        vscode.commands.registerCommand(
            "todotools.processTasks",
            todoTools.processTasks
        ),
        vscode.commands.registerCommand(
            "todotools.runOnOpen",
            todoTools.performCopyAndSave
        ),
        vscode.workspace.onDidOpenTextDocument(
            async (doc: vscode.TextDocument) => {
                todoTools.documentOnOpen();
            }
        ),
    ];

    commands.forEach((command) => context.subscriptions.push(command));

    // run once on activate
    todoTools.documentOnOpen();
}

export function deactivate() {}
