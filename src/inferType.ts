export function inferType(input: unknown): string | number | boolean {
    if (typeof input === "boolean") {
        return input;
    }

    if (typeof input === "number") {
        return input;
    }

    if (typeof input === "string") {
        const test = input.toLowerCase();
        switch (test) {
            case "true":
                return true;
            case "false":
                return false;
        }

        const tryInt = parseInt(test, 10);
        if (!Number.isNaN(tryInt)) {
            return tryInt;
        }

        const tryFloat = parseFloat(test);
        if (!Number.isNaN(tryFloat)) {
            return tryFloat;
        }

        return test;
    }

    throw new Error("Unsupported input type");
}
