import { handle } from 'hono-alibaba-cloud-fc3-adapter'
import * as index from './index'


export const handler = handle(index.app)