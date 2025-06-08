import { TaskPaperNode } from "task-parser";
import * as vscode from "vscode";
import { inferType } from "@src/inferType";
import { getProjectByName } from "@src/taskpaper-parsing";

type SettingsMap = {
    autoRun: boolean;
    runOnOpen: boolean;
    archiveDoneItems: boolean;
    overdueSection: boolean;
    sortByDueDate: boolean;
    recurringItemsAdjacent: boolean;
    autoRunInterval: number;
    addTodayTomorrowYesterday: boolean;
    statisticsSection: boolean;
};

export class Settings {
    private _docOverrides = new Map<keyof SettingsMap, SettingsMap[keyof SettingsMap]>();

    private getValue<K extends keyof SettingsMap>(key: K, defaultValue: SettingsMap[K]): SettingsMap[K] {
        if (this._docOverrides.has(key)) {
            return this._docOverrides.get(key)! as SettingsMap[K];
        }

        const configValue = vscode.workspace.getConfiguration("todotools").get(key);

        return (configValue !== undefined ? configValue : defaultValue) as SettingsMap[K];
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

    overdueSection(): boolean {
        return this.getValue("overdueSection", true);
    }

    sortByDueDate(): boolean {
        return this.getValue("sortByDueDate", true);
    }

    recurringItemsAdjacent(): boolean {
        return this.getValue("recurringItemsAdjacent", true);
    }

    autoRunInterval(): number {
        const ret = this.getValue("autoRunInterval", 10);
        return Math.min(Math.max(ret, 1), 1440);
    }

    addTodayTomorrowYesterday(): boolean {
        return this.getValue("addTodayTomorrowYesterday", false);
    }

    statisticsSection(): boolean {
        return this.getValue("statisticsSection", false);
    }

    update(settingsDocument: TaskPaperNode): void {
        const settings = getProjectByName(settingsDocument, "Settings");
        this._docOverrides.clear();

        if (!settings) {return;}

        settings.children
            .filter((node) => node.type === "note")
            .forEach((node) => {
                const parsePattern = /(\S+?)\s*(?:=|:)\s*(\S+)/;
                const parse = parsePattern.exec(node.value ?? "");
                if (parse === null) {return;}

                const key = parse[1] as keyof SettingsMap;
                const rawValue = inferType(parse[2]);

                if (key in this.getDefaults()) {
                    this._docOverrides.set(key, rawValue as SettingsMap[typeof key]);
                }
            });
    }

    private getDefaults(): SettingsMap {
        return {
            autoRun: false,
            runOnOpen: true,
            archiveDoneItems: true,
            overdueSection: true,
            sortByDueDate: true,
            recurringItemsAdjacent: true,
            autoRunInterval: 10,
            addTodayTomorrowYesterday: false,
            statisticsSection: false
        };
    }

    constructor() { }
}
