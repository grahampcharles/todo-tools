import * as vscode from "vscode";
import * as todoTools from "./todo-tools";

export function activate(context: vscode.ExtensionContext) {
    const commands = [
        vscode.commands.registerCommand(
            "todotools.performCopy",
            todoTools.performCopy
        ),
        vscode.commands.registerCommand(
            "todotools.vaultArchive",
            todoTools.vaultArchive
        ),
        vscode.commands.registerCommand("todotools.setPriorityHigh", () =>
            todoTools.setPriority("high")
        ),
        vscode.commands.registerCommand("todotools.setPriorityRegular", () =>
            todoTools.setPriority(undefined)
        ),
        vscode.commands.registerCommand("todotools.setPriorityLow", () =>
            todoTools.setPriority("low")
        ),
        vscode.commands.registerCommand("todotools.setDueTomorrow", () =>
            todoTools.setDue(1)
        ),
        vscode.commands.registerCommand("todotools.setDueNextDay", () =>
            todoTools.setDueRelative(1)
        ),
        vscode.commands.registerCommand("todotools.setDuePreviousDay", () =>
            todoTools.setDueRelative(-1)
        ),
        vscode.commands.registerCommand("todotools.setDueInAWeek", () =>
            todoTools.setDue(7)
        ),
        vscode.workspace.onDidOpenTextDocument(todoTools.documentOnOpen),
        vscode.workspace.onDidChangeTextDocument(todoTools.documentOnChange),
    ];

    commands.forEach((command) => context.subscriptions.push(command));
}

export function deactivate() { }
