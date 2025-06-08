import { TaskPaperNode } from "task-parser";
import { taskDueDateCompare } from "@src/taskpaper-parsing";
import { testDocumentWithHigh } from "./suite/testData.js";

const project = new TaskPaperNode(testDocumentWithHigh);
project.children[0].children.sort(taskDueDateCompare);
console.log(project);
