export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const

  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
    // Restore prototype chain (needed when targeting ES5 or using transpilers)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends Error {
  readonly code = 'INVALID_UUID' as const

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
