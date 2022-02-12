import { TaskPaperNode } from "task-parser/build/TaskPaperNode";
import * as vscode from "vscode";
import { inferType } from "./inferType";
import { getProjectByName, parseTaskDocument } from "./taskpaper-parsing";

export class Settings {
    // document-specific overrides
    private _docOverrides = new Map<string, any>();

    private getValue<T>(key: string, defaultValue: T): T {
        return (
            (this._docOverrides.has(key)
                ? this._docOverrides.get(key)
                : vscode.workspace.getConfiguration("todotools").get(key)) ??
            defaultValue
        );
    }

    autoRun(): boolean {
        return this.getValue("autoRun", false);
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
        return Math.min(Math.max(ret, 1), 1440);
    }

    update(settingsDocument: TaskPaperNode): void {
        const settings = getProjectByName(settingsDocument, "Settings");
        this._docOverrides.clear(); // clear current overrides
        if (settings === undefined) {
            return;
        }
        // add overrides; they will be note items in yaml format (key = value)
        settings.children
            .filter((node) => node.type === "note")
            .forEach((node) => {
                const parsePattern = /(\S+?)\s*=\s*(\S+)/;
                const parse = parsePattern.exec(node.value ?? "");
                if (parse === null) {
                    return;
                }
                this._docOverrides.set(parse[1], inferType(parse[2]));
            });
    }

    constructor() {}
}
