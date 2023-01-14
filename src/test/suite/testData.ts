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

export const testDocumentWithSubprojectLines = `Today:
\tSubProject 1:
\t\t- task 
\t\t- task

\tSubproject 2:
\t\t- task @done`;

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

export const testWithMultilineCommentsShort = `Project Name:
\tSubproject 1:
\t\tSubsubproject 1-1:
\t\t\t- 1. Task 1-1-1

\t\tSubsubproject 1-2:
\t\t\t- 1. Task 1-2-1
\t\t\t- 2. Task 1-2-2 With Notes
\t\t\t\tHere's one line of notes
\t\t\t\tHere's another line of notes
\t\t\t\tHere's a third line of notes
\t\t\t- 3. Task 1-2-2 With Notes
\t\t\t\tNotes line 1
\t\t\t\tNotes line 2
`;
