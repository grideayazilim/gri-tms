declare module 'xlsx-populate' {
  interface Cell {
    value(v?: unknown): this;
    formula(f: string): this;
    style(name: string, value: unknown): this;
  }

  interface Row {
    cell(index: number): Cell;
    hidden(value?: boolean): boolean | this;
  }

  interface Column {
    width(w: number): this;
    hidden(h: boolean): this;
  }

  interface Range {
    address(): string;
  }

  interface Sheet {
    name(): string;
    cell(address: string): Cell;
    row(index: number): Row;
    column(col: string): Column;
    range(address: string): Range;
  }

  interface Workbook {
    sheet(name: string): Sheet;
    sheets(): Sheet[];
    deleteSheet(name: string): void;
    outputAsync(): Promise<Buffer>;
    /** Sheet-scoped named range. Pass a Range to set, omit value to get. */
    scopedDefinedName(sheet: Sheet, name: string, range?: Range): Range | undefined;
  }

  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<Workbook>;
  };

  export = XlsxPopulate;
}
