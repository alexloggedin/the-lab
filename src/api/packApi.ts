import { createInternalDavClient, createPublicDavClient } from './davClient';
import { ocsCreateShare, ocsDeleteShare } from './sharesApi';
import type { VaultFile } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PackEntry {
  token: string;
  filename: string;
  mimetype: string;
  path: string;
}

export interface PackManifest {
  id: string;
  name: string;
  created: number;
  files: PackEntry[];
}

export interface Pack {
  manifest: PackManifest;
  shareToken: string;   // the token for the manifest file itself
  shareUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// The folder inside theVault where manifest JSON files live.
// Double underscores are a convention for "internal/system" folders —
// they'll be hidden from the main file list since getAllFiles() only
// processes folders that look like project folders.
export const PACKS_FOLDER = 'theVault/__packs__';

const client = createInternalDavClient();
const user = () => (window as any)?.OC?.currentUser ?? 'admin';

// ─── ensurePacksFolder ────────────────────────────────────────────────────────
//
// Called before any write operation. Creates theVault/__packs__/ if it doesn't
// exist. We use stat() first because MKCOL on an existing folder returns 405.
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html

async function ensurePacksFolder(): Promise<void> {
  const path = `/files/${user()}/${PACKS_FOLDER}`;
  try {
    await client.stat(path);
  } catch (err: any) {
    if (err?.status === 404) {
      await client.createDirectory(path);
    } else {
      throw err;
    }
  }
}

// ─── createPack ───────────────────────────────────────────────────────────────
//
// The main function. Steps:
// 1. For each file, create an individual public share → get its token
// 2. Assemble the manifest JSON with those tokens
// 3. Upload the manifest to theVault/__packs__/{id}.json via PUT
// 4. Create a public share for the manifest file → get its token
// 5. Return the Pack object (manifest + manifest share token)
//
// We use crypto.randomUUID() for the pack ID — this is the Web Crypto API,
// available in all modern browsers over HTTPS (which Nextcloud requires).
// Ref: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID

export async function createPack(name: string, files: VaultFile[]): Promise<Pack> {
  await ensurePacksFolder();

  // Step 1: Create individual shares for each file
  // ocsCreateShare expects a path relative to the user's root, with a leading slash
  const fileEntries: PackEntry[] = await Promise.all(
    files.map(async (file) => {
      const ocsPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      const share = await ocsCreateShare({ path: ocsPath, hideDownload: false });
      return {
        token: share.token,
        filename: file.name,
        mimetype: file.mimetype,
        path: file.path,
      };
    })
  );

  // Step 2: Assemble the manifest
  const id = crypto.randomUUID();
  const manifest: PackManifest = {
    id,
    name,
    created: Math.floor(Date.now() / 1000),
    files: fileEntries,
  };

  // Step 3: Upload the manifest JSON via WebDAV PUT
  // The webdav client's putFileContents() method sends a PUT request.
  // We serialize the manifest to a JSON string and upload it as text/plain
  // (Nextcloud stores it as-is; the content-type is for the PUT request).
  //
  // Ref: https://github.com/perry-mitchell/webdav-client#putfilecontents
  const manifestPath = `/files/${user()}/${PACKS_FOLDER}/${id}.json`;
  await client.putFileContents(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    { contentLength: false }
  );

  // Step 4: Share the manifest file
  const ocsManifestPath = `/${PACKS_FOLDER}/${id}.json`;
  const manifestShare = await ocsCreateShare({ path: ocsManifestPath, hideDownload: false });

  return {
    manifest,
    shareToken: manifestShare.token,
    shareUrl: `${window.location.origin}/apps/thevault/pack/${manifestShare.token}`,
  };
}

// ─── fetchManifestByToken ─────────────────────────────────────────────────────
//
// Given a manifest's share token, fetch and parse the JSON file.
// Uses the public DAV client — no auth needed, works on the share page.
//
// The public DAV path for a file share is: /files/{token}/
// For a single-file share, getFileContents() at that path returns the file's bytes.
//
// Ref: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html#public-shares

export async function fetchManifestByToken(token: string): Promise<PackManifest> {
  const publicClient = createPublicDavClient(token);

  // getFileContents() sends a GET request and returns the file body.
  // For a JSON file, we get back a string (when returnType is 'text').
  const content = await publicClient.getFileContents(
    `/files/${encodeURIComponent(token)}/`,
    { format: 'text' }
  );

  return JSON.parse(content as string) as PackManifest;
}

// ─── listPacks ────────────────────────────────────────────────────────────────
//
// Lists all pack manifests in theVault/__packs__/ and returns them with their
// share tokens. We need the share token to build the shareable URL, so we
// fetch the OCS share list and match by path.
//
// This is intentionally simple — for a small number of packs, reading all
// manifest files is fast enough. If the vault had hundreds of packs, we'd
// want a database. For now, the filesystem IS the database.

export async function listPacks(): Promise<Pack[]> {
  const folderPath = `/files/${user()}/${PACKS_FOLDER}`;

  // If the __packs__ folder doesn't exist yet, return an empty list
  try {
    await client.stat(folderPath);
  } catch {
    return [];
  }

  const results = await client.getDirectoryContents(folderPath);
  console.log(['[PackApi]: First Fetch:', results]);
  const stats = Array.isArray(results) ? results : results.data;

  // Fetch all OCS shares once, then match by path
  // We import ocsListShares here to avoid circular deps with api.ts
  const { ocsListShares } = await import('./sharesApi');
  const allShares = await ocsListShares();

  const packs: Pack[] = [];

  for (const stat of stats) {
    if (!stat.basename.endsWith('.json')) continue;

    try {
      const content = await client.getFileContents(
        `/files/${user()}/${PACKS_FOLDER}/${stat.basename}`,
        { format: 'text' }
      );
      console.log('[PackApi]: Content Fetch:', content); 
      const manifest = JSON.parse(content as string) as PackManifest;

      // Find the OCS share for this manifest file
      const ocsPath = `/${PACKS_FOLDER}/${stat.basename}`;
      const share = allShares.find(s => s.path === ocsPath);

      if (share) {
        packs.push({
          manifest,
          shareToken: share.token,
          shareUrl: `${window.location.origin}/apps/thevault/pack/${share.token}`,
        });
      }
    } catch (err) {
      console.warn('[packApi] could not parse manifest:', stat.basename, err);
    }
  }

  return packs;
}

// ─── deletePack ───────────────────────────────────────────────────────────────
//
// Deletes the manifest file and its OCS share. Does NOT delete the individual
// file shares — those are attached to the files themselves and may be shared
// elsewhere. The user can revoke individual shares from FileRow > share panel.

export async function deletePack(pack: Pack): Promise<void> {
  // Delete the OCS share for the manifest
  // (this also makes the share URL invalid)
  const { ocsListShares } = await import('./sharesApi');
  const allShares = await ocsListShares();
  const ocsPath = `/${PACKS_FOLDER}/${pack.manifest.id}.json`;
  const share = allShares.find(s => s.path === ocsPath);
  if (share) {
    await ocsDeleteShare(share.id);
  }

  // Delete the manifest file itself
  await client.deleteFile(`/files/${user()}/${PACKS_FOLDER}/${pack.manifest.id}.json`);
}