import { TaskPaperNode } from "task-parser/TaskPaperNode";
import { todayDay } from "../dates";

const today = todayDay().format("YYYY-MM-DD");
const testTask = new TaskPaperNode(`  - test item @due(${today}`);

