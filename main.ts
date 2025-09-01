import { parseArgs } from "jsr:@std/cli/parse-args";
import { PDFDocument, PDFPage } from "https://cdn.skypack.dev/pdf-lib?dts";

const withSuffix = (path: string, suffix: string): string => {
  const parts = path.split(".");
  const extension = parts.pop() || "pdf";
  return parts.join(".") + suffix + "." + extension;
};

interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const toPageBox = (
  x: number,
  y: number,
  width: number,
  height: number,
): PageBox => {
  return { x: x, y: y, width: width, height: height };
};

const applyMargin = (box: PageBox, margin: string): PageBox | null => {
  const nums = margin.split(",").map((v) => Number(v.trim()));
  if (nums.some((n) => Number.isNaN(n))) {
    return null;
  }
  if (nums.some((n) => n < 0)) {
    return null;
  }
  if (nums.length === 1) {
    return toPageBox(
      box.x + (nums[0] / 100 * box.width),
      box.y + (nums[0] / 100 * box.height),
      box.width - (nums[0] * 2 / 100 * box.width),
      box.height - (nums[0] * 2 / 100 * box.height),
    );
  }
  if (nums.length === 2) {
    return toPageBox(
      box.x + (nums[1] / 100 * box.width),
      box.y + (nums[0] / 100 * box.height),
      box.width - (nums[1] * 2 / 100 * box.width),
      box.height - (nums[0] * 2 / 100 * box.height),
    );
  }
  if (nums.length === 4) {
    return toPageBox(
      box.x + (nums[3] / 100 * box.width),
      box.y + (nums[2] / 100 * box.height),
      box.width - (nums[1] * 2 / 100 * box.width),
      box.height - (nums[0] * 2 / 100 * box.height),
    );
  }
  return null;
};

const trimMargin = async (
  path: string,
  margin: string,
): Promise<number> => {
  const data = await Deno.readFile(path);
  const srcDoc = await PDFDocument.load(data);
  const outDoc = await PDFDocument.create();
  const range = srcDoc.getPageIndices();
  const pages = await outDoc.copyPages(srcDoc, range);

  pages.forEach((page: PDFPage) => {
    const mbox = page.getMediaBox();
    const newbox = applyMargin(mbox, margin);
    if (!newbox) {
      console.log("Invalid margin!");
      return;
    }
    page.setMediaBox(
      newbox.x,
      newbox.y,
      newbox.width,
      newbox.height,
    );
    outDoc.addPage(page);
  });
  const bytes = await outDoc.save();
  const outPath = withSuffix(path, "_cropmargin");
  await Deno.writeFile(outPath, bytes);
  return 0;
};

const main = async () => {
  const flags = parseArgs(Deno.args, {
    string: ["path", "margin"],
    default: {
      path: "",
      margin: "",
    },
  });
  const result = await trimMargin(flags.path, flags.margin);
  Deno.exit(result);
};

main();
