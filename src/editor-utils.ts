import * as vscode from "vscode";
import { getSectionLineNumber, SectionBounds, stringToLines } from "./strings";

export function editorLines(editor: vscode.TextEditor): string[] {
    return stringToLines(editor.document.getText());
}

export function clearSection(
    editor: vscode.TextEditor,
    fromSection: string
): Thenable<boolean> {
    const lineRange: SectionBounds = getSectionLineNumber(
        editorLines(editor),
        fromSection
    );

    if (lineRange.last !== -1) {
        var range = new vscode.Range(lineRange.first, 0, lineRange.last, 0);
        const edit = new vscode.WorkspaceEdit();
        edit.delete(editor.document.uri, range);
        const applyThenable = vscode.workspace.applyEdit(edit);
        return applyThenable;
    }

    return Promise.resolve(true);
}

export function deleteLine(
    editor: vscode.TextEditor,
    line: number
): Thenable<boolean> {
    const range = new vscode.Range(line - 1, 0, line, 0);
    const edit = new vscode.WorkspaceEdit();
    edit.delete(editor.document.uri, range);
    return vscode.workspace.applyEdit(edit);
}

export type CreateSectionOption = "top" | "bottom";

export async function addLinesToSection(
    textEditor: vscode.TextEditor,
    section: string,
    lines: string[],
    createSectionOption: CreateSectionOption = "bottom"
): Promise<boolean> {
    if (lines.length === 0) {
        // nothing to add
        return true;
    }

    // get the section
    const textToEdit = editorLines(textEditor);

    let line: number,
        character: number = 0;

    // get the first line of the section
    let lineStart = getSectionLineNumber(textToEdit, section).first;
    line = lineStart + 1;

    // special case 1: the project name is
    // the last line of the document => set position to end and add a LF
    if (lineStart === textToEdit.length - 1) {
        line = lineStart;
        character = textToEdit[line].length;
        lines.unshift("");
    }

    // special case 2: the section doesn't exist => create it at the end, after two newlines
    if (lineStart === -1) {
        lines.unshift(`${section}:`); // section name
        if (createSectionOption === "bottom") {
            line = textToEdit.length;
            character = textToEdit[line - 1].length;
            // add spacer: two lines
            lines.unshift(""); // two newline
            lines.unshift(""); // two newline
        }
        if (createSectionOption === "top") {
            line = 0; // is this right?
            character = 0;
        }
    }

    const edit = new vscode.WorkspaceEdit();

    lines.push(""); // add a newline after
    edit.insert(
        textEditor.document.uri,
        new vscode.Position(line, character),
        lines.join("\n")
    );
    return vscode.workspace.applyEdit(edit);
}

export async function insertLineAfter(
    textEditor: vscode.TextEditor,
    line: number,
    text: string
): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(
        textEditor.document.uri,
        new vscode.Position(line + 1, 0),
        `${text}\n`
    );
    return vscode.workspace.applyEdit(edit);
}

export async function insertLinesAfter(
    textEditor: vscode.TextEditor,
    line: number,
    lines: string[]
): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(
        textEditor.document.uri,
        new vscode.Position(line, 0),
        lines.join("\n")
    );
    return vscode.workspace.applyEdit(edit);
}

export async function replaceLine(
    textEditor: vscode.TextEditor,
    line: number,
    text: string
): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
        textEditor.document.uri,
        new vscode.Range(line - 1, 0, line, 0),
        `${text}\n`
    );
    return vscode.workspace.applyEdit(edit);
}
