// Service layer — business logic for folder operations
import type { Folder, FolderChild } from '../../shared/types.js'
import { NotFoundError } from '../../shared/errors.js'
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
