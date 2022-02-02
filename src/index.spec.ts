const HTTP_STATUS_SUCCESS = 200
const HTTP_STATUS_ERROR = 500

const DEFAULT_REQUEST_OPTIONS = {
  owner: 'Someone',
  repo: 'repo',
  pull_number: 123,
}

type MockContextSpies = {
  setFailedSpy: jest.SpyInstance
  errorSpy: jest.SpyInstance
  prUpdateSpy: jest.SpyInstance
}

async function mockContext(options: {
  branch: string
  prTitle?: string
  prBody?: string
  jiraAccount?: string
  ticketRegex?: string
  ticketRegexFlags?: string
  exceptionRegex?: string
  cleanTitleRegex?: string
  preview?: string
  updateStatus?: number
  contextRepoObject?: null | { owner: string; repo: string }
  hasPullRequestContext?: boolean
}): Promise<MockContextSpies> {
  const {
    branch,
    prTitle = 'title',
    prBody = 'body',
    jiraAccount = 'account',
    ticketRegex = '^A1C-\\d+',
    ticketRegexFlags = 'i',
    exceptionRegex = '^dependabot\\/',
    cleanTitleRegex = '^\\s*A1\\s+c\\s+\\d+\\s*',
    preview = 'preview',
    updateStatus = HTTP_STATUS_SUCCESS,
    contextRepoObject = {
      owner: DEFAULT_REQUEST_OPTIONS.owner,
      repo: DEFAULT_REQUEST_OPTIONS.repo,
    },
    hasPullRequestContext = true,
  } = options
  const setFailedSpy = jest.fn()
  const errorSpy = jest.fn()
  const prUpdateSpy = jest.fn(() => ({ status: updateStatus }))

  jest.doMock('@actions/core', () => ({
    getInput: jest.fn((input: string) => {
      if (input === 'github-token') return 'abc123'
      if (input === 'jira-account') return jiraAccount
      if (input === 'ticket-regex') return ticketRegex
      if (input === 'ticket-regex-flags') return ticketRegexFlags
      if (input === 'exception-regex') return exceptionRegex
      if (input === 'clean-title-regex') return cleanTitleRegex
      if (input === 'preview-link') return preview
      return ''
    }),
    setFailed: setFailedSpy,
    error: errorSpy,
  }))
  jest.doMock('@actions/github', () => ({
    context: {
      payload: {
        pull_request: hasPullRequestContext
          ? {
              title: prTitle,
              body: prBody,
              number: DEFAULT_REQUEST_OPTIONS.pull_number,
              head: {
                ref: branch,
              },
            }
          : undefined,
      },
      repo: contextRepoObject,
    },
    getOctokit: jest.fn(() => ({
      rest: {
        pulls: {
          update: prUpdateSpy,
        },
      },
    })),
  }))
  return { setFailedSpy, errorSpy, prUpdateSpy }
}

describe('#pull-request', () => {
  let ticket: string
  let preview: string
  let setFailedSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance
  let prUpdateSpy: jest.SpyInstance

  describe('when jira-account input is missing', () => {
    describe('and when ticket-regex input is also missing', () => {
      beforeAll(async () => {
        jest.resetModules()
        jest.resetAllMocks()
        const options = {
          branch: 'A1C-888-foo-bar',
          jiraAccount: '',
          ticketRegex: '',
        }
        ;({ errorSpy, prUpdateSpy } = await mockContext(options))
        await import('.')
      })

      it('sets error status', () => {
        expect(errorSpy).toHaveBeenCalledWith('Missing required inputs: jira-account, ticket-regex')
      })

      it('does not update PR', () => {
        expect(prUpdateSpy).not.toHaveBeenCalled()
      })
    })

    describe('and when ticket-regex input is provided', () => {
      beforeAll(async () => {
        jest.resetModules()
        jest.resetAllMocks()
        const options = {
          branch: 'AAA-444-foo-bar',
          jiraAccount: '',
          ticketRegex: '^AAA-\\d+-',
        }
        ;({ errorSpy, prUpdateSpy } = await mockContext(options))
        await import('.')
      })

      it('sets error status', () => {
        expect(errorSpy).toHaveBeenCalledWith('Missing required input: jira-account')
      })

      it('does not update PR', () => {
        expect(prUpdateSpy).not.toHaveBeenCalled()
      })
    })

    describe('and when ticket-regex input is provided', () => {
      beforeAll(async () => {
        jest.resetModules()
        jest.resetAllMocks()
        const options = {
          branch: 'AAA-444-foo-bar',
          jiraAccount: '',
          ticketRegex: '^AAA-\\d+-',
        }
        ;({ errorSpy, prUpdateSpy } = await mockContext(options))
        await import('.')
      })

      it('sets error status', () => {
        expect(errorSpy).toHaveBeenCalledWith('Missing required input: jira-account')
      })

      it('does not update PR', () => {
        expect(prUpdateSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('when current branch includes Jira ticket', () => {
    describe('and when PR update request is successful', () => {
      describe('and when PR description already includes preview/Jira links', () => {
        describe('and when links are changing', () => {
          beforeAll(async () => {
            jest.resetModules()
            jest.resetAllMocks()
            ticket = 'A1C-1234'
            preview = 'https://preview-123.example.com'
            const options = {
              branch: `${ticket}-some-feature`,
              preview,
              updateStatus: HTTP_STATUS_SUCCESS,
              prBody: '**[Preview](foo-bar.com)**\n**[Jira ticket](jira.com)**\n\nMore details',
            }
            ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
            await import('.')
          })

          it('does not set failed status', () => {
            expect(setFailedSpy).not.toHaveBeenCalled()
            expect(errorSpy).not.toHaveBeenCalled()
          })

          it('updates PR title and current links in description', () => {
            expect(prUpdateSpy).toHaveBeenCalledWith({
              ...DEFAULT_REQUEST_OPTIONS,
              title: `${ticket} - title`,
              body:
                `**[Preview](${preview})**\n` +
                `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nMore details`,
            })
          })
        })

        describe('and when links are not changing', () => {
          describe('and when PR title already includes Jira ticket', () => {
            beforeAll(async () => {
              jest.resetModules()
              jest.resetAllMocks()
              ticket = 'A1C-1234'
              preview = 'preview-123'
              const options = {
                branch: `${ticket}-some-feature`,
                preview,
                updateStatus: HTTP_STATUS_SUCCESS,
                prTitle: `${ticket} - Some feature`,
                prBody:
                  `**[Preview](${preview})**\n` +
                  `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nMore details`,
              }
              ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
              await import('.')
            })

            it('does not set failed status', () => {
              expect(setFailedSpy).not.toHaveBeenCalled()
              expect(errorSpy).not.toHaveBeenCalled()
            })

            it('does not update PR', () => {
              expect(prUpdateSpy).not.toHaveBeenCalled()
            })
          })
        })
      })

      describe('and when PR description does not include preview/Jira links yet', () => {
        beforeAll(async () => {
          jest.resetModules()
          jest.resetAllMocks()
          ticket = 'A1C-1234'
          preview = 'preview-123'
          const options = {
            branch: `${ticket}-some-feature`,
            preview,
            updateStatus: HTTP_STATUS_SUCCESS,
          }
          ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
          await import('.')
        })

        it('does not set failed status', () => {
          expect(setFailedSpy).not.toHaveBeenCalled()
          expect(errorSpy).not.toHaveBeenCalled()
        })

        it('updates PR title and description', () => {
          expect(prUpdateSpy).toHaveBeenCalledWith({
            ...DEFAULT_REQUEST_OPTIONS,
            title: `${ticket} - title`,
            body:
              `**[Preview](${preview})**\n` +
              `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nbody`,
          })
        })
      })
    })

    describe('and when PR update request fails', () => {
      beforeAll(async () => {
        jest.resetModules()
        jest.resetAllMocks()
        ticket = 'A1C-1234'
        preview = 'preview-123'
        const options = {
          branch: `${ticket}-some-feature`,
          preview,
          updateStatus: HTTP_STATUS_ERROR,
        }
        ;({ errorSpy, prUpdateSpy } = await mockContext(options))
        await import('.')
      })

      it('tries to update PR title and description', () => {
        expect(prUpdateSpy).toHaveBeenCalledWith({
          ...DEFAULT_REQUEST_OPTIONS,
          title: `${ticket} - title`,
          body:
            `**[Preview](${preview})**\n` +
            `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nbody`,
        })
      })

      it('sets error status', () => {
        expect(errorSpy).toHaveBeenCalledWith(
          `Updating the pull request has failed with ${HTTP_STATUS_ERROR}`
        )
      })
    })
  })

  describe('when current branch does not include Jira ticket', () => {
    describe('and when exception-regex input does not match current branch', () => {
      beforeAll(async () => {
        jest.resetModules()
        jest.resetAllMocks()
        preview = 'preview-456'
        const options = { branch: 'foo-bar', preview, exceptionRegex: '^exception' }
        ;({ setFailedSpy, prUpdateSpy } = await mockContext(options))
        await import('.')
      })

      it('sets failed status', () => {
        expect(setFailedSpy).toHaveBeenCalledWith(
          expect.stringContaining('branch name does not start with a Jira ticket')
        )
      })

      it('updates PR description with preview link only', () => {
        expect(prUpdateSpy).toHaveBeenCalledWith({
          ...DEFAULT_REQUEST_OPTIONS,
          body: `**[Preview](${preview})**\n\nbody`,
        })
      })
    })

    describe('and when current branch is dependabot', () => {
      describe('and when no exception-regex input is provided', () => {
        beforeAll(async () => {
          jest.resetModules()
          jest.resetAllMocks()
          ticket = 'A1C-1234'
          preview = 'preview-123'
          const options = {
            branch: `${ticket}-some-feature`,
            preview,
            updateStatus: HTTP_STATUS_SUCCESS,
          }
          ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
          await import('.')
        })

        it('does not set failed status', () => {
          expect(setFailedSpy).not.toHaveBeenCalled()
          expect(errorSpy).not.toHaveBeenCalled()
        })

        it('updates PR title and description', () => {
          expect(prUpdateSpy).toHaveBeenCalledWith({
            ...DEFAULT_REQUEST_OPTIONS,
            title: `${ticket} - title`,
            body:
              `**[Preview](${preview})**\n` +
              `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nbody`,
          })
        })
      })
    })
  })

  describe('when clean-title-regex input is provided', () => {
    beforeAll(async () => {
      jest.resetModules()
      jest.resetAllMocks()
      ticket = 'A1C-4466'
      const options = {
        branch: `${ticket}-feature`,
        prTitle: 'A1 c 4466 feature',
        cleanTitleRegex: '^\\s*A1\\s+c\\s+\\d+\\s*',
      }
      ;({ prUpdateSpy } = await mockContext(options))
      await import('.')
    })

    it('cleans PR title', () => {
      expect(prUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: `${ticket} - feature` })
      )
    })
  })

  describe('when clean-title-regex input is missing', () => {
    let prTitle: string

    beforeAll(async () => {
      jest.resetModules()
      jest.resetAllMocks()
      ticket = 'A1C-4466'
      prTitle = 'A1 c 4466 feature'
      const options = {
        branch: `${ticket}-feature`,
        prTitle,
        cleanTitleRegex: '',
      }
      ;({ prUpdateSpy } = await mockContext(options))
      await import('.')
    })

    it('does not clean PR title', () => {
      expect(prUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: `${ticket} - ${prTitle}` })
      )
    })
  })

  describe('when preview-link input is missing', () => {
    describe('and when current branch includes Jira ticket', () => {
      describe('and when PR title already includes Jira ticket', () => {
        beforeAll(async () => {
          jest.resetModules()
          jest.resetAllMocks()
          ticket = 'A1C-2222'
          preview = ''
          const options = {
            branch: `${ticket}-nice-feature`,
            preview,
            prTitle: `${ticket} - Nice feature`,
          }
          ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
          await import('.')
        })

        it('does not set failed status', () => {
          expect(setFailedSpy).not.toHaveBeenCalled()
          expect(errorSpy).not.toHaveBeenCalled()
        })

        it('updates PR description only', () => {
          expect(prUpdateSpy).toHaveBeenCalledWith({
            ...DEFAULT_REQUEST_OPTIONS,
            body: `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nbody`,
          })
        })
      })

      describe('and when PR title does not include Jira ticket yet', () => {
        beforeAll(async () => {
          jest.resetModules()
          jest.resetAllMocks()
          ticket = 'A1C-2222'
          preview = ''
          const options = { branch: `${ticket}-nice-feature`, preview }

          ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
          await import('.')
        })

        it('does not set failed status', () => {
          expect(setFailedSpy).not.toHaveBeenCalled()
          expect(errorSpy).not.toHaveBeenCalled()
        })

        it('updates PR description with Jira link only', () => {
          expect(prUpdateSpy).toHaveBeenCalledWith({
            ...DEFAULT_REQUEST_OPTIONS,
            title: `${ticket} - title`,
            body: `**[Jira ticket](https://account.atlassian.net/browse/${ticket})**\n\nbody`,
          })
        })
      })
    })

    describe('and when current branch does not include Jira ticket', () => {
      beforeAll(async () => {
        jest.resetModules()
        jest.resetAllMocks()
        preview = ''
        const options = { branch: 'foo-bar', preview }

        ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
        await import('.')
      })

      it('sets failed status', () => {
        expect(setFailedSpy).toHaveBeenCalledWith(
          expect.stringContaining('branch name does not start with a Jira ticket')
        )
      })

      it('does not update PR', () => {
        expect(prUpdateSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('when context payload does not include pull_request', () => {
    beforeAll(async () => {
      jest.resetModules()
      jest.resetAllMocks()
      const options = { branch: 'a', hasPullRequestContext: false }

      ;({ setFailedSpy, errorSpy, prUpdateSpy } = await mockContext(options))
      await import('.')
    })

    it('does not set failed status', () => {
      expect(setFailedSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('does not update PR', () => {
      expect(prUpdateSpy).not.toHaveBeenCalled()
    })
  })

  describe('when a runtime error occurs', () => {
    beforeAll(async () => {
      jest.resetModules()
      jest.resetAllMocks()
      ;({ setFailedSpy, prUpdateSpy } = await mockContext({ branch: 'a', contextRepoObject: null }))
      await import('.')
    })

    it('sets failed status', () => {
      expect(setFailedSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot read property'))
    })

    it('does not update PR', () => {
      expect(prUpdateSpy).not.toHaveBeenCalled()
    })
  })
})
