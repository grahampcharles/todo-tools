import * as vscode from "vscode";
import * as todoTools from "./todo-tools";

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
}

export function deactivate() {}
