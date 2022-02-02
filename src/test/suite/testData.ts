import dayjs from "dayjs";

export const testDocument = `Today:
	- every Saturday test
  - done copy to future @done(2022-01-11) @recur(2)

Future:
  - item 2 @due(2022-01-09)

`;

export const testDone = `Today:
  - first @done
  SubProject:
    - second @done
    - this one is not

Later:
  - third @done`;

export const testSettings = `Today:
- first @done
SubProject:
  - second @done
  - this one is not

Settings:
  autoRun=false
  runOnOpen=false
  archiveDoneItems=false
  sortFutureItems=false
  recurringItemsAdjacent=false
  autoRunInterval=45`;
