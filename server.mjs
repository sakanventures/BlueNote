import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number.parseInt(process.env.PORT || "4173", 10);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer((request, response) => {
  const fail = (status, message) => {
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
  };

  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname);
  } catch {
    fail(400, "Bad request");
    return;
  }

  try {
    const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = join(root, safePath);

    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      filePath = join(root, "index.html");
    } else if (statSync(filePath).isDirectory()) {
      const directoryIndex = join(filePath, "index.html");
      if (!existsSync(directoryIndex) || !statSync(directoryIndex).isFile()) {
        fail(404, "Not found");
        return;
      }
      filePath = directoryIndex;
    }

    const stream = createReadStream(filePath);
    stream.on("open", () => {
      response.writeHead(200, {
        "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      stream.pipe(response);
    });
    stream.on("error", () => {
      if (!response.headersSent) fail(500, "Unable to read file");
      else response.destroy();
    });
  } catch {
    fail(500, "Unable to serve request");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Blue Note is ready at http://127.0.0.1:${port}`);
});
