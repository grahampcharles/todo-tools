# `todotools` README

The `todotools` extension adds some task list management shortcuts for TaskPaper documents.

## Features

### Settings

Along with the settings at the User or Workspace level, this app allows each taskpaper document to have its own settings section. To override one or more settings per-document, create a top-level section called _Settings_ and populate it with note nodes (that is, without any task prefix like `-` or `*`) with any of the following key-value pairs:

```
Settings:
  autoRun=true
  runOnOpen=false
  archiveDoneItems=true
  sortFutureItems=true
  recurringItemsAdjacent=true
  autoRunInterval=15
```

**Copy Daily Tasks to Today**
: This task will copy any completed tasks with certain tags back into the "Today" section, unless they are already there. This allows you to create daily, monthly, or annual tasks (e.g. "Feed the cat") without having to re-type them.

## Current Development Path

Items have flags that set their recurrence patterns.

```
- item #1 @recur(2)                       # Due date of today + 2 days set; item moved to Future section.
- item #2 @recur(2) @due(anything)        # No change.
- item #3 @done(2020-01-03) @recur(2)     # Due date of done + 2 days set; copied to Future section without @done, @recur flag removed from local copy.
- item #4 @done(2020-01-03) @annual(11/1) # Copied to Future section without @done, @annual flag removed.
- item #5 @annual(11/1) @due(anything)    # No change.
- item #6 @annual(11/1)                   # Due date of the next 11/1/YYYY set.
- item #7 @due(2020-01-04) (no @done)     # Unless already in Today, moved to today.
```

Items are processed in this order:

1. Everything is checked for all of the above conditions except #7, creating an accumulator for "new Future" items.
2. New future items are inserted into Future.
3. Everything that isn't in today is checked for #7, creating an accumulator for "new Today" items.
4. New today items are inserted into Today.

## Extension Settings

For now, this process only runs if there is a Settings project with this format:

```Settings:
   - Recurring: true
```

None in the settings file at the moment.

## Development Pathway

-   Change command name to more generic name, like, updateRecurringTasks or something
-   Add archiving @done items.
