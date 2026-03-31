import type { AppSettings } from '../types'

export interface OpResult {
  ok: boolean
  error?: string
}

export interface QueryResult extends OpResult {
  data?: Record<string, unknown>[]
}

export interface UploadResult extends OpResult {
  url?: string
  storageId?: string
}

export interface ConnectionResult extends OpResult {
  // Provider-specific fields (backward compat with sidepanel)
  projectId?: string
  firestoreDbId?: string
  resolvedBucket?: string
  deploymentUrl?: string
  deploymentName?: string
  httpActionsUrl?: string
  projectRef?: string
  serviceRoleKey?: string
  anonKey?: string
}

export interface StorageProvider {
  init(settings: AppSettings): Promise<void>
  validateConnection(credential: string): Promise<ConnectionResult>

  // Database CRUD
  insert(collection: string, docId: string, data: Record<string, unknown>): Promise<OpResult>
  query(collection: string, orderBy: string, direction: string): Promise<QueryResult>
  queryByField(collection: string, field: string, value: string): Promise<QueryResult>
  delete(collection: string, docId: string): Promise<OpResult>

  // Storage
  upload(
    remotePath: string,
    data: Blob,
    contentType: string,
    onProgress?: (fraction: number) => void,
  ): Promise<UploadResult>
  deleteFile(remotePath: string): Promise<OpResult>

  // Provider identity
  getShareUrlPrefix(settings: AppSettings): string
  getFileSizeLimit(settings: AppSettings): number
  resolveStorageUrl(settings: AppSettings, shortCode: string, uploadResult: UploadResult): string
  deletesFilesOnVideoRemove: boolean
}
