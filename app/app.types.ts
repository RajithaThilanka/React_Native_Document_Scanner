export interface FileData {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  data: Uint8Array | null;
}

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  primaryDark: string;
  accent: string;
  danger: string;
  dangerBg: string;
  statusBar: string;
  headerBg: string;
  headerText: string;
}