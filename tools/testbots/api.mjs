/**
 * A thin client over the public API, one instance per bot.
 *
 * Talks to the game exactly as the browser does: the same routes, the same
 * cookie, the same JSON. Nothing here knows the database; if the harness can
 * do something the browser cannot, the harness is wrong.
 */
export class Client {
  constructor(origin, username) {
    this.origin = origin.replace(/\/$/, '');
    this.username = username;
    this.cookie = '';
    this.calls = 0;
  }

  async call(method, path, body) {
    this.calls += 1;
    const res = await fetch(this.origin + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.cookie ? {Cookie: this.cookie} : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    let json = null;
    const text = await res.text();
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = {raw: text.slice(0, 200)};
    }
    return {status: res.status, ok: res.ok, json};
  }

  get(path) {
    return this.call('GET', path);
  }
  post(path, body) {
    return this.call('POST', path, body ?? {});
  }

  async login(password) {
    return this.post('/api/auth/login', {username: this.username, password});
  }
}
