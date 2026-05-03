// Service layer — business logic for folder operations
import type { Folder, FolderChild } from '../../shared/types.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'
import { FolderRepository } from './repository.js'

export abstract class FolderService {
  /**
   * Returns all root folders (folders with no parent).
   * Delegates directly to the Repository layer.
   */
  static async getRootFolders(): Promise<Folder[]> {
    return FolderRepository.findRoots()
  }

  /**
   * Creates a new folder with the given name and optional parent.
   *
   * - Trims `name`; throws `ValidationError` if the result is empty.
   * - When `parentId` is non-null, verifies the parent exists; throws
   *   `NotFoundError` if it does not.
   * - Delegates insertion (including closure table maintenance) to the
   *   Repository layer and returns the created `Folder`.
   */
  static async createFolder(name: string, parentId: string | null): Promise<Folder> {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      throw new ValidationError('Folder name must not be empty or whitespace-only')
    }
    if (parentId !== null) {
      const exists = await FolderRepository.exists(parentId)
      if (!exists) {
        throw new NotFoundError(`Folder with id '${parentId}' does not exist`)
      }
    }
    return FolderRepository.insertFolder(trimmed, parentId)
  }

  /**
   * Returns the direct children of the folder identified by `id`.
   *
   * Throws `NotFoundError` if no folder with the given `id` exists,
   * which the Controller layer maps to an HTTP 404 response.
   */
  static async getChildren(id: string): Promise<FolderChild[]> {
    const folderExists = await FolderRepository.exists(id)
    if (!folderExists) {
      throw new NotFoundError(`Folder with id '${id}' does not exist`)
    }
    return FolderRepository.findChildren(id)
  }
}
