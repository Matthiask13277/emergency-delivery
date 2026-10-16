'use strict';

async function listGmailMessages({query, token, fetchImpl = fetch}) {
  const messages = [];
  let pageToken = null;
  do {
    const params = new URLSearchParams({maxResults: '100', q: query});
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetchImpl(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?' + params.toString(),
      {headers: {authorization: 'Bearer ' + token}}
    );
    if (!response.ok) throw new Error('Gmail message list failed: ' + response.status);
    const page = await response.json();
    messages.push(...(page.messages || []));
    pageToken = page.nextPageToken || null;
  } while (pageToken);
  return messages;
}

module.exports = {listGmailMessages};
