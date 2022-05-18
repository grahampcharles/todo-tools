import * as vscode from "vscode";
import * as todoTools from "./todo-tools";

export function activate(context: vscode.ExtensionContext) {
    const commands = [
        vscode.commands.registerCommand(
            "todotools.performCopy",
            todoTools.performCopy
        ),
        vscode.workspace.onDidOpenTextDocument(todoTools.documentOnOpen),
        vscode.workspace.onDidChangeTextDocument(todoTools.documentOnChange),
    ];

    commands.forEach((command) => context.subscriptions.push(command));
}

export function deactivate() {}
