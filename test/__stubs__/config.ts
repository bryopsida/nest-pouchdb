export const config = {
  url: 'http://localhost:5984',
  username: 'couchdb',
  userpass: 'password',
  requestDefaults: { jar: true },
}
export function getConfig(url: string): any {
  return {
    url,
    username: 'couchdb',
    userpass: 'password',
    requestDefaults: { jar: true },
  }
}
