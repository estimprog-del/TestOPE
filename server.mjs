import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, resolve, sep } from "node:path";

const root = resolve(fileURLToPath(new globalThis.URL("./dist/", import.meta.url)));
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"]
]);
const port = Number(globalThis.process.env.PORT || 4173);

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new globalThis.URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = resolve(root, requestedPath);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const info = await stat(file);
    const resolvedFile = info.isDirectory() ? resolve(file, "index.html") : file;
    const body = await readFile(resolvedFile);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(extname(resolvedFile)) || "application/octet-stream",
      "Content-Length": body.length,
      "X-Content-Type-Options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
      response.writeHead(500);
      response.end("Internal server error");
      globalThis.console.error(error);
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  globalThis.console.log(`TestOPE Web is available at http://localhost:${port}`);
});
