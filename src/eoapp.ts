import {handle} from 'hono-edgeone-pages-adapter'
import * as index from './index'

const onRequest: any = handle(index.app)