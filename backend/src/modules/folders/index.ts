// Controller — HTTP routing for /folders endpoints
import { Elysia } from 'elysia'
import { FolderService } from './service.js'
import { FolderSchema, FolderChildSchema, UUIDParamSchema } from './model.js'

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
