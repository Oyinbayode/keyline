# Manual screen reader testing

Automated checks (axe, Playwright, the Guidepup virtual screen reader) prove the accessibility tree is right. They do not prove a person can use the component with a real screen reader. This file records what a person actually ran.

Use the "Keyboard test fixture" story for each component (Storybook: Components → <name> → Keyboard test fixture). Record the exact versions; screen reader behaviour changes between releases.

## Switch

Steps (from the Switch docs page):

1. Tab to "Wi-Fi". Expect the role (switch / toggle), the name "Wi-Fi", and the state "off" / "not checked".
2. Press Space. Expect the new state "on" / "checked" to be announced without moving focus.
3. Press Enter. Expect "off" / "not checked".
4. Tab again. Expect focus to skip "Airplane mode" and land on "After".
5. Browse mode (Orca: arrow keys; TalkBack: swipe right). Expect "Airplane mode" to be read as a disabled switch.
6. TalkBack: double-tap "Wi-Fi". Expect it to toggle and announce the new state.
7. Visual: focus ring visible in both light and dark themes.

| Screen reader  | Browser     | OS             | Date | Keyline version | Result  | What was announced / notes |
| -------------- | ----------- | -------------- | ---- | --------------- | ------- | -------------------------- |
| Orca _x.y_     | Firefox _x_ | Linux _distro_ |      | 0.0.1           | Pending |                            |
| TalkBack _x.y_ | Chrome _x_  | Android _x_    |      | 0.0.1           | Pending |                            |

When a row passes, change the matching "Manual" row in `src/components/switch/switch.mdx` from `pending` to `pass` and note anything surprising under "Known limitations".

## Tabs

Steps (from the Tabs docs page), against Components → Tabs → Keyboard test fixture:

1. Tab from "Before" into the first list. Expect "Settings" with a tab-list role, then "Account", tab, selected, 1 of 3.
2. Press Right Arrow. Expect focus to skip the disabled "Password" and announce "Billing", selected, 3 of 3.
3. Press Tab. Expect the Billing panel to be announced by name ("Billing", tab panel) and its text read next.
4. Browse mode (Orca: Down Arrow; TalkBack: swipe right) past the panel. Expect the Account and Password panel text never to be read.
5. In "Manual settings", press Right Arrow. Expect "Password", not selected. Press Enter. Expect "selected".
6. In "Vertical settings", press Down Arrow. Expect the next tab; Right Arrow should do nothing.
7. TalkBack: double-tap "Billing" in the first list. Expect it to become selected and its panel to show.
8. Visual: focus ring and the selected keyline visible in both light and dark themes.

| Screen reader  | Browser     | OS             | Date | Keyline version | Result  | What was announced / notes |
| -------------- | ----------- | -------------- | ---- | --------------- | ------- | -------------------------- |
| Orca _x.y_     | Firefox _x_ | Linux _distro_ |      | 0.2.0           | Pending |                            |
| TalkBack _x.y_ | Chrome _x_  | Android _x_    |      | 0.2.0           | Pending |                            |

When a row passes, change the matching "Manual" row in `src/components/tabs/tabs.mdx` from `pending` to `pass`.

## Dialog

Steps (from the Dialog docs page), against Components → Dialog → Keyboard test fixture:

1. Tab to "Open form". Expect a button that says it opens a dialog (Orca: "has popup"; TalkBack may not say it).
2. Press Enter. Expect "Form dialog", dialog, and focus on the "Name" field.
3. Browse mode (Orca: arrow keys, including past the end; TalkBack: swipe left and right). Expect never to reach "Before", "After" or anything else behind the dialog.
4. Press Esc. Expect the dialog to close and "Open form" to be announced again.
5. Open the form, then "Open nested", then press Esc. Expect only the nested dialog to close and focus on "Open nested".
6. Open "Open text-only". Expect the alert's text to be read, with focus on the dialog itself.
7. TalkBack: open the form and use the back gesture. Expect it to close the dialog and return to "Open form".
8. Visual: the dialog surface, its border and the backdrop are clear in both light and dark themes.

| Screen reader  | Browser     | OS             | Date | Keyline version | Result  | What was announced / notes |
| -------------- | ----------- | -------------- | ---- | --------------- | ------- | -------------------------- |
| Orca _x.y_     | Firefox _x_ | Linux _distro_ |      | 0.2.0           | Pending |                            |
| TalkBack _x.y_ | Chrome _x_  | Android _x_    |      | 0.2.0           | Pending |                            |

When a row passes, change the matching "Manual" row in `src/components/dialog/dialog.mdx` from `pending` to `pass`.

## Menu

Steps (from the Menu docs page), against Components → Menu → Keyboard test fixture:

1. Tab from "Before" to "Actions". Expect a button that says it has a popup menu and is collapsed.
2. Press Enter. Expect "Actions", menu, and "New file" with its shortcut.
3. Press Down Arrow twice. Expect "Save", announced as unavailable or dimmed. Press Enter: nothing happens.
4. Type D twice. Expect "Duplicate", then "Delete".
5. Press Esc. Expect the menu to close and "Actions", collapsed, to be announced.
6. Open "Format". Press Space on "Wrap lines". Expect "checked" without the menu closing.
7. Arrow to "Large" and press Enter. Expect it to be announced as checked, in a group named "Text size".
8. TalkBack: double-tap "Actions", swipe through the items, double-tap "Duplicate". Expect the menu to close and "Last action: Duplicate" below.
9. Visual: the active item fill, the tick and dot, and the disabled item are clear in both light and dark themes.

| Screen reader  | Browser     | OS             | Date | Keyline version | Result  | What was announced / notes |
| -------------- | ----------- | -------------- | ---- | --------------- | ------- | -------------------------- |
| Orca _x.y_     | Firefox _x_ | Linux _distro_ |      | 0.3.0           | Pending |                            |
| TalkBack _x.y_ | Chrome _x_  | Android _x_    |      | 0.3.0           | Pending |                            |

When a row passes, change the matching "Manual" row in `src/components/menu/menu.mdx` from `pending` to `pass`.

## Toast

Steps (from the Toast docs page), against Components → Toast → Keyboard test fixture:

1. Activate "Show neutral". Expect "Draft saved" to be read once, and focus to stay on the button.
2. Activate "Show danger". Expect "Error: Upload failed" to interrupt whatever was being read.
3. Activate "Show in half a second", then type in "Message". Expect the announcement without the caret leaving the field.
4. Press F8. Expect "Notifications (F8)", region; Tab to reach "Dismiss: …".
5. Press Esc on a toast. Expect it to go and focus to move to the next toast, or back to "Message".
6. Open "Open settings", then "Save settings". Expect "Success: Settings saved" to be read while the dialog is open, and its "Dismiss" button to work.
7. TalkBack: swipe to the toast list. Expect the toasts to be readable and the timer to wait while one is focused.
8. Visual: slug lines, icon shapes, PAUSED / HELD and the fuse readable in both light and dark themes.

| Screen reader  | Browser     | OS             | Date | Keyline version | Result  | What was announced / notes |
| -------------- | ----------- | -------------- | ---- | --------------- | ------- | -------------------------- |
| Orca _x.y_     | Firefox _x_ | Linux _distro_ |      | 0.2.0           | Pending |                            |
| TalkBack _x.y_ | Chrome _x_  | Android _x_    |      | 0.2.0           | Pending |                            |

When a row passes, change the matching "Manual" row in `src/components/toast/toast.mdx` from `pending` to `pass`.
