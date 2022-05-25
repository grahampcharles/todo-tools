export const testDocument = `Today:
\t- not due
\t- due second @due(2022-01-12)
\t- due first @due(2022-01-11)
`;

export const testDocumentWithHigh = `Today:
\t- not due
\t- due second @due(2022-01-10)
\t- due first @due(2022-01-11) @high
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
\tsortByDueDate:False
\trecurringItemsAdjacent=false
\toverdueSection=false
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
