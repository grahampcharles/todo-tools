import dayjs from "dayjs";

export const testDocument = `Today:
\t- every Saturday test
\t- done copy to future @done(2022-01-11) @recur(2)

Future:
\t- item 2 @due(2022-01-09)

`;

export const testDone = `Today:
\t- first @done
\tSubProject:
\t\t- second @done
\t\t- this one is not

Later:
\t- third @done`;

export const testSettings = `Today:
\t- first @done
\tSubProject:
\t- second @done
\t- this one is not

Settings:
\tautoRun=false
\trunOnOpen=FALSE
\tarchiveDoneItems=False
\tsortFutureItems:False
\trecurringItemsAdjacent=false
\tautoRunInterval=45`;

export const testArchive1Source = `Today:
\t- first @done(3025-05-16) @recur(1)

Archive:
`;

export const testArchive1Target = `Future:
\t- first @recur(1) @due(3025-05-17)

Archive:
\t- first @done(3025-05-16)
`;
