import * as vscode from "vscode";
import * as todoTools from "./todo-tools";

export function activate(context: vscode.ExtensionContext) {
    const commands = [
        vscode.commands.registerCommand(
            "todotools.performCopy",
            todoTools.performCopy
        ),
        vscode.workspace.onDidOpenTextDocument(
            async (doc: vscode.TextDocument) => {
                todoTools.documentOnOpen();
            }
        ),
        vscode.workspace.onDidChangeTextDocument(todoTools.documentOnChange),
    ];

    const x = setTimeout(() => {}, 1000);

    commands.forEach((command) => context.subscriptions.push(command));
}

export function deactivate() {}
