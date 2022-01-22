import { yamlDelimiter } from "./constants";

/**
 *getSection
 *
 * Retrieves a section (project) of the taskpaper document in the editor.
 * @export
 * @param {vscode.TextEditor} editor
 * @param {string} fromSection
 * @return {*}  {string[]}
 */
export function getSection(lines: string[], fromSection: string): string[] {
    var output: string[] = [];
    var isInSection: Boolean = false;

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
 * @export
 * @param {string} line
 * @return {string | Boolean}
 */
export function isSectionHead(line: string): string | Boolean {
    const trimmed: string = line.trim();

    if (trimmed.charAt(trimmed.length - 1) === ":") {
        return trimmed.substring(0, trimmed.length - 1);
    }

    return false;
}
