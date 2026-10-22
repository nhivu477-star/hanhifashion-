import ExcelJS from "exceljs";
import { PassThrough, Readable } from "node:stream";

/** Streaming .xlsx: string cells stay literal, never interpreted as formulas. */
export function excelExport(
  load: (
    offset: number,
  ) => Promise<{ rows: Record<string, unknown>[]; count: number }>,
) {
  const output = new PassThrough();
  let cancelled = false;
  output.on("close", () => {
    cancelled = true;
  });
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: output,
    useStyles: true,
    useSharedStrings: false,
  });
  const sheet = workbook.addWorksheet("Báo cáo", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  void (async () => {
    try {
      let offset = 0,
        keys: string[] = [];
      while (!cancelled) {
        const page = await load(offset);
        if (!keys.length && page.rows.length) {
          keys = Object.keys(page.rows[0]);
          sheet.columns = keys.map((key) => ({
            key,
            width: /name|product|sku/i.test(key) ? 32 : 20,
          }));
          const header = sheet.addRow(keys);
          header.font = { bold: true, color: { argb: "FFFFFFFF" } };
          header.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF172033" },
          };
          header.commit();
        }
        if (!page.rows.length) {
          if (!offset) sheet.addRow(["Không có dữ liệu"]).commit();
          break;
        }
        for (const source of page.rows) {
          const row = sheet.addRow(
            keys.map((key) => {
              const value = source[key];
              return typeof value === "number"
                ? value
                : typeof value === "bigint"
                  ? Number(value)
                  : value == null
                    ? ""
                    : String(value);
            }),
          );
          keys.forEach((key, index) => {
            const cell = row.getCell(index + 1);
            if (typeof cell.value === "number")
              cell.numFmt = /rate|percent/i.test(key) ? "0.00" : "#,##0";
            if (
              typeof cell.value === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(cell.value)
            ) {
              cell.value = new Date(cell.value + "T00:00:00Z");
              cell.numFmt = "dd/mm/yyyy";
            }
          });
          row.commit();
        }
        offset += page.rows.length;
        if (offset >= page.count) break;
      }
      if (!cancelled) {
        sheet.commit();
        await workbook.commit();
      }
    } catch (error) {
      output.destroy(
        error instanceof Error ? error : Error("Không thể xuất Excel"),
      );
    }
  })();
  return Readable.toWeb(output) as ReadableStream<Uint8Array>;
}
