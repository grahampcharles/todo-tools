import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { taskDueDateCompare } from "../taskpaper-parsing";
import { testDocumentWithHigh } from "./suite/testData";

const project = new TaskPaperNode(testDocumentWithHigh);
project.children[0].children.sort(taskDueDateCompare);
console.log(project);
