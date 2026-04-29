declare module 'xlsx-populate' {
  interface Cell {
    value(v?: unknown): this;
    formula(f: string): this;
    style(name: string, value: unknown): this;
  }

  interface Row {
    cell(index: number): Cell;
  }

  interface Column {
    width(w: number): this;
    hidden(h: boolean): this;
  }

  interface Sheet {
    name(): string;
    cell(address: string): Cell;
    row(index: number): Row;
    column(col: string): Column;
  }

  interface Workbook {
    sheet(name: string): Sheet;
    sheets(): Sheet[];
    deleteSheet(name: string): void;
    outputAsync(): Promise<Buffer>;
  }

  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<Workbook>;
  };

  export = XlsxPopulate;
}
