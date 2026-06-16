export function httpError(status: number, message: string): Error & { httpStatus: number } {
  const err = new Error(message) as Error & { httpStatus: number }
  err.httpStatus = status
  return err
}
