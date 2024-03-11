# Jira pull-request Github action

If the branch name of the current pull request or the title starts with a Jira ticket:

- It adds the ticket number to the PR title
- It adds the Jira link to the PR description
- It also adds a preview link to the PR description if provided as `preview-link` input

If the branch name and the PR title does not start with a Jira ticket:

- The workflow will fail

## Goal

Make sure we create small pull requests tackling only one ticket. If a ticket requires more than one pull request, it's a good indicator that the ticket itself should be split into smaller ones.

## Inputs

| input                     | required | description                                                                                   |
| ------------------------- | :------: | --------------------------------------------------------------------------------------------- |
| `github-token`            |    ❌    | The GitHub token used to create an authenticated client (default: `${{ github.token }}`       |
| `jira-account`            |    ✅    | Subdomain used for jira link (i.e. `foobar` => `https://foobar.atlassian.net/browse/ABC-123`) |
| `ticket-regex`            |    ✅    | Regex to match jira ticket in branch name (i.e. `^ABC-\d+`)                                   |
| `ticket-regex-flags`      |    ❌    | Flags to add to ticket-regex (default: `i`)                                                   |
| `exception-regex`         |    ❌    | Regex to allow exceptions where ticket-regex wouldn't match (default: `^dependabot\/`)        |
| `exception-regex-flags`   |    ❌    | Flags to add to exception-regex                                                               |
| `clean-title-regex`       |    ❌    | Regex used to delete text from PR title                                                       |
| `clean-title-regex-flags` |    ❌    | Flags to add to clean-title-regex                                                             |
| `preview-link`            |    ❌    | Preview link to add to PR description (i.e. `https://preview.example.com`)                    |

## Usage

```yml
name: Update pull request

on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  title-and-description:
    if: github.actor != 'dependabot[bot]' # to avoid running it on Dependabot PRs
    runs-on: ubuntu-latest

    steps:
      - name: Add Jira ticket to PR title / add links to PR description
        uses: onrunning/jira-pr-action@v2
        with:
          jira-account: account-name
          ticket-regex: ^A1C-\\d+
          clean-title-regex: ^\\s*A1\\s+c\\s+\\d+\\s*
          preview-link: https://preview-${{ github.event.pull_request.number }}.example.com"
```
