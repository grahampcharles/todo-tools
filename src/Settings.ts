import * as vscode from "vscode";

export class Settings {
    private getValue<T>(key: string, defaultValue: T): T {
        return (
            vscode.workspace.getConfiguration("todotools").get(key) ??
            defaultValue
        );
    }

    autoRun(): boolean {
        return this.getValue("autoRun", true);
    }
    runOnOpen(): boolean {
        return this.getValue("runOnOpen", true);
    }
    archiveDoneItems(): boolean {
        return this.getValue("archiveDoneItems", true);
    }

    sortFutureItems(): boolean {
        return this.getValue("sortFutureItems", true);
    }

    recurringItemsAdjacent(): boolean {
        return this.getValue("recurringItemsAdjacent", true);
    }

    autoRunInterval(): number {
        const ret: number = this.getValue("autoRunInterval", 10);
        return Math.min(Math.max(ret, 1), 3600);
    }

    constructor() {}
}
