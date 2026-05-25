export interface VirtualItem {
  id: string;
  name: string;
  type: "file" | "directory";
  content?: string; // only for files
  parentId: string | null; // null if root
  size: number; // in bytes
  updatedAt: string;
  permissions?: string; // e.g. "0644" or "0755"
}

export type DNSRecordType = "A" | "CNAME" | "TXT" | "MX";

export interface DNSRecord {
  id: string;
  type: DNSRecordType;
  name: string; // e.g. "@", "www", "api"
  value: string; // e.g. IP address or host
  ttl: number;
}

export interface DomainItem {
  id: string;
  domainName: string;
  documentRoot: string; // e.g. "public_html" or "node_apps/sample"
  sslActive: boolean;
  sslType: "Let's Encrypt" | "Self-Signed" | "Commercial" | "None";
  sslExpiry?: string;
  dnsRecords: DNSRecord[];
}

export interface DatabaseUser {
  username: string;
  databases: string[]; // mapped databases
  privileges?: { [dbName: string]: string[] }; // mapped database privileges!
}

export interface DatabaseRow {
  [key: string]: any;
}

export interface DatabaseTable {
  name: string;
  columns: string[];
  rows: DatabaseRow[];
}

export interface DatabaseItem {
  id: string;
  name: string;
  sizeMB: number;
  tables: DatabaseTable[];
}

export interface NodeEnvVar {
  key: string;
  value: string;
}

export interface NodeApp {
  id: string;
  name: string;
  domainId: string; // mapped domain ID
  port: number;
  startupFile: string;
  status: "stopped" | "running" | "crashing";
  envVars: NodeEnvVar[];
  cpuUsage: number; // current CPU load shown in the panel
  memoryUsageMB: number; // current memory footprint shown in the panel
  logs: string[]; // terminal printed logs
  nodeVersion?: string; // Node.js engine version (e.g., "v22.2.0")
  clustering?: boolean; // PM2 cluster mode enabled
  instances?: number; // CPU scaling cores (e.g. 1, 2, 4, 8)
  maxMemoryMB?: number; // RAM ceiling (e.g., 512)
  nginxGzip?: boolean; // Nginx gzip proxy pass
  nginxProxyHeaders?: boolean; // advanced proxy headers mapping
  installedPackages?: string[]; // virtual npm installed modules list
}

export interface EmailMail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
}

export interface EmailAccount {
  id: string;
  address: string; // info@mydomain.com
  password?: string;
  hostName?: string;
  portalHost?: string;
  quotaMB: number; // e.g. 500 MB
  usageMB: number;
  mails: EmailMail[];
}

export interface ServerStats {
  cpu: number;
  cpuHistory: number[];
  ram: number; // MB
  ramMax: number; // MB
  ramHistory: number[];
  disk: number; // GB
  diskMax: number; // GB
  bandwidth: number; // GB
  bandwidthMax: number; // GB
}

export interface RecentActivity {
  id: string;
  time: string;
  category: "file" | "domain" | "node" | "db" | "email" | "ssl";
  message: string;
}
