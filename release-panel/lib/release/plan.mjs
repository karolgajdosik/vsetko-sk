export const repositoryName = 'karolgajdosik/vsetko-sk';
export const github = 'https://github.com/' + repositoryName;
const api = 'https://api.github.com/repos/' + repositoryName;
const repo = {repository_full_name:repositoryName};
const http = (key, path) => ({key, tool:'fetch', args:{url:api + path}});
const issue = number => ({key:'i'+number,tool:'fetch_issue',args:{...repo,issue_number:number}});
export const syncPlan = {
  version:1, repository:repositoryName,
  instructions:'Use the authenticated GitHub connection. Execute phase 1, then phase 2 replacing {head} with pr.head_sha and {main} with commits[0].sha from parsed REST JSON. Collect structuredContent for every key. POST {startedAt, sources} to this same URL with X-Release-Sync: 1, application/json and owner-private Site service access. Keep credentials in memory. The server validates a complete set and normalizes it. Then POST /api/check and read back /api/state. Failed reads must not replace the previous complete snapshot.',
  phase1:[
    http('open','/issues?state=open&per_page=100'),http('pulls','/pulls?state=open&per_page=100'),
    http('commits','/commits?sha=main&per_page=12'),http('runs','/actions/runs?per_page=12'),
    {key:'pr',tool:'get_pr_info',args:{...repo,pr_number:182}},
    {key:'reviews',tool:'list_pull_request_reviews',args:{repo_full_name:repositoryName,pr_number:182}},
    {key:'merged',tool:'search_prs',args:{...repo,query:'is:merged',topn:100,sort:'updated'}},
    ...[166,167,168,169,170,171,181].map(issue)
  ],
  phase2:[
    http('tree','/git/trees/{main}?recursive=1'),
    http('cloud','/commits/{main}/check-runs'),
    {key:'ci',tool:'fetch_commit_workflow_runs',args:{repo_full_name:repositoryName,commit_sha:'{head}'}},
    {key:'contract',tool:'fetch_file',args:{...repo,ref:'{head}',path:'scripts/check-production-core-routes.mjs'}}
  ]
};
