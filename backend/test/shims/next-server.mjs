// Minimal `next/server` stand-in for tests — implements just the slice the
// route handlers use: NextResponse.json() and response.cookies.set(). Backed by
// the web-standard Response so res.json()/res.status/res.headers behave normally.
export class NextResponse extends Response {
  static json(body, init = {}) {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    });
  }

  get cookies() {
    const headers = this.headers;
    return {
      set(name, value, opts = {}) {
        let c = `${name}=${value}`;
        if (opts.path) c += `; Path=${opts.path}`;
        if (opts.httpOnly) c += '; HttpOnly';
        if (opts.sameSite) c += `; SameSite=${opts.sameSite}`;
        if (opts.secure) c += '; Secure';
        if (opts.expires) c += `; Expires=${new Date(opts.expires).toUTCString()}`;
        headers.append('set-cookie', c);
      },
    };
  }
}
