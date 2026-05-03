// Controller — HTTP routing for /folders endpoints
import { Elysia } from 'elysia'
import { FolderService } from './service.js'
import { FolderSchema, FolderChildSchema, UUIDParamSchema, CreateFolderBodySchema } from './model.js'

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
