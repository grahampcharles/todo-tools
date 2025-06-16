# Change Log

All notable changes to the "todo-tools" extension will be documented in this file.

## [0.]

## [0.8.3] - 2023-01-18
### add
- put @today at the top

## [0.8.3] - 2023-01-14
### fix
- statistics not sorting @today @done(23-01-14 14:37)
- due(Monday) is not working @due(2023-01-14) @today @done(23-01-14 14:25)

## [0.8.2] - 2022-09-27
### fix
- now using the @today tag will force items into the @today section

## [0.8.1] - 2022-09-27
### fix
- removing all whitespace lines

## [0.8.0] - 2022-09-23
### fix
- bugfixes in complex documents

## [0.7.9] - 2022-09-19
### fix
- fixed recurrence when a task is done early (before due date)

## [0.7.8] - 2022-09-19
### add
- statistics option

### fix
- clears "today", "tomorrow", "yesterday" from archived tasks
- performance on large files

## [0.7.7] - 2022-09-16
### add
- added option to tag with @today, @tomorrow, @yesterday

## [0.7.6] - 2022-09-14
### add
- save project name to archive

## [0.7.5] - 2022-09-11
### fix
- autoRun troubleshooting

## [0.7.3] - 2022-06-27
### add
- priority setting commands
- due date +7 command
- keybindings

## [0.7.2] - 2022-06-01
### add
- sort @started items to the top

## [0.7.1] - 2022-05-26
### fix
- future recurring items not moving to future
- 'today' day not being reevaluated as time passes

## [0.7.0] - 2022-05-25
### add
- optional "overdue" section
- @high tag handling (sorts to top)

### fix
- sorting; blank lines fixes


## [0.6.0] - 2022-04-30
### enhance
- retain project tag on tasks that are recurred
- replaced sort algorithm with vscode-sort-lines

### fix
- some undone items are being moved to Archive #5


## [0.5.4] - 2022-02-12
### fix 
- archived items get moved to Today (and back) #4

## [0.5.3] - 2022-02-11

### add 
- normalize dates in the form ["today", "tomorrow", "yesterday", "2/3", etc. ]
- re-worked and clarified the code

### fix 
- filter projects returns archive
- recurring items adjacent not working
- duplicating items

## [0.5.2] - interim

This was an interim build to see if my cleanup sorted any of the duplication problems

## [0.5.1] - 2022-02-02

### add
- document-specific settings section

## [0.4.10] - 2022-01-25

### add

-   sort every section by @due

## [0.4.9] - 2022-01-24

### fix

-   duplicate recurrences happening
-   not auto-saving

## [0.4.8] - 2022-01-23

### added

-   generate "future" items adjacent to existing items

## [0.4.6] - 2022-01-23

### added

-   settings page
-   syntax highlighting

### fixed

-   project parsing bug

### removed

-   references to YAML

## [0.4.3] - 2022-01-16

### added

-   moves items to the Archive project as well

## [0.4.1] - 2022-01-14:

### fixed

-   completed @annual items should be copied back into the @future section
-   various parser errors
-   recurrence pattern always produces today

## [0.4.0] - 2022-01-12:

### added

-   removed all YAML sections in favor of @recur(number), @recur(days), and @annual(M/DD) tags

### fixed

-   if `Today` section is empty, extension adds a blank line at the top of the section

## [0.3.3] - 2021-12-04

### added

-   reports yaml parser errors
-   clean the yaml a bit

### fixed

-   extension is not running; feature contributions are not made

## [0.3.2] - 2021-11-28

### fixed

-   Sunday not working ; other days fine

## [0.3.1] - 2021-11-26

### added

-   support "monthly" again

### changed

-   adjusted YAML format (again ;))

### fixed

-   if `Today` section is empty, extension adds a blank line at the top of the section
-   yaml parser has no error handling (specifically: duplicate keys, bad formatting (like tab instead of space)) @critical

## [0.2.1] - 2021-11-16

### fixed

-   auto-runs even if a day has not passed

## [0.2.0] - 2021-11-16

### fixed

-   repeats existing tasks
-   merge the two YAML parsers; remove `yamljs` in favor of `yaml` (which has typescript types)

## [0.1.1] - 2021-11-02

### added

-   arbitrary future date items in the format `mm-dd` or `yyyy-mm-dd`

## [0.1.0] - 2021-10-25

### fixed:

-   set date to GMT date
-   make sure update isn't happening twice (perhaps related to above) like when lastCheckDate appears to be in the future

## [0.0.9] - 2021-04-03

### added:

-   auto-save when auto-running
-   auto-rerun every hour if file is open

## [0.0.8] - 2021-02-20

### Fixed

-   edits not being executed

## [0.0.7] - 2021-02-20

### Fixed

-   day-of-week clears one too many lines, including the next section name if it's close enough

## [0.0.6] - 2021-02-01

### Added

-   opinionated day-of-week cues:
    -   `Weekday Name (singular): (e.g. "Sunday")` for one-time tasks (e.g. "next Sunday")
    -   `Weekday Name (singular): (e.g. "Sundays")` for recurring tasks (e.g. "every Sunday")

## [0.0.5]

### Added

-   days-of-the-week cues

## [0.0.4]

### Added

-   Added YAML property to prevent auto-run more than once per day.

## [0.0.3]

### Added

-   activationEvents call.

## [0.0.2]

### Added

-   a simple recurrence section: "Every Third Day"

## [0.0.1]

### Added

-   In-house release.
