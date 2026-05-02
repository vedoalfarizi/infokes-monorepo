// TypeBox schemas for request/response validation
import { t } from 'elysia'

export const FolderSchema = t.Object({
  id:        t.String({ format: 'uuid' }),
  name:      t.String(),
  createdAt: t.String({ format: 'date-time' }),
})

export const FolderChildSchema = t.Object({
  ...FolderSchema.properties,
  childCount: t.Number({ minimum: 0 }),
})

export const UUIDParamSchema = t.Object({
  id: t.String({ format: 'uuid' }),
})
