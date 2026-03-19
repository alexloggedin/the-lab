// ---------- List, Create, Verify, Delete Shares ---------------
const { ocsListShares, ocsCreateShare, ocsDeleteShare } = await import('/src/api/sharesApi.ts');

// List existing shares (may be empty on a fresh instance)
const existing = await listShares();
console.log('existing shares:', existing);
// Expected: array (may be empty [])

// Create a test share — replace the path with a real file in your vault
const created = await createShare({ path: '/theVault/best-pack/cave.wav' });
console.log('created share:', created);
// Expected: { id: '...', path: '...', url: 'http://localhost:8080/s/...', token: '...', isFolder: false, hideDownload: false }

// Verify it appears in the list
const after = await listShares();
console.log('shares after create:', after.length); // should be previous count + 1

// Clean up — delete the share we just made
await deleteShare(created.id);
const afterDelete = await listShares();
console.log('shares after delete:', afterDelete.length); // should be back to original count



//--- Verify Test Token------------------------------------------

//-- Create Token
const { ocsCreateShare } = await import('/src/api/sharesApi.ts');
const share = await ocsCreateShare({ path: '/theVault/best-pack/cave.wav' });
console.log('test token:', share.token);

//-- Analyze Share
const token = 'GYm5GxPdfmtbQo3';
const { getShareInfo, listShareContents, publicStreamUrl } = await import('/src/api/publicShareApi.ts');
 
//-- Test endpoint
const info = await getShareInfo(token);
console.log('share info:', info);
// Expected: { token, fileName: '...', mimetype: 'audio/...', isFolder: false, hideDownload: false }

// Test stream URL construction (no network request — just URL building)
const streamUrl = publicStreamUrl(token);
console.log('stream URL:', streamUrl);
// Expected: /public.php/dav/files/TOKEN/

// Test that the stream URL actually responds
const streamRes = await fetch(streamUrl, {
  credentials: 'omit',
  headers: { 'Authorization': 'Basic ' + btoa(token + ':') },
});
console.log('stream response status:', streamRes.status);
// Expected: 200


//-----