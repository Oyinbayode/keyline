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
