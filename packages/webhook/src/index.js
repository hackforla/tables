import { Hono } from 'hono';

/**
 * @typedef {{[key in keyof CloudflareBindings]: CloudflareBindings[key]}} Bindings
 */

const app = /** @type {Hono<{ Bindings: Bindings }>} */ (new Hono());

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

export default app;
