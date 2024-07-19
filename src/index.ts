import {Hono} from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import {cors} from "hono/cors";
import {prettyJSON} from 'hono/pretty-json';

interface Env {
  MY_BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();
app.use("/*", serveStatic({root: "./public"}));
app.use("/*", cors());


app.post("/upload", async (c) => {
  try {
    if (!c.env.MY_IMAGES_BUCKET) {
      console.error("R2 bucket is not available");
      return c.json({success: false, error: "Storage is not configured properly"}, 500);
    }

    const body = await c.req.parseBody();
    const file = body.file;

    if (!(file instanceof File)) {
      return c.json({success: false, error: "No valid file uploaded"}, 400);
    }

    console.log("File received:", file.name, file.type, file.size);

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;


    await c.env.MY_IMAGES_BUCKET.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });
    const fileUrl = `${c.env.bucket_url}${fileName}`;
    return c.json({success: true, fileUrl});
  } catch (error) {
    console.error("Error in upload:", error);
    return c.json({success: false, error: error.message || "Internal server error"}, 500);
  }
});

export default app;