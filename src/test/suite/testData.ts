import dayjs from "dayjs";

export const testDocument = `Today:
	- every Saturday test
  - done copy to future @done(2022-01-11) @recur(2)

Future:
  - item 2 @due(2022-01-09)

`;

export const testYamlTasks = `# todotools settings for this document
runOnOpen: True
runDaily: True
tasks: 
  daily: 
    - mow lawn
  2: 
    - eat groceries
    - every other day task two
  Tuesday:
    - shop
  11/1:
    - task for 1 November
  11/14/2021:
    - pay taxes
  4/10/2022:
    - pay taxes
  12/1:
    - start XMas shopping
  monthly: 
    - pay rent
  Saturday:
    - every Saturday test
`;

export const testYamlTasks2 = `
tasks: 
  daily: 
  \t- mow lawn
  2: 
    - eat groceries
    - every other day task two
  Tuesday:
    - shop
  11/1:
    - task for 1 November
  11/14/2021:
    - pay taxes
  4/10/2022:
    - pay taxes
  12/1:
    - start XMas shopping
  monthly: 
    - pay rent
  March:
    - CoinStar
  September:
    - CoinStar
  Saturday:
    - every Saturday test
`;

export const testYaml = [
    "# todotools settings for this document",
    "runOnOpen: True",
    "runDaily: True",
    "lastAutoRun: 2021-11-11T04:22:18.137Z",
].join("\r\n");

const todayString = dayjs().format();
export const testYamlToday = [
    "# todotools settings for this document",
    "runOnOpen: True",
    "runDaily: True",
    `lastAutoRun: ${todayString}`,
].join("\r\n");
