// ─── Auth ──────────────────────────────────────────────────────────────────

/**
 * The decrypted credentials stored in authStore.
 * These come from Nextcloud's Login Flow V2 and are encrypted at rest.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/LoginFlow/index.html
 */
export interface Credentials {
  serverUrl: string;    // e.g. "https://your.nextcloud.com" (trailing slash stripped)
  username: string;     // Nextcloud username
  appPassword: string;  // App-specific password issued by Login Flow V2
}

/**
 * All the values and functions that useAuth() returns.
 * Components import this to know what the hook's contract is.
 *
 * Using an interface here (rather than writing the type inline) means:
 * - The hook's return type is checked at the call site
 * - Any component that destructures from useAuth gets autocomplete
 */
export interface AuthState {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  credentials: Credentials | null;
  startLogin: (serverUrl: string) => Promise<void>;
  logout: () => void;
  loginState: 'idle' | 'polling' | 'error';
  loginError: string | null;
  loginUrl: string | null;
  rotationDue: boolean;
}

// ─── WebDAV Layer ─────────────────────────────────────────────────────────

/**
 * The raw shape produced by parseMultistatus() in webdav.ts.
 * This is an INTERNAL type — it represents what the WebDAV XML parser
 * hands back before entryToFile() normalizes it into a VaultFile.
 *
 * All fields are nullable because PROPFIND responses don't always
 * include every property (e.g. folders have no contentLength).
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/basic.html
 */
export interface DavEntry {
  href: string;                  // The full DAV path, e.g. "/remote.php/dav/files/user/theVault/song.wav"
  lastModified: string | null;   // HTTP date string, e.g. "Mon, 01 Jan 2024 00:00:00 GMT"
  contentLength: string | null;  // File size as a string (comes from XML text node)
  contentType: string | null;    // MIME type string, null for folders
  fileId: string | null;         // Nextcloud's internal oc:fileid, e.g. "42"
}

/**
 * A file or folder after being normalized by entryToFile().
 * This is the PRIMARY data shape used throughout the app.
 * Every component that displays files or folders works with VaultFile objects.
 */
export interface VaultFile {
  name: string;                  // Bare filename, e.g. "track_01_v3.wav"
  path: string;                  // User-relative path, e.g. "theVault/ep-demos/track_01.wav"
  size: number;                  // File size in bytes (0 for folders)
  modified: number;              // Unix timestamp in seconds (for use with `new Date(modified * 1000)`)
  mimetype: string;              // e.g. "audio/wav", "httpd/unix-directory" for folders
  type: 'file' | 'dir';         // Union type — only these two values are valid
}

// ─── File Metadata ────────────────────────────────────────────────────────

/**
 * Audio/music metadata attached to a file.
 * Currently populated from mockMetadata in dev mode.
 * Future: will come from Nextcloud's custom metadata API or ID3 tags.
 *
 * All fields are optional (?) because metadata may be partially filled in,
 * and a file may have some fields but not others.
 */
export interface FileMetadata {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  bpm?: string;       // Stored as string to match how Nextcloud returns it
  key?: string;       // Musical key, e.g. "Am", "C#"
  year?: string;
  comment?: string;
  duration?: number;  // Duration in seconds
  bitrate?: number;   // Bitrate in bits per second
  albumArt?: string | null;  // Data URL or null
}

/**
 * A map from file path → its metadata.
 * Used in ProjectList's state: `const [metadata, setMetadata] = useState<MetadataMap>({})`.
 * The `Record<string, FileMetadata>` syntax means: an object whose keys are strings
 * and whose values are FileMetadata objects.
 */
export type MetadataMap = Record<string, FileMetadata>;

// ─── File Versions ────────────────────────────────────────────────────────

/**
 * A single version entry from Nextcloud's versions WebDAV endpoint.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/WebDAV/versions.html
 */
export interface FileVersion {
  versionId: string;    // The timestamp used as the version ID in the URL
  href: string;         // Root-relative path to stream this version, already URL-encoded
  size: number;         // Size of this version in bytes
  modified: number;     // Unix timestamp of when this version was created
  contentType: string | null;
}

// ─── Shares ───────────────────────────────────────────────────────────────

/**
 * A share link as returned by Nextcloud's OCS Sharing API.
 * This is the shape used in ShareModal's list of existing shares.
 * Reference: https://docs.nextcloud.com/server/33/developer_manual/client_apis/OCS/ocs-share-api.html
 */
export interface ShareLink {
  id: string;           // Nextcloud's internal share ID
  path: string;         // The file/folder path this share points to
  token: string;        // The public token used in share URLs, e.g. "aB3xYz9"
  url: string;          // Full shareable URL, e.g. "https://cloud.example.com/s/aB3xYz9"
  expiry: string;       // ISO date string for expiry, e.g. "2026-04-15"
  hasPassword: boolean;
}

/**
 * Share link information to be sent to createShare endpoint.
 */
export interface ShareLinkForm {
  path: string;
  hideDownload: boolean;
  expiryDate: string;
  password: string;
  permissions: number;
}

/**
 * The share info object returned when resolving a public share token.
 * Used by ShareView when someone opens a public share link.
 * Contains nested audio/video metadata for display on the share page.
 */
export interface ShareInfo {
  token: string;
  fileName: string;
  mimetype: string | null;
  isFolder: boolean;
  hideDownload: boolean;
  meta?: {              // Optional audio metadata to display on the share page
    bpm?: string;
    key?: string;
    genre?: string;
  };
}

// ─── API Response Wrapper ─────────────────────────────────────────────────

/**
 * All api.ts functions return `{ data: T }` — a thin wrapper that
 * mirrors the Axios-style response shape this codebase was originally
 * designed around. Using a generic here means:
 *
 *   api.getFiles()         → Promise<ApiResponse<VaultFile[]>>
 *   api.getMetadata()      → Promise<ApiResponse<FileMetadata>>
 *   api.getShares()        → Promise<ApiResponse<ShareLink[]>>
 *
 * The generic T is filled in at each call site.
 */
export interface ApiResponse<T> {
  data: T;
}

// ─── Component Panel State ────────────────────────────────────────────────

/**
 * The possible panels that can be open in a FileRow.
 * Using a union type here means TypeScript will error if you try to
 * set activePanel to any string other than these four values.
 */
export type ActivePanel = 'player' | 'history' | 'share' | null;
