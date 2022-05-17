import * as vscode from "vscode";
import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { Settings } from "../Settings";
import { processTaskNode } from "../taskpaper-parsing";
import { testArchive1Source, testArchive1Target } from "./suite/testData";
import { getSpecialProjects } from "../todo-tools";

const items = new TaskPaperNode(testArchive1Source);

var archiveProject: TaskPaperNode | undefined,
    todayProject: TaskPaperNode | undefined,
    futureProject: TaskPaperNode | undefined;
[archiveProject, todayProject, futureProject] = getSpecialProjects(items);

const settings = new Settings();

processTaskNode(items, settings, archiveProject, todayProject, futureProject);

console.log(items.toStringWithChildren().join("/n"));
console.log(testArchive1Target);

console.log("");
