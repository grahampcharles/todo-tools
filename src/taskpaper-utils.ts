import { TaskPaperNode } from "task-parser";

const yamlDelimiter = "---";
/**
 *getSection
 *
 * Retrieves a section (project) of the taskpaper document in the editor.
 * Skips yaml sections, if any.
 * @export
 * @param {vscode.TextEditor} editor
 * @param {string} fromSection
 * @return {*}  {string[]}
 */
export function getSection(lines: string[], fromSection: string): string[] {
    const output: string[] = [];
    let isInSection: boolean = false;

    for (let i = 0; i < lines.length; i++) {
        if (isSectionHead(lines[i]) === fromSection) {
            isInSection = true;
        } else if (lines[i] === yamlDelimiter) {
            isInSection = false;
        } else if (isSectionHead(lines[i])) {
            isInSection = false;
        } else if (/\S/.test(lines[i])) {
            // something other than whitespace?
            if (isInSection) {
                output.push(lines[i]);
            }
        }
    }

    return output;
}

/**
 *isSectionHead
 *Returns a string (the Project name) if the current line is the project head; otherwise returns false.
 */
export function isSectionHead(line: string): string | boolean {
    const trimmed: string = line.trim();

    if (trimmed.charAt(trimmed.length - 1) === ":") {
        return trimmed.substring(0, trimmed.length - 1);
    }

    return false;
}

export const addProjectTag  = (node: TaskPaperNode) : void => {
    node.setTag("project", node.parents().map((parentNode) => parentNode.value ).join(".") || "" );
};