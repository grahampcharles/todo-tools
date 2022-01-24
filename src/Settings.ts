import * as vscode from "vscode";

export class Settings {
    private config = vscode.workspace.getConfiguration("todotools");
    private millisecondsPerHour: number = 1000 * 60 * 60;

    autoRun(): boolean {
        return this.config.autoRun;
    }
    runOnOpen(): boolean {
        return this.config.runOnOpen;
    }
    archiveDoneItems(): boolean {
        return this.config.archiveDoneItems;
    }
    recurringItemsAdjacent(): boolean {
        return this.config.recurringItemsAdjacent;
    }
    autoRunInterval(): number {
        return (
            Math.min(Math.max(this.config.autoRunInterval, 1), 24) *
            this.millisecondsPerHour
        );
    }

    constructor() {}
}
