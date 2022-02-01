# Jira pull-request Github action

If the branch name of the current pull request starts with a Jira ticket:

- It adds the ticket number to the PR title
- It adds the Jira link to the PR description
- It also adds a preview link to the PR description if provided as `preview-link` input

If the branch name does not start with a Jira ticket:

- The workflow will fail

## Goal

Make sure we create small pull requests tackling only one ticket. If a ticket requires more than one pull request, it's a good indicator that the ticket itself should be split into smaller ones.

## Inputs

| input               | required | description                                                                                   |
| ------------------- | :------: | --------------------------------------------------------------------------------------------- |
| `github-token`      |    ❌    | The GitHub token used to create an authenticated client (default: `${{ github.token }}`       |
| `jira-account`      |    ✅    | Subdomain used for jira link (i.e. `foobar` => `https://foobar.atlassian.net/browse/ABC-123`) |
| `ticket-regex`      |    ✅    | Regex to match jira ticket in branch name (i.e. `^ABC-\d+`)                                   |
| `clean-title-regex` |    ❌    | Regex used to delete text from PR title                                                       |
| `preview-link`      |    ❌    | Preview link to add to PR description (i.e. `https://preview.example.com`)                    |

## Usage

```yml
name: Update pull request

on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  title-and-description:
    if: github.actor != 'dependabot[bot]' # this is needed if you use Dependabot
    runs-on: ubuntu-latest

    steps:
      - name: Add Jira ticket to PR title / add links to PR description
        uses: onrunning/jira-pr-action@v1
        with:
          jira-account: account-name
          ticket-regex: ^A1C-\\d+
          clean-title-regex: ^\\s*A1\\s+c\\s+\\d+\\s*
          preview-link: https://preview-${{ github.event.pull_request.number }}.example.com"
```
