declare module 'pdf-poppler' {
  interface ConvertOptions {
    format: 'jpeg' | 'png' | 'pdf';
    out_dir: string;
    out_prefix: string;
    page?: number | null;
    file_path: string;
  }

  interface ConvertResult {
    path: string;
    name: string;
    page: number;
  }

  export function convert(options: ConvertOptions): Promise<ConvertResult[]>;
}