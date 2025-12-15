import { eventHandler } from 'h3'
import { clearStudioUserSession } from '../../utils/session'

export default eventHandler(async (event) => {
  return await clearStudioUserSession(event)
})
