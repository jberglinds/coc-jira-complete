const { sources, workspace } = require('coc.nvim')
const fetch = require('node-fetch')

/**
 * Fetches unresolved JIRA issues for a user
 */
const fetchIssues = (workspaceUrl, username, apiKey) => {
  const auth = Buffer.from(`${username}:${apiKey}`).toString('base64')
  const headers = new fetch.Headers({
    Authorization: `Basic ${auth}`
  })
  const xUsername = username.replace('@', '\\u0040') // Escape @ character
  const query = `assignee=${xUsername}+and+resolution=unresolved`
  const fields = 'summary,updated'
  return fetch(
    `${workspaceUrl}/rest/api/2/search?jql=${query}&fields=${fields}`,
    { headers }
  )
    .then(res => res.json())
    .then(json =>
      json.issues.map(issue => ({
        key: issue.key,
        title: issue.fields.summary
      }))
    )
}

exports.activate = async context => {
  const config = workspace.getConfiguration('jira')

  const workspaceUrl = config.get('workspaceUrl')
  const username = config.get('username')
  const apiKey = config.get('apiKey')

  if (!workspaceUrl || !username || !apiKey) {
    workspace.showMessage(
      'JIRA configuration missing from :CocConfig',
      'warning'
    )
    return
  }

  let issues = []
  try {
    issues = await fetchIssues(workspaceUrl, username, apiKey)
  } catch (error) {
    workspace.showMessage(
      'Failed to fetch JIRA issues, check :CocOpenLog',
      'error'
    )
    console.error('Failed to fetch JIRA issues: ', error)
  }

  let source = {
    name: 'jira-autocomplete',
    triggerOnly: false,
    doComplete: async () => {
      return {
        items: issues.map(issue => {
          return {
            word: issue.key,
            abbr: `${issue.key} ${issue.title}`
          }
        })
      }
    }
  }
  context.subscriptions.push(sources.createSource(source))
}
