export function inferType(input: any): string | number | boolean {
    const test = input.toString().toLowerCase();
    switch (test) {
        case "true":
            return true;
            break;
        case "false":
            return false;
            break;
        default:
            break;
    }

    const tryInt = parseInt(test);
    if (tryInt !== NaN) {
        return tryInt;
    }

    const tryFloat = parseFloat(test);
    if (tryFloat !== NaN) {
        return tryFloat;
    }

    return test;
}
