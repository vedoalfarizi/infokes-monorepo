// Controller — HTTP routing for /folders endpoints
import { Elysia } from 'elysia'
import { FolderService } from './service.js'
import { FolderSchema, FolderChildSchema, UUIDParamSchema, CreateFolderBodySchema, RenameFolderBodySchema } from './model.js'

export const foldersModule = new Elysia({ prefix: '/folders' })
  /**
   * GET /folders
   * Returns all root folders wrapped in the ApiResponse envelope.
   */
  .get('/', async () => {
    const data = await FolderService.getRootFolders()
    return { data }
  })
  /**
   * GET /folders/:id/children
   * Validates :id as a UUID (400 on failure), returns direct children.
   * NotFoundError is mapped to 404 by the global onError handler.
   */
  .get(
    '/:id/children',
    async ({ params }) => {
      const data = await FolderService.getChildren(params.id)
      return { data }
    },
    {
      params: UUIDParamSchema,
    }
  )
  /**
   * POST /folders
   * Creates a new folder with an optional parent.
   * TypeBox validates the body (400 for empty name or invalid parentId UUID).
   * NotFoundError (404) and DuplicateNameError (409) are handled by the global onError handler.
   */
  .post(
    '/',
    async ({ body }) => {
      const data = await FolderService.createFolder(body.name, body.parentId ?? null)
      return new Response(JSON.stringify({ data }), { status: 201 })
    },
    { body: CreateFolderBodySchema }
  )
  /**
   * GET /folders/:id
   * Returns a single folder by ID wrapped in the ApiResponse envelope.
   * NotFoundError is mapped to 404 by the global onError handler.
   */
  .get(
    '/:id',
    async ({ params }) => {
      const data = await FolderService.getFolder(params.id)
      return { data }
    },
    { params: UUIDParamSchema }
  )
  /**
   * PATCH /folders/:id
   * Renames the folder identified by :id.
   * TypeBox validates :id as UUID and body.name as non-empty string.
   * NotFoundError (404), DuplicateNameError (409), ValidationError (400)
   * are handled by the global onError handler.
   */
  .patch(
    '/:id',
    async ({ params, body }) => {
      const data = await FolderService.renameFolder(params.id, body.name)
      return { data }
    },
    { params: UUIDParamSchema, body: RenameFolderBodySchema }
  )
  /**
   * DELETE /folders/:id
   * Deletes the folder and its entire subtree within a single transaction.
   * Returns HTTP 204 with no body on success.
   * NotFoundError is mapped to 404 by the global onError handler.
   */
  .delete(
    '/:id',
    async ({ params, set }) => {
      await FolderService.deleteFolder(params.id)
      set.status = 204
    },
    { params: UUIDParamSchema }
  )
