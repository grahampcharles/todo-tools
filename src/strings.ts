export type SectionBounds = {
    first: number;
    last: number;
};

export function stringToLines(input: string): string[] {
    return (
        input.replace(/\r\n/gm, "\n").replace(/\r/gm, "\n").split("\n") || []
    );
}

export function stripTrailingWhitespace(input: string): string {
    return input.replace(/([^ \t\r\n])[ \t]+$/gm, "$1");
}

export function getSectionLineNumber(
    lines: string[],
    sectionName: string
): SectionBounds {
    const ret: SectionBounds = { first: -1, last: -1 };

    // sought-after section
    ret.first = lines.findIndex(
        (line) =>
            // TODO: support ignoring tags in section name
            line.match(new RegExp(`^${sectionName}:`)) !== null
    );

    // next section, starting from the line after .first
    if (ret.first !== -1) {
        ret.last = lines.slice(ret.first + 1).findIndex(
            (line) =>
                // TODO: support tags in section name
                line.match(new RegExp(`^.*:`)) !== null
        );
    }
    return ret;
}
