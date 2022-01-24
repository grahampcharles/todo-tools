import * as vscode from "vscode";

export class Settings {
    autoRun(): boolean {
        return (
            vscode.workspace.getConfiguration("todotools").get("autoRun") ??
            true
        );
    }
    runOnOpen(): boolean {
        return (
            vscode.workspace.getConfiguration("todotools").get("runOnOpen") ??
            true
        );
    }
    archiveDoneItems(): boolean {
        return (
            vscode.workspace
                .getConfiguration("todotools")
                .get("archiveDoneItems") ?? true
        );
    }
    recurringItemsAdjacent(): boolean {
        return (
            vscode.workspace
                .getConfiguration("todotools")
                .get("recurringItemsAdjacent") ?? true
        );
    }
    autoRunInterval(): number {
        const ret: number =
            vscode.workspace
                .getConfiguration("todotools")
                .get("autoRunInterval") ?? 10;
        return Math.min(Math.max(ret, 1), 3600);
    }

    constructor() {}
}
