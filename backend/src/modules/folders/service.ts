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
   * Returns the folder identified by `id`.
   *
   * Throws `NotFoundError` if no folder with the given `id` exists,
   * which the Controller layer maps to an HTTP 404 response.
   */
  static async getFolder(id: string): Promise<Folder> {
    const folder = await FolderRepository.findById(id)
    if (!folder) {
      throw new NotFoundError(`Folder with id '${id}' does not exist`)
    }
    return folder
  }

  /**
   * Renames the folder identified by `id` to `name`.
   *
   * - Trims `name`; throws `ValidationError` if the result is empty.
   * - Throws `NotFoundError` if no folder with the given `id` exists.
   * - Delegates to `FolderRepository.updateName` which throws
   *   `DuplicateNameError` on a sibling name conflict (PG 23505).
   */
  static async renameFolder(id: string, name: string): Promise<Folder> {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      throw new ValidationError('Folder name must not be empty or whitespace-only')
    }
    const exists = await FolderRepository.exists(id)
    if (!exists) {
      throw new NotFoundError(`Folder with id '${id}' does not exist`)
    }
    return FolderRepository.updateName(id, trimmed)
  }

  /**
   * Deletes the folder identified by `id` and its entire subtree.
   *
   * Throws `NotFoundError` if no folder with the given `id` exists.
   * Delegates the actual deletion (including closure-table cleanup) to
   * `FolderRepository.deleteSubtree`, which runs in a single transaction.
   */
  static async deleteFolder(id: string): Promise<void> {
    const exists = await FolderRepository.exists(id)
    if (!exists) {
      throw new NotFoundError(`Folder with id '${id}' does not exist`)
    }
    await FolderRepository.deleteSubtree(id)
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
