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
  sortByDueDate=true
  recurringItemsAdjacent=true
  autoRunInterval=15
  overdueSection=TRUE
```

**Copy Daily Tasks to Today**
: This task will copy any completed tasks with certain tags back into the "Today" section, unless they are already there. This allows you to create daily, monthly, or annual tasks (e.g. "Feed the cat") without having to re-type them.

## Current Development Path

Items have flags that set their recurrence patterns.

```
- item #0 @due(today)                     # tokens in @due processed: today, tomorrow, day-of-week, yesterday
- item #1 @recur(2)                       # add @due => today + 2
- item #2 @recur(2) @due(anything)        # No change.
- item #3 @done(2020-01-03) @recur(2)     # new adjacent node created with @due=@done+2, @done removed, @recur/started/lasted removed
- item #4 @done(2020-01-03) @annual(11/1) # new adjacent node created with @due=next 11/1 after @done, @done removed, @recur/started/lasted removed
- item #5 @annual(11/1) @due(anything)    # no change
- item #6 @annual(11/1) @done(1/3/2020)   # add adjacent @due => next 11/1 after @done; @annual removed
- item #7 @annual(11/1)                   # add @due => next 11/1 after today
- item #8 @recur(Monday) @due(anything)  # no change
- item #9 @recur(Monday) @done(1/3)      # add adjacent node @due => next Monday after @done; @weekly removed
- item #10 @recur(Monday)                # add @due => next Monday 

```

Items are processed in this order:

1. All items 0-10 are processed; new items accumulator is created.
2. New adjacent items inserted from the highest line index to the lowest
3. Items not in Today where @due <= today are moved to Today
4. Items in Today where @due >= today are moved to Future  (if recurringItemsAdjacent=false)
5. Items not in Archive where @done have @project set, @recur removed, moved to Archive (if archiveDoneItems=true)
6. All projects except archive are sorted by @due (if sortByDueDate=true)

## Extension Settings

For now, this process only runs if there is a Settings project with this format:

```Settings:
   autoRun=true
```

None in the settings file at the moment.

## Development Pathway

-   Change command name to more generic name, like, updateRecurringTasks or something
