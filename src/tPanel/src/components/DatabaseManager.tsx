import { useState, Dispatch, SetStateAction, FormEvent, useEffect } from "react";
import { 
  Database, 
  UserPlus, 
  Plus, 
  Trash2, 
  Table, 
  Play, 
  Check, 
  UserCheck, 
  Unlock, 
  Terminal,
  HelpCircle,
  FilePlus,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  Settings2,
  History,
  Download,
  Info,
  Layers,
  ChevronRight,
  Shield,
  Sliders,
  Copy,
  Edit2
} from "lucide-react";
import { DatabaseItem, DatabaseUser, DatabaseTable, DatabaseRow } from "../types";

interface DatabaseManagerProps {
  databases: DatabaseItem[];
  setDatabases: Dispatch<SetStateAction<DatabaseItem[]>>;
  dbUsers: DatabaseUser[];
  setDbUsers: Dispatch<SetStateAction<DatabaseUser[]>>;
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
  initialTab?: "overview" | "wizard" | "phpmyadmin";
}

// All available checkable tPanel Database Privileges list
const TPANEL_PRIVILEGES = [
  "ALTER",
  "ALTER ROUTINE",
  "CREATE",
  "CREATE ROUTINE",
  "CREATE TEMPORARY TABLES",
  "CREATE VIEW",
  "DELETE",
  "DROP",
  "EVENT",
  "EXECUTE",
  "INDEX",
  "INSERT",
  "LOCK TABLES",
  "REFERENCES",
  "SELECT",
  "SHOW VIEW",
  "TRIGGER",
  "UPDATE"
];

export default function DatabaseManager({ 
  databases, 
  setDatabases, 
  dbUsers, 
  setDbUsers, 
  addActivity,
  initialTab = "overview"
}: DatabaseManagerProps) {
  // Navigation level tab: overview | wizard | phpmyadmin
  const [activeTab, setActiveTab] = useState<"overview" | "wizard" | "phpmyadmin">("overview");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Overall lists & state variables
  const [selectedDbId, setSelectedDbId] = useState<string>(databases[0]?.id || "");
  const [selectedTableName, setSelectedTableName] = useState<string>("");

  // Manage Active DB and Selected Table bindings
  const activeDb = databases.find(db => db.id === selectedDbId) || databases[0];
  const activeTable = activeDb?.tables.find(t => t.name === selectedTableName) || activeDb?.tables[0];

  // Auto update table when database switches
  useEffect(() => {
    if (activeDb && activeDb.tables.length > 0) {
      setSelectedTableName(activeDb.tables[0].name);
    } else {
      setSelectedTableName("");
    }
  }, [selectedDbId]);

  // General MySQL input state
  const [newDbName, setNewDbName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [passShow, setPassShow] = useState(false);
  
  // Checking/Repairing operations state
  const [opModalType, setOpModalType] = useState<"check" | "repair" | null>(null);
  const [opLogs, setOpLogs] = useState<string[]>([]);
  const [opDbTarget, setOpDbTarget] = useState<string>("");

  // Mapping state: Add user to database modal/screen
  const [mapUser, setMapUser] = useState("");
  const [mapDb, setMapDb] = useState("");
  const [isMappingPrivilegesMode, setIsMappingPrivilegesMode] = useState(false);
  const [mappedPrivileges, setMappedPrivileges] = useState<string[]>(TPANEL_PRIVILEGES);

  // Edit Existing privileges mode state
  const [editPrivsUser, setEditPrivsUser] = useState<string>("");
  const [editPrivsDb, setEditPrivsDb] = useState<string>("");

  // DB Renaming / Management state
  const [dbToRename, setDbToRename] = useState<DatabaseItem | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [dbUserToRename, setDbUserToRename] = useState<string | null>(null);
  const [renameUserNewName, setRenameUserNewName] = useState("");

  // Row creation state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [rowFieldValues, setRowFieldValues] = useState<DatabaseRow>({});
  // Row inline edit state
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editingRowValues, setEditingRowValues] = useState<DatabaseRow>({});

  // SQL console editor state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 15");
  const [sqlFeedback, setSqlFeedback] = useState<string>("");
  const [sqlFeedbackType, setSqlFeedbackType] = useState<"success" | "error" | "">("");
  const [sqlOutputRows, setSqlOutputRows] = useState<DatabaseRow[] | null>(null);
  const [sqlOutputColumns, setSqlOutputColumns] = useState<string[]>([]);

  // Wizard Tab - Step state: 1 -> 2 -> 3 -> 4
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDbName, setWizardDbName] = useState("");
  const [wizardUsername, setWizardUsername] = useState("");
  const [wizardPassword, setWizardPassword] = useState("");
  const [wizardPassShow, setWizardPassShow] = useState(false);
  const [wizardPrivs, setWizardPrivs] = useState<string[]>(TPANEL_PRIVILEGES);
  
  // Sync mapping selects
  useEffect(() => {
    if (dbUsers.length > 0 && !mapUser) setMapUser(dbUsers[0].username);
    if (databases.length > 0 && !mapDb) setMapDb(databases[0].name);
  }, [dbUsers, databases]);

  // Helper: check password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "None", color: "bg-slate-800" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { score: 20, text: "Very Weak (Insecure)", color: "bg-rose-500" };
      case 2:
        return { score: 40, text: "Weak", color: "bg-orange-500" };
      case 3:
        return { score: 65, text: "Medium Strength", color: "bg-yellow-500" };
      case 4:
        return { score: 85, text: "Strong (Recommended)", color: "bg-emerald-500" };
      case 5:
        return { score: 100, text: "Extremely Secure", color: "bg-teal-400 shadow-teal-500/20" };
      default:
        return { score: 0, text: "None", color: "bg-slate-800" };
    }
  };

  // Helper: Generates a strong password
  const generateStrongPassword = (target: "direct" | "wizard") => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let pass = "";
    // Ensure we start with chars from multiple pools
    pass += "A" + Math.floor(Math.random() * 9) + "!" + "b";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Shuffle the pass
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    if (target === "direct") {
      setNewUserPass(pass);
      setPassShow(true);
    } else {
      setWizardPassword(pass);
      setWizardPassShow(true);
    }
  };

  // Create MySQL database item
  const handleCreateDb = (name: string, isWizard = false) => {
    const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!sanitizedName) return false;

    if (databases.some(db => db.name === sanitizedName)) {
      alert(`Database with schema name 'niloy_${sanitizedName}' already exists.`);
      return false;
    }

    const newDb: DatabaseItem = {
      id: "db-" + Math.random().toString(36).substr(2, 9),
      name: sanitizedName,
      sizeMB: 0.1,
      tables: [
        {
          name: "users",
          columns: ["id", "username", "email", "registration_ip", "status"],
          rows: [
            { id: 101, username: "imran_admin", email: "niloy@test.com", registration_ip: "162.24.99.11", status: "active" },
            { id: 102, username: "sarah_k", email: "sarah@gmail.com", registration_ip: "45.112.30.22", status: "pending" }
          ]
        },
        {
          name: "config_vars",
          columns: ["id", "setting_key", "setting_value"],
          rows: [
            { id: 1, setting_key: "app_theme", setting_value: "dark_mode_galaxy" },
            { id: 2, setting_key: "maintenance_active", setting_value: "false" },
            { id: 3, setting_key: "api_gateway_endpoint", setting_value: "https://api.my-portfolio.com/v1" }
          ]
        }
      ]
    };

    setDatabases(prev => [...prev, newDb]);
    addActivity("db", `Created MySQL database schema: niloy_${sanitizedName}`);
    setSelectedDbId(newDb.id);
    return true;
  };

  // Create database user item
  const handleCreateUser = (username: string, pass: string) => {
    const sanitizedUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!sanitizedUser) return false;

    if (dbUsers.some(user => user.username === sanitizedUser)) {
      alert(`MySQL user 'niloy_${sanitizedUser}' already exists.`);
      return false;
    }

    const newUser: DatabaseUser = {
      username: sanitizedUser,
      databases: [],
      privileges: {}
    };

    setDbUsers(prev => [...prev, newUser]);
    addActivity("db", `Created database user credential: niloy_${sanitizedUser}`);
    return true;
  };

  // Map user permissions with customized privileges
  const handleSaveUserMapping = (username: string, dbName: string, privsList: string[]) => {
    setDbUsers(prev => prev.map(user => {
      if (user.username === username) {
        const alreadyLinked = user.databases.includes(dbName);
        const nextLinkedDbs = alreadyLinked ? user.databases : [...user.databases, dbName];
        const nextPrivs = {
          ...(user.privileges || {}),
          [dbName]: privsList
        };
        return {
          ...user,
          databases: nextLinkedDbs,
          privileges: nextPrivs
        };
      }
      return user;
    }));

    addActivity("db", `Configured niloy_${username} mapped to niloy_${dbName} with ${privsList.length} privileges.`);
    return true;
  };

  // Delete User database link
  const handleUnmapUserDb = (username: string, dbName: string) => {
    if (!confirm(`Are you sure you want to revoke niloy_${username}'s access from database niloy_${dbName}?`)) return;
    setDbUsers(prev => prev.map(user => {
      if (user.username === username) {
        return {
          ...user,
          databases: user.databases.filter(d => d !== dbName),
          privileges: {
            ...(user.privileges || {}),
            [dbName]: []
          }
        };
      }
      return user;
    }));
    addActivity("db", `Revoked access of user niloy_${username} from niloy_${dbName}`);
  };

  // Rename database
  const executeRenameDb = (e: FormEvent) => {
    e.preventDefault();
    if (!dbToRename || !renameNewName.trim()) return;
    const sanitized = renameNewName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (databases.some(d => d.name === sanitized)) {
      alert("A database with that schema name already exists.");
      return;
    }

    setDatabases(prev => prev.map(db => {
      if (db.id === dbToRename.id) {
        return { ...db, name: sanitized };
      }
      return db;
    }));

    // Cascade update in users
    setDbUsers(prev => prev.map(user => {
      const nextDbs = user.databases.map(d => d === dbToRename.name ? sanitized : d);
      const nextPrivs: { [db: string]: string[] } = {};
      if (user.privileges) {
        Object.keys(user.privileges).forEach(k => {
          if (k === dbToRename.name) {
            nextPrivs[sanitized] = user.privileges![k];
          } else {
            nextPrivs[k] = user.privileges![k];
          }
        });
      }
      return {
        ...user,
        databases: nextDbs,
        privileges: nextPrivs
      };
    }));

    addActivity("db", `Renamed database niloy_${dbToRename.name} to niloy_${sanitized}`);
    setDbToRename(null);
    setRenameNewName("");
  };

  // Rename user
  const executeRenameUser = (e: FormEvent) => {
    e.preventDefault();
    if (!dbUserToRename || !renameUserNewName.trim()) return;
    const sanitized = renameUserNewName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (dbUsers.some(u => u.username === sanitized)) {
      alert("A user with that name already exists.");
      return;
    }

    setDbUsers(prev => prev.map(user => {
      if (user.username === dbUserToRename) {
        return { ...user, username: sanitized };
      }
      return user;
    }));

    addActivity("db", `Renamed DB user niloy_${dbUserToRename} to niloy_${sanitized}`);
    setDbUserToRename(null);
    setRenameUserNewName("");
  };

  // Delete Database
  const handleDeleteDb = (dbId: string, name: string) => {
    if (!confirm(`CRITICAL: Drop database 'niloy_${name}'? This action is IRREVERSIBLE and will wipe all ${databases.find(d => d.id === dbId)?.tables.length} structures.`)) return;
    setDatabases(prev => prev.filter(db => db.id !== dbId));
    
    // Cascade removal in linked users list
    setDbUsers(prev => prev.map(user => ({
      ...user,
      databases: user.databases.filter(d => d !== name),
      privileges: user.privileges ? (() => {
        const next = { ...user.privileges };
        delete next[name];
        return next;
      })() : undefined
    })));

    addActivity("db", `Dropped database: niloy_${name}`);
    if (selectedDbId === dbId) {
      setSelectedDbId(databases[0]?.id || "");
    }
  };

  // Delete User account
  const handleDeleteUser = (username: string) => {
    if (!confirm(`Terminate database user account 'niloy_${username}'?`)) return;
    setDbUsers(prev => prev.filter(user => user.username !== username));
    addActivity("db", `Terminated DB user account niloy_${username}`);
  };

  // Check / Repair DB Simulator logger
  const runDbCheckOrRepair = (type: "check" | "repair", dbName: string) => {
    setOpModalType(type);
    setOpDbTarget(dbName);
    setOpLogs([`Reading database file nodes: \`mysql://niloy_${dbName}\`...`]);
    
    setTimeout(() => {
      setOpLogs(prev => [...prev, "Querying schema validation matrices..."]);
      setTimeout(() => {
        const db = databases.find(d => d.name === dbName);
        if (!db) {
          setOpLogs(prev => [...prev, "ERROR: Target database has empty cluster headers."]);
          return;
        }

        const details = db.tables.map(t => {
          return `Table \`niloy_${dbName}\`.\`${t.name}\`: status is OK. (${t.rows.length} rows verified)`;
        });

        if (type === "check") {
          setOpLogs(prev => [
            ...prev,
            ...details,
            `Successfully ran: SHOW TABLES & CHECK TABLE inside sandbox.`,
            `Overall Status: 100% HEALTHY`
          ]);
        } else {
          setOpLogs(prev => [
            ...prev,
            ...details.map(d => d.replace("status is OK", "index nodes rebuilt securely")),
            `Successfully optimized indexes & repaired auto_increments.`,
            `Status: OPTIMIZATION FINISHED`
          ]);
        }
      }, 800);
    }, 600);
  };

  // Handle direct mapping submitting (Opens Privilege selection list)
  const triggerMappingPrivilegesScreen = (e: FormEvent) => {
    e.preventDefault();
    if (!mapUser || !mapDb) return;
    setIsMappingPrivilegesMode(true);
    setMappedPrivileges(TPANEL_PRIVILEGES);
  };

  // Exec direct wizard flow Step action
  const handleWizardSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (wizardStep === 1) {
      if (!wizardDbName.trim()) return;
      const ok = handleCreateDb(wizardDbName, true);
      if (ok) setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!wizardUsername.trim() || !wizardPassword.trim()) return;
      const ok = handleCreateUser(wizardUsername, wizardPassword);
      if (ok) setWizardStep(3);
    } else if (wizardStep === 3) {
      const dbSfx = wizardDbName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const usSfx = wizardUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      handleSaveUserMapping(usSfx, dbSfx, wizardPrivs);
      setWizardStep(4);
    }
  };

  // Interactive phpMyAdmin Row Adding
  const openAddRowModal = () => {
    if (!activeTable) return;
    const initialVals: DatabaseRow = {};
    activeTable.columns.forEach(col => {
      initialVals[col] = col === "id" ? Math.floor(Math.random() * 1000 + 300) : "";
    });
    setRowFieldValues(initialVals);
    setIsAddingRow(true);
  };

  const handleCommitRow = (e: FormEvent) => {
    e.preventDefault();
    if (!activeDb || !activeTable) return;

    const nextTables = activeDb.tables.map(table => {
      if (table.name === activeTable.name) {
        return {
          ...table,
          rows: [...table.rows, rowFieldValues]
        };
      }
      return table;
    });

    setDatabases(prev => prev.map(db => {
      if (db.id === activeDb.id) {
        return { ...db, tables: nextTables, sizeMB: db.sizeMB + 0.05 };
      }
      return db;
    }));

    addActivity("db", `phpMyAdmin: INSERT INTO ${activeTable.name} completed.`);
    setIsAddingRow(false);
  };

  // phpMyAdmin Row Editing
  const startInlineEditRow = (idx: number, originalVals: DatabaseRow) => {
    setEditingRowIdx(idx);
    setEditingRowValues({ ...originalVals });
  };

  const saveInlineEditRow = (idx: number) => {
    if (!activeDb || !activeTable) return;
    const nextTables = activeDb.tables.map(table => {
      if (table.name === activeTable.name) {
        const nextRows = [...table.rows];
        nextRows[idx] = editingRowValues;
        return {
          ...table,
          rows: nextRows
        };
      }
      return table;
    });

    setDatabases(prev => prev.map(db => {
      if (db.id === activeDb.id) {
        return { ...db, tables: nextTables };
      }
      return db;
    }));

    addActivity("db", `phpMyAdmin: Updated row indices in ${activeTable.name}`);
    setEditingRowIdx(null);
  };

  // phpMyAdmin Row Deletion
  const deleteTableRecord = (idx: number) => {
    if (!activeDb || !activeTable) return;
    if (!confirm(`Are you sure you want to delete this row entry?`)) return;

    const nextTables = activeDb.tables.map(table => {
      if (table.name === activeTable.name) {
        return {
          ...table,
          rows: table.rows.filter((_, r) => r !== idx)
        };
      }
      return table;
    });

    setDatabases(prev => prev.map(db => {
      if (db.id === activeDb.id) {
        return { ...db, tables: nextTables };
      }
      return db;
    }));

    addActivity("db", `phpMyAdmin: Dropped row index [${idx}] from ${activeTable.name}`);
  };

  // SQL console interpreter with deep capability matching
  const handleExecuteConsoleSQL = (e: FormEvent) => {
    e.preventDefault();
    if (!sqlQuery.trim() || !activeDb) return;
    
    const query = sqlQuery.trim().replace(/\s+/g, " ");
    const selectMatch = query.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+LIMIT\s+(\d+))?/i);
    const insertMatch = query.match(/^INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)/i);
    const deleteMatch = query.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?/i);
    const dropMatch = query.match(/^DROP\s+TABLE\s+(\w+)/i);

    if (selectMatch) {
      const columnsSpec = selectMatch[1].trim();
      const tableName = selectMatch[2].trim().toLowerCase();
      const whereSpec = selectMatch[3];
      const limitSpec = selectMatch[4];

      const table = activeDb.tables.find(t => t.name.toLowerCase() === tableName);
      if (!table) {
        setSqlFeedback(`ERROR 1146 (42S02): Table 'niloy_${activeDb.name}.${tableName}' doesn't exist`);
        setSqlFeedbackType("error");
        setSqlOutputRows(null);
        return;
      }

      let items = [...table.rows];
      
      // Simple where processing (e.g. status = 'active' or id = 101)
      if (whereSpec) {
        const whereParts = whereSpec.split("=");
        if (whereParts.length === 2) {
          const colKey = whereParts[0].trim();
          const targetRaw = whereParts[1].trim().replace(/['"]/g, "");
          items = items.filter(row => String(row[colKey] || "").toLowerCase() === targetRaw.toLowerCase());
        }
      }

      if (limitSpec) {
        items = items.slice(0, parseInt(limitSpec));
      }

      setSqlFeedback(`SUCCESS: Query returned ${items.length} records. (Took 0.0003 sec)`);
      setSqlFeedbackType("success");
      
      const columnsToDisplay = columnsSpec === "*" ? table.columns : columnsSpec.split(",").map(c => c.trim());
      setSqlOutputColumns(columnsToDisplay);
      setSqlOutputRows(items);
      setSelectedTableName(table.name);
    } else if (insertMatch) {
      const tableName = insertMatch[1].trim().toLowerCase();
      const colsVec = insertMatch[2].split(",").map(c => c.trim());
      const valsVec = insertMatch[3].split(",").map(v => v.trim().replace(/['"]/g, ""));

      const table = activeDb.tables.find(t => t.name.toLowerCase() === tableName);
      if (!table) {
        setSqlFeedback(`ERROR 1146 (42S02): Table 'niloy_${activeDb.name}.${tableName}' doesn't exist`);
        setSqlFeedbackType("error");
        setSqlOutputRows(null);
        return;
      }

      if (colsVec.length !== valsVec.length) {
        setSqlFeedback(`ERROR: Column count doesn't match value count at row 1`);
        setSqlFeedbackType("error");
        setSqlOutputRows(null);
        return;
      }

      const rowMap: DatabaseRow = {};
      table.columns.forEach(col => {
        const insertIdx = colsVec.findIndex(c => c.toLowerCase() === col.toLowerCase());
        if (insertIdx !== -1) {
          rowMap[col] = isNaN(Number(valsVec[insertIdx])) ? valsVec[insertIdx] : Number(valsVec[insertIdx]);
        } else {
          rowMap[col] = col === "id" ? Math.floor(Math.random() * 1000 + 400) : "";
        }
      });

      // Write table record
      setDatabases(prev => prev.map(db => {
        if (db.id === activeDb.id) {
          return {
            ...db,
            tables: db.tables.map(t => t.name.toLowerCase() === tableName ? { ...t, rows: [...t.rows, rowMap] } : t)
          };
        }
        return db;
      }));

      setSqlFeedback(`Query OK, 1 row affected (Took 0.0012 sec)`);
      setSqlFeedbackType("success");
      setSqlOutputRows(null);
      addActivity("db", `SQL Console: Inserted 1 row into ${tableName}`);
    } else if (deleteMatch) {
      const tableName = deleteMatch[1].trim().toLowerCase();
      const whereSpec = deleteMatch[2];

      const table = activeDb.tables.find(t => t.name.toLowerCase() === tableName);
      if (!table) {
        setSqlFeedback(`ERROR: Table 'niloy_${activeDb.name}.${tableName}' does not exist.`);
        setSqlFeedbackType("error");
        return;
      }

      let beforeCount = table.rows.length;
      let nextRows = [];
      if (whereSpec) {
        const parts = whereSpec.split("=");
        if (parts.length === 2) {
          const colKey = parts[0].trim();
          const targetRaw = parts[1].trim().replace(/['"]/g, "");
          nextRows = table.rows.filter(row => String(row[colKey] || "").toLowerCase() !== targetRaw.toLowerCase());
        } else {
          nextRows = [...table.rows];
        }
      }

      setDatabases(prev => prev.map(db => {
        if (db.id === activeDb.id) {
          return {
            ...db,
            tables: db.tables.map(t => t.name.toLowerCase() === tableName ? { ...t, rows: nextRows } : t)
          };
        }
        return db;
      }));

      const deleted = beforeCount - nextRows.length;
      setSqlFeedback(`Query OK, ${deleted} rows affected (Took 0.0010 sec)`);
      setSqlFeedbackType("success");
      setSqlOutputRows(null);
      addActivity("db", `SQL Console: Deleted ${deleted} rows from table ${tableName}`);
    } else if (dropMatch) {
      const tableName = dropMatch[1].trim().toLowerCase();
      const exists = activeDb.tables.some(t => t.name.toLowerCase() === tableName);
      if (!exists) {
        setSqlFeedback(`ERROR: Table '${tableName}' does not exist`);
        setSqlFeedbackType("error");
        return;
      }

      setDatabases(prev => prev.map(db => {
        if (db.id === activeDb.id) {
          return {
            ...db,
            tables: db.tables.filter(t => t.name.toLowerCase() !== tableName)
          };
        }
        return db;
      }));

      setSqlFeedback(`Query OK, 0 rows affected (Took 0.0210 sec). Table dropped.`);
      setSqlFeedbackType("success");
      setSqlOutputRows(null);
      setSelectedTableName("");
      addActivity("db", `SQL Console: Dropped table niloy_${activeDb.name}.${tableName}`);
    } else {
      setSqlFeedback(`ERROR: Unsupported SQL operation. Try standard queries: 'SELECT * FROM users', 'INSERT INTO config_vars (setting_key, setting_value) VALUES ("port", "3000")', or 'DELETE FROM config_vars WHERE id=1'`);
      setSqlFeedbackType("error");
      setSqlOutputRows(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Tab headers container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <Database className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
            MySQL Relational Databases Engine
          </h2>
          <p className="text-slate-400 text-xs mt-1">Configure full-stack schemas, configure users, assign privileges, and audit with customized phpMyAdmin panel.</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl max-w-full">
          {[
            { id: "overview", label: "MySQL Databases", icon: Settings2 },
            { id: "wizard", label: "Database Wizard", icon: Sliders },
            { id: "phpmyadmin", label: "phpMyAdmin Portal", icon: Table }
          ].map(tab => {
            const ActiveIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-emerald-505 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                }`}
              >
                <ActiveIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TABS INNER REALIZATION */}
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Panel: Creator modules */}
          <div className="space-y-6">
            
            {/* Create Database Schema card */}
            <div className="bg-slate-900 border border-slate-700/80 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-205 tracking-widest uppercase font-mono">Create New Database</h3>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateDb(newDbName); setNewDbName(""); }} className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Database Name</label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl overflow-hidden transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-500 font-medium">niloy_</span>
                    <input 
                      type="text"
                      required
                      placeholder="db_schema"
                      value={newDbName}
                      onChange={(e) => setNewDbName(e.target.value)}
                      className="flex-1 bg-transparent px-3 py-2 text-slate-200 text-xs focus:outline-none font-sans"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Create Database
                </button>
              </form>
            </div>

            {/* Create Database User card */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-205 tracking-widest uppercase font-mono">Add New User</h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(newUsername, newUserPass); setNewUsername(""); setNewUserPass(""); }} className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Username</label>
                  <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl overflow-hidden transition">
                    <span className="bg-slate-900 px-3 py-2 text-slate-500 font-medium font-mono">niloy_</span>
                    <input 
                      type="text"
                      required
                      placeholder="db_user"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="flex-1 bg-transparent px-3 py-2 text-slate-205 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase font-sans">Password</label>
                    <button 
                      type="button" 
                      onClick={() => generateStrongPassword("direct")} 
                      className="text-[9px] text-emerald-400 font-bold hover:underline font-sans cursor-pointer flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Generate Password
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type={passShow ? "text" : "password"}
                      required
                      placeholder="Enter safe password"
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 px-3 py-2 rounded-xl text-slate-250 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setPassShow(p => !p)}
                      className="absolute right-3 top-2 text-slate-500 hover:text-slate-350 cursor-pointer"
                    >
                      {passShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength dynamic monitor */}
                  {newUserPass && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[9px] font-sans">
                        <span className="text-slate-500">Strength Rating:</span>
                        <span className="text-slate-350 font-bold">{getPasswordStrength(newUserPass).text}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getPasswordStrength(newUserPass).color}`}
                          style={{ width: `${getPasswordStrength(newUserPass).score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 text-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  Create MySQL User
                </button>
              </form>
            </div>

            {/* Link User account mapping privileges */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-205 tracking-widest uppercase font-mono">Link User To Database</h3>
              </div>

              {dbUsers.length > 0 && databases.length > 0 ? (
                <form onSubmit={triggerMappingPrivilegesScreen} className="space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase block font-sans">User account</label>
                      <select
                        value={mapUser}
                        onChange={(e) => setMapUser(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 text-slate-300 font-mono text-xs focus:outline-none"
                      >
                        {dbUsers.map(user => (
                          <option key={user.username} value={user.username}>niloy_{user.username}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase block font-sans">Database</label>
                      <select
                        value={mapDb}
                        onChange={(e) => setMapDb(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 text-slate-300 font-mono text-xs focus:outline-none"
                      >
                        {databases.map(db => (
                          <option key={db.name} value={db.name}>niloy_{db.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 text-xs"
                  >
                    <Unlock className="w-4 h-4 text-emerald-350" />
                    Configure Privileges
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl text-center text-[11px] text-slate-500">
                  Please create at least one database and one user account before mapping roles.
                </div>
              )}
            </div>

            {/* Quick check/repair center */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-205 tracking-widest uppercase font-mono">Modify Databases</h3>
              </div>

              {databases.length > 0 ? (
                <div className="space-y-3.5">
                  <div className="space-y-1 focus-within:border-emerald-505">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block">Target Schema</label>
                    <select
                      id="opt-target-modify"
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 text-slate-300 font-mono text-xs focus:outline-none"
                    >
                      {databases.map(db => (
                        <option key={db.name} value={db.name}>niloy_{db.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        const val = (document.getElementById("opt-target-modify") as HTMLSelectElement)?.value || databases[0]?.name;
                        runDbCheckOrRepair("check", val);
                      }}
                      className="py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Check Schema
                    </button>
                    <button
                      onClick={() => {
                        const val = (document.getElementById("opt-target-modify") as HTMLSelectElement)?.value || databases[0]?.name;
                        runDbCheckOrRepair("repair", val);
                      }}
                      className="py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      Repair Schema
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center py-4 bg-slate-950 rounded-xl border border-slate-850">
                  No active schemas for telemetry checks.
                </p>
              )}
            </div>

          </div>

          {/* Right Panel: Lists of active schemas and users (Grid-span 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Databases management table */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Current MySQL Databases</h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  {databases.length} Registered
                </span>
              </div>

              {databases.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3.5">Database Schema Name</th>
                        <th className="p-3.5 text-center">Size Footprint</th>
                        <th className="p-3.5">Privileged Linked Users</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {databases.map((db, idx) => {
                        // Find users that have this database linked
                        const assignedUsers = dbUsers.filter(u => u.databases.includes(db.name));
                        return (
                          <tr key={db.id || idx} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-3.5 font-bold text-slate-100">
                              niloy_{db.name}
                            </td>
                            <td className="p-3.5 text-center text-emerald-400 font-semibold">
                              {(db.sizeMB).toFixed(2)} MB
                            </td>
                            <td className="p-3.5 font-sans">
                              {assignedUsers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 py-1">
                                  {assignedUsers.map(user => (
                                    <div 
                                      key={user.username}
                                      className="group relative flex items-center bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-lg text-[10.5px] cursor-pointer hover:border-emerald-500/40 transition"
                                      onClick={() => {
                                        setEditPrivsUser(user.username);
                                        setEditPrivsDb(db.name);
                                        setMappedPrivileges(user.privileges?.[db.name] || TPANEL_PRIVILEGES);
                                      }}
                                    >
                                      <span className="font-mono text-[10px]">niloy_{user.username}</span>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleUnmapUserDb(user.username, db.name); }}
                                        className="ml-1 text-slate-500 group-hover:text-rose-400 transition"
                                        title="Revoke access"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">No assigned admins</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => { setDbToRename(db); setRenameNewName(db.name); }}
                                  className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => handleDeleteDb(db.id, db.name)}
                                  className="p-1 px-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-500/5 hover:border-rose-500/10 border border-slate-800 rounded-lg transition"
                                  title="Drop database"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs">
                  No active MySQL databases created. Start by typing a name to the left or use the step-by-step Wizard!
                </div>
              )}
            </div>

            {/* 2. SQL user credentials management list */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Current Database Users</h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  {dbUsers.length} Logins
                </span>
              </div>

              {dbUsers.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3.5">MySQL Username Access</th>
                        <th className="p-3.5">Mapped Directories &amp; Roles</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {dbUsers.map((user, uidx) => (
                        <tr key={uidx} className="hover:bg-slate-900/30 transition-all">
                          <td className="p-3.5 font-bold text-slate-100 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-400/80" />
                            niloy_{user.username}
                          </td>
                          <td className="p-3.5 font-sans">
                            {user.databases.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {user.databases.map(db => (
                                  <span key={db} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded text-[10px] font-mono">
                                    niloy_{db}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-650 italic font-mono">- Unassociated account -</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => { setDbUserToRename(user.username); setRenameUserNewName(user.username); }}
                                className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.username)}
                                className="p-1 px-1.5 text-slate-400 hover:text-rose-455 bg-slate-900 hover:bg-rose-500/5 hover:border-rose-505 border border-slate-800 rounded-lg transition"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs">
                  No database login credentials defined yet.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 2. WIZARD TAB */}
      {activeTab === "wizard" && (
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
          
          {/* Progress Header widget */}
          <div className="bg-slate-900 border-b border-slate-800 p-5-5 px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-mono text-emerald-450 tracking-widest uppercase font-bold">Guided Setup</span>
              <h3 className="text-md font-extrabold text-slate-200">tPanel MySQL Database Wizard v3.5</h3>
            </div>
            
            {/* Steps indicator nodes */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(idx => {
                const isPassed = wizardStep > idx;
                const isCurrent = wizardStep === idx;
                return (
                  <div key={idx} className="flex items-center gap-2 font-mono">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10.5px] border transition ${
                      isPassed 
                        ? "bg-emerald-600 border-emerald-500 text-white" 
                        : isCurrent 
                          ? "bg-slate-950 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]" 
                          : "bg-slate-950 border-slate-800 text-slate-500"
                    }`}>
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : idx}
                    </div>
                    {idx < 4 && <div className={`h-[1px] w-6 md:w-10 ${wizardStep > idx ? "bg-emerald-700" : "bg-slate-800"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleWizardSubmit} className="space-y-5">
              
              {/* STEP 1: CREATE DATABASE SCHEMA */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-xl border border-dashed border-emerald-500/10 bg-emerald-500/5 p-4 flex gap-4 text-xs text-slate-350 leading-relaxed">
                    <Info className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-[#f1f5f9] mb-1">Step 1: Define Database Name</p>
                      <p>The database holds all relational structures (tables, indices). tPanel automatically prefixes all instances with your primary account ID (<strong className="text-emerald-400">niloy_</strong>).</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-[10px] text-slate-450 uppercase block font-sans font-bold">Database Name (suffix)</label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl overflow-hidden">
                      <span className="bg-slate-900 px-4 py-2.5 font-bold text-slate-550 border-r border-slate-850">niloy_</span>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. client_shop"
                        value={wizardDbName}
                        onChange={(e) => setWizardDbName(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-2.5 focus:outline-none text-slate-200 font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CREATE USER ACCOUNT */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-xl border border-dashed border-emerald-505 bg-emerald-500/5 p-4 flex gap-4 text-xs text-slate-350 leading-relaxed">
                    <Info className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-[#f1f5f9] mb-1">Step 2: Create a Database User login</p>
                      <p>This user will be assigned database levels privilege configurations. Ensure to utilize a strong password key or use our password generator.</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-450 uppercase block font-sans font-bold">Username</label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl overflow-hidden">
                        <span className="bg-slate-900 px-4 py-2.5 font-bold text-slate-550 border-r border-slate-850">niloy_</span>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. guest_user"
                          value={wizardUsername}
                          onChange={(e) => setWizardUsername(e.target.value)}
                          className="flex-1 bg-transparent px-4 py-2.5 focus:outline-none text-slate-100 font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-slate-450 uppercase block font-sans font-bold">Password Credentials</label>
                        <button 
                          type="button" 
                          onClick={() => generateStrongPassword("wizard")}
                          className="text-[9px] text-emerald-400 font-bold hover:underline font-sans cursor-pointer flex items-center gap-0.5"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> Password Generator
                        </button>
                      </div>

                      <div className="relative">
                        <input 
                          type={wizardPassShow ? "text" : "password"}
                          required
                          placeholder="Ensure security parameters are met"
                          value={wizardPassword}
                          onChange={(e) => setWizardPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 px-3.5 py-2.5 rounded-xl text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setWizardPassShow(p => !p)}
                          className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-350 cursor-pointer"
                        >
                          {wizardPassShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Power Score monitor */}
                      {wizardPassword && (
                        <div className="space-y-1 pd-1">
                          <div className="flex justify-between items-center text-[9px] font-sans">
                            <span className="text-slate-500">Security Score:</span>
                            <span className="text-slate-350 font-bold">{getPasswordStrength(wizardPassword).text}</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getPasswordStrength(wizardPassword).color}`}
                              style={{ width: `${getPasswordStrength(wizardPassword).score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 text-slate-400 hover:bg-slate-900 rounded-xl transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CONFIGURE PRIVILEGES CHECKBOX GRID (The Complete tPanel permissions list requested!) */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-fade-in text-xs font-mono">
                  
                  <div className="rounded-xl border border-dashed border-emerald-505 bg-emerald-500/5 p-4 flex gap-4 text-xs text-slate-350 justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-bold text-[#f1f5f9]">Step 3: Define Privileges Mapping</p>
                        <p className="text-[11px] text-slate-400">Add user <strong className="text-emerald-400">niloy_{wizardUsername}</strong> permissions on <strong className="text-emerald-400">niloy_{wizardDbName}</strong> database schema.</p>
                      </div>
                    </div>
                  </div>

                  {/* ALL PRIVILEGES Toggle button */}
                  <div className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3 rounded-xl">
                    <span className="text-[10.5px] font-sans font-extrabold text-slate-300 uppercase tracking-widest">Database Roles Selection</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (wizardPrivs.length === TPANEL_PRIVILEGES.length) {
                          setWizardPrivs([]);
                        } else {
                          setWizardPrivs([...TPANEL_PRIVILEGES]);
                        }
                      }}
                      className="px-3 py-1 bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-3D0 hover:bg-slate-850 text-[10.5px] font-bold rounded-lg transition uppercase tracking-wider cursor-pointer font-sans"
                    >
                      {wizardPrivs.length === TPANEL_PRIVILEGES.length ? "Deselect All" : "Select All Privileges"}
                    </button>
                  </div>

                  {/* Complete Privilege Checkbox Grid Map */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-slate-950 border border-slate-850/80 rounded-2xl p-4">
                    {TPANEL_PRIVILEGES.map(priv => {
                      const isChecked = wizardPrivs.includes(priv);
                      return (
                        <label 
                          key={priv} 
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked 
                              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-350 font-bold" 
                              : "bg-slate-900/50 border-slate-850/60 text-slate-450 hover:bg-slate-900/80"
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setWizardPrivs(prev => prev.filter(p => p !== priv));
                              } else {
                                setWizardPrivs(prev => [...prev, priv]);
                              }
                            }}
                            className="w-3.5 h-3.5 border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 rounded cursor-pointer"
                          />
                          <span className="text-[10px] uppercase font-mono tracking-wide">{priv}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 text-slate-400 hover:bg-slate-900 rounded-xl transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      Next Step (Build mapping)
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 4: COMPLETE THE TASK */}
              {wizardStep === 4 && (
                <div className="space-y-5 animate-fade-in font-sans">
                  
                  <div className="flex flex-col items-center text-center space-y-3 py-6">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/10">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-slate-100">MySQL Database Configuration Completed!</h4>
                      <p className="text-slate-400 text-xs">tPanel Daemon successfully mapped authentication matrices.</p>
                    </div>
                  </div>

                  {/* Summary list with checkmarks */}
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4.5 space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-2.5 text-slate-205">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Database schema <strong className="text-emerald-400 font-bold">niloy_{wizardDbName}</strong> created.</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-205">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Database login user <strong className="text-emerald-400 font-bold">niloy_{wizardUsername}</strong> verified.</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-205">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Assigned <strong className="text-emerald-400 font-bold">{wizardPrivs.length} PRIVILEGES</strong> on database node.</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-4 flex flex-col sm:flex-row gap-2 justify-center text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setWizardStep(1);
                        setWizardDbName("");
                        setWizardUsername("");
                        setWizardPassword("");
                        setWizardPrivs(TPANEL_PRIVILEGES);
                      }}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold border border-slate-800 rounded-xl transition cursor-pointer"
                    >
                      Create another Database
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("overview");
                        setWizardStep(1);
                        setWizardDbName("");
                        setWizardUsername("");
                        setWizardPassword("");
                        setWizardPrivs(TPANEL_PRIVILEGES);
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer"
                    >
                      Return to Overview dashboard
                    </button>
                  </div>

                </div>
              )}

            </form>
          </div>

        </div>
      )}

      {/* 3. PHPMYADMIN PORTAL TAB (The detailed gray-blue retrospective sidebar requested!) */}
      {activeTab === "phpmyadmin" && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-neutral-100 flex flex-col md:flex-row min-h-[580px] animate-fade-in font-sans">
          
          {/* phpMyAdmin Gray-Blue Retro Sidebar */}
          <div className="w-full md:w-64 bg-slate-200 border-r border-slate-300 text-slate-800 flex flex-col shrink-0 font-sans select-none">
            
            <div className="bg-slate-300 px-3.5 py-3 border-b border-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {/* Vintage phpMyAdmin mini graphic branding */}
                <div className="bg-[#ff9900] text-slate-100 font-serif font-extrabold text-[12px] px-1 py-0.5 rounded leading-none border border-[#cc6600]">
                  pMA
                </div>
                <span className="font-mono font-bold text-slate-200 text-[11px] tracking-tight uppercase">phpMyAdmin 5.2</span>
              </div>
              <button 
                onClick={() => setSqlQuery(`SELECT * FROM ${selectedTableName || "users"} LIMIT 15`)}
                title="Refresh schemas" 
                className="p-1 hover:bg-slate-400/80 rounded border border-transparent hover:border-slate-400 text-slate-700 font-mono text-[10px]"
              >
                ♻
              </button>
            </div>

            {/* Tree listing database nodes & tables */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider tracking-widest uppercase block border-b border-slate-300 pb-1">Databases Tree</span>
                {databases.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {databases.map(db => {
                      const isSelectedDb = selectedDbId === db.id;
                      return (
                        <div key={db.id} className="space-y-1">
                          
                          {/* Database dropdown trigger */}
                          <div 
                            onClick={() => setSelectedDbId(db.id)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition ${
                              isSelectedDb 
                                ? "bg-slate-400/20 font-bold text-slate-950" 
                                : "hover:bg-slate-300/60 font-medium text-slate-700"
                            }`}
                          >
                            <span className="text-[10px] text-slate-550">{isSelectedDb ? "▼" : "▶"}</span>
                            <Database className="w-3.5 h-3.5 text-sky-750 shrink-0 text-slate-600" />
                            <span className="truncate" title={`niloy_${db.name}`}>niloy_{db.name}</span>
                          </div>

                          {/* Table items of this specific database */}
                          {isSelectedDb && (
                            <div className="pl-4 border-l border-slate-350 ml-2 space-y-1 mt-0.5 animate-slide-down">
                              {db.tables.map(tbl => {
                                const isSelectedTable = selectedTableName === tbl.name;
                                return (
                                  <div
                                    key={tbl.name}
                                    onClick={() => setSelectedTableName(tbl.name)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono cursor-pointer transition select-text ${
                                      isSelectedTable 
                                        ? "bg-slate-405 bg-slate-350 font-bold text-[#1e293b] border-l-2 border-slate-600 pl-1.5" 
                                        : "hover:bg-slate-300/40 text-slate-600 hover:text-slate-800"
                                    }`}
                                  >
                                    <Table className="w-3 h-3 text-slate-450 shrink-0" />
                                    <span className="truncate">{tbl.name}</span>
                                    <span className="text-[9px] text-slate-450 ml-auto font-sans">({tbl.rows.length})</span>
                                  </div>
                                );
                              })}
                              
                              {db.tables.length === 0 && (
                                <span className="text-[9.5px] text-slate-400 italic pl-2">No tables found</span>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 italic font-mono">No databases constructed yet.</span>
                )}
              </div>
            </div>

            <div className="p-2 border-t border-slate-300 bg-slate-300/50 text-[9.5px] font-mono text-slate-500">
              Host: 127.0.0.1:3306
            </div>
          </div>

          {/* phpMyAdmin main operation workspace panel */}
          <div className="flex-1 p-5 space-y-5 text-slate-800 overflow-x-hidden min-w-0">
            
            {activeDb ? (
              <div className="space-y-4">
                
                {/* Database summary overview header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-205 bg-slate-200 border border-slate-300 px-4 py-3 rounded-lg gap-2 select-text">
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-mono text-slate-500 font-bold">SQL SCHEMA DETAILS</span>
                    <h4 className="text-sm font-extrabold text-slate-100 font-mono">
                      Database: <span className="text-sky-800">niloy_{activeDb.name}</span>
                    </h4>
                  </div>
                  
                  {activeTable && (
                    <div className="text-[10.5px] font-mono bg-slate-300 px-2.5 py-1 rounded text-slate-700">
                      Active Table: <code className="font-bold text-[#1e293b]">{activeTable.name}</code> ({activeTable.rows.length} records)
                    </div>
                  )}
                </div>

                {/* SQL Console terminal component */}
                <div className="bg-[#24292e] border border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xl">
                  <div className="flex justify-between items-center text-slate-300 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold uppercase tracking-wider text-[11px]">Run SQL Queries on niloy_{activeDb.name}</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">MariaDB 10.6 sandbox</span>
                  </div>

                  <form onSubmit={handleExecuteConsoleSQL} className="space-y-2">
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="e.g. SELECT * FROM users WHERE status='active' LIMIT 5"
                      rows={2}
                      className="w-full bg-black border border-slate-800 rounded-lg p-3 text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-0 select-text"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Syntax: standard parser supports matching columns, UPDATE / DELETE / DROP commands.</span>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        Go
                      </button>
                    </div>
                  </form>

                  {/* SQL feedback display logs */}
                  {sqlFeedback && (
                    <div className={`p-3 rounded-lg border text-xs font-mono mb-2 ${
                      sqlFeedbackType === "error" 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                        : "bg-emerald-500/5 border-emerald-500/10 text-emerald-350"
                    }`}>
                      {sqlFeedback}
                    </div>
                  )}
                </div>

                {/* phpMyAdmin structured tabs for actively selected table */}
                {activeTable ? (
                  <div className="space-y-4">
                    
                    {/* Browse & Structure selector sub-headers */}
                    <div className="bg-slate-200 border border-slate-300 rounded-lg overflow-hidden flex divide-x divide-slate-300">
                      {[
                        { id: "browse", label: "Browse", icon: Eye },
                        { id: "structure", label: "Structure", icon: Sliders },
                        { id: "insert", label: "Insert", icon: Plus },
                        { id: "export", label: "Export", icon: Download }
                      ].map(tab => {
                        // We will simulate tabs inside the phpMyAdmin viewport
                        const isSubActive = !isAddingRow && (
                          (tab.id === "browse" && editingRowIdx === null) ||
                          (tab.id === "insert" && isAddingRow)
                        ); // we will just let user do standard interactions instead
                        return (
                          <div 
                            key={tab.id} 
                            onClick={() => {
                              if (tab.id === "insert") {
                                openAddRowModal();
                              } else if (tab.id === "export") {
                                // Dynamic export logs download
                                alert(`JSON Database Dump:\n\n` + JSON.stringify(activeTable.rows, null, 2));
                              } else {
                                setIsAddingRow(false);
                                setEditingRowIdx(null);
                                setSqlQuery(`SELECT * FROM ${activeTable.name}`);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-slate-100 hover:bg-slate-300/40 cursor-pointer select-none transition"
                          >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Spreadsheets browse output view */}
                    <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto select-text">
                        <table className="w-full text-left font-mono text-[11px] border-collapse">
                          <thead className="bg-[#f1f5f9] border-b border-slate-300 text-slate-500">
                            <tr>
                              <th className="p-3 text-center width-[40px]">Edit</th>
                              {activeTable.columns.map(col => (
                                <th key={col} className="p-3 font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-250/60">
                                  {col}
                                </th>
                              ))}
                              <th className="p-3 text-center">Drop</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800">
                            {/* Dynamic SELECT results preview else full active table display */}
                            {(sqlOutputRows || activeTable.rows).map((row, idx) => {
                              const isEditingThisRow = editingRowIdx === idx;
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  
                                  {/* Table edit inline cells */}
                                  <td className="p-2.5 text-center border-r border-slate-200">
                                    {isEditingThisRow ? (
                                      <button
                                        onClick={() => saveInlineEditRow(idx)}
                                        className="text-emerald-600 hover:text-emerald-500 font-extrabold uppercase text-[10px]"
                                      >
                                        Save
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => startInlineEditRow(idx, row)}
                                        className="text-sky-600 hover:text-sky-500 text-[10px] pl-1.5 flex items-center justify-center gap-0.5"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                        Edit
                                      </button>
                                    )}
                                  </td>

                                  {activeTable.columns.map(col => {
                                    // Row data cells
                                    const val = row[col];
                                    return (
                                      <td key={col} className="p-2.5 max-w-[200px] truncate border-r border-slate-150 text-[11px]">
                                        {isEditingThisRow ? (
                                          <input
                                            type={typeof val === "number" ? "number" : "text"}
                                            value={editingRowValues[col] || ""}
                                            onChange={(e) => setEditingRowValues(prev => ({
                                              ...prev,
                                              [col]: typeof val === "number" ? Number(e.target.value) : e.target.value
                                            }))}
                                            className="w-full bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono"
                                          />
                                        ) : (
                                          val === undefined || val === null ? <code className="text-rose-500 font-bold">NULL</code> : String(val)
                                        )}
                                      </td>
                                    );
                                  })}

                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => deleteTableRecord(idx)}
                                      className="text-rose-600 hover:text-rose-500 p-0.5 whitespace-nowrap text-[10px]"
                                    >
                                      Drop
                                    </button>
                                  </td>

                                </tr>
                              );
                            })}

                            {(sqlOutputRows || activeTable.rows).length === 0 && (
                              <tr>
                                <td colSpan={activeTable.columns.length + 2} className="p-6 text-center text-slate-500 italic">
                                  Empty table result set. Use SQL console query to INSERT data or select other columns.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-slate-300 rounded-xl p-12 text-center text-slate-500 font-mono text-xs shadow-sm">
                    Database schemas is currently empty of tables. Click "Build database" in 'MySQL Databases' tab to initiate schemas.
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-350 rounded-xl text-slate-500 text-xs">
                Welcome to phpMyAdmin. Please select a database schema node inside the sidebar tree to configure table structures.
              </div>
            )}

          </div>

        </div>
      )}

      {/* MODALS SECTION */}

      {/* 1. MAPPING ROLE ACCESS PRIVILEGES MODAL (tPanel Style Detailed Checkboxes) */}
      {(isMappingPrivilegesMode || editPrivsUser) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-xl shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-emerald-450 font-mono uppercase tracking-widest font-bold">Manage Privileges</span>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="text-emerald-400 w-5 h-5 animate-pulse" />
                  Grant niloy_{editPrivsUser || mapUser} Access to niloy_{editPrivsDb || mapDb}
                </h4>
              </div>
              <button 
                onClick={() => { setIsMappingPrivilegesMode(false); setEditPrivsUser(""); }}
                className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Privileges checklist selectors */}
            <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl text-xs">
              <span className="font-sans font-extrabold text-slate-400 tracking-wider">MYSQL DATA PRIVILEGES</span>
              <button
                type="button"
                onClick={() => {
                  if (mappedPrivileges.length === TPANEL_PRIVILEGES.length) {
                    setMappedPrivileges([]);
                  } else {
                    setMappedPrivileges([...TPANEL_PRIVILEGES]);
                  }
                }}
                className="text-emerald-450 hover:text-emerald-3D0 font-bold hover:underline cursor-pointer"
              >
                {mappedPrivileges.length === TPANEL_PRIVILEGES.length ? "Clear All" : "Select ALL PRIVILEGES"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-4 rounded-xl max-h-[40vh] overflow-y-auto">
              {TPANEL_PRIVILEGES.map(priv => {
                const checked = mappedPrivileges.includes(priv);
                return (
                  <label 
                    key={priv} 
                    className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                      checked 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-350 font-bold" 
                        : "bg-slate-900 border-slate-850/60 text-slate-450 hover:bg-slate-850"
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setMappedPrivileges(prev => prev.filter(p => p !== priv));
                        } else {
                          setMappedPrivileges(prev => [...prev, priv]);
                        }
                      }}
                      className="w-3.5 h-3.5 bg-slate-900 border-slate-700 text-emerald-550 focus:ring-emerald-500 cursor-pointer rounded"
                    />
                    <span className="text-[10px] font-mono tracking-wide">{priv}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => { setIsMappingPrivilegesMode(false); setEditPrivsUser(""); }}
                className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const u = editPrivsUser || mapUser;
                  const d = editPrivsDb || mapDb;
                  handleSaveUserMapping(u, d, mappedPrivileges);
                  setIsMappingPrivilegesMode(false);
                  setEditPrivsUser("");
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Save Privileges Configuration
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. TELEMETRY CHECK OR REPAIR STATUS LOGS MODAL */}
      {opModalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 w-full max-w-lg shadow-2xl space-y-4 font-mono text-xs">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-emerald-450 font-bold tracking-widest uppercase">
                {opModalType === "check" ? "Schema diagnostics scanner" : "Schema optimization daemon"}
              </span>
              <button 
                onClick={() => setOpModalType(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-sans cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Streaming logs trace console */}
            <div className="bg-black border border-slate-850 p-4 rounded-xl min-h-[140px] text-[11px] leading-relaxed select-text space-y-1.5 text-emerald-400">
              {opLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-slate-600 select-none">[{idx + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setOpModalType(null)}
                className="px-5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-505 hover:to-teal-555 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Output
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. DATABASE SCHEMA RENAME MODAL */}
      {dbToRename && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={executeRenameDb} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-xs font-mono">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-sans border-b border-slate-800 pb-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Rename Database: niloy_{dbToRename.name}
            </h4>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Enter Schema New Suffix</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl overflow-hidden">
                <span className="bg-slate-900 px-3 py-2 text-slate-500">niloy_</span>
                <input 
                  type="text"
                  required
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-slate-205 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button type="button" onClick={() => setDbToRename(null)} className="px-3.5 py-1.5 font-sans hover:bg-slate-805 text-slate-400 rounded-xl transition">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition">
                Apply Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. DATABASE USER NAME RENAME MODAL */}
      {dbUserToRename && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={executeRenameUser} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 text-xs font-mono">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-sans border-b border-slate-800 pb-2">
              <UserPlus className="w-5 h-5 text-emerald-405" />
              Rename DB User: niloy_{dbUserToRename}
            </h4>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-sans font-bold block">Enter Username New Suffix</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-xl overflow-hidden">
                <span className="bg-slate-900 px-3 py-2 text-slate-500">niloy_</span>
                <input 
                  type="text"
                  required
                  value={renameUserNewName}
                  onChange={(e) => setRenameUserNewName(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-slate-205 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button type="button" onClick={() => setDbUserToRename(null)} className="px-3.5 py-1.5 font-sans hover:bg-slate-800 text-slate-400 rounded-xl transition">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition">
                Apply Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. INSERT ROW MODAL (Used in phpMyAdmin Browse/Insert triggers) */}
      {isAddingRow && activeTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono text-xs">
          <form 
            onSubmit={handleCommitRow}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-sans">
                <FilePlus className="w-5 h-5 text-emerald-400 animate-pulse" />
                INSERT INTO niloy_{activeDb.name}.{activeTable.name}
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddingRow(false)}
                className="text-slate-450 hover:text-slate-250 font-sans text-base cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {activeTable.columns.map(col => {
                const isAuto = col === "id" || col.endsWith("_id");
                return (
                  <div key={col} className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {col} {isAuto ? "(AUTO_INCREMENT INT)" : "(VARCHAR)"}
                    </label>
                    <input 
                      type={isAuto ? "number" : "text"} 
                      required
                      placeholder={`Enter ${col} cell data`}
                      value={rowFieldValues[col] === undefined ? "" : rowFieldValues[col]}
                      onChange={(e) => setRowFieldValues(prev => ({
                        ...prev,
                        [col]: isAuto ? Number(e.target.value) : e.target.value
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-300 font-mono text-xs"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button 
                type="button"
                onClick={() => setIsAddingRow(false)}
                className="px-3.5 py-1.5 hover:bg-slate-805 text-slate-400 rounded-xl transition font-sans"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition font-sans"
              >
                Commit Insert
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
