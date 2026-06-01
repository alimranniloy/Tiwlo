import { useState, Dispatch, SetStateAction, FormEvent, DragEvent, ChangeEvent, useEffect } from "react";
import { 
  Folder, 
  File, 
  ArrowLeft, 
  Plus, 
  FolderPlus, 
  FilePlus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Save, 
  Upload, 
  X,
  Search,
  ChevronRight,
  Database,
  Cpu,
  Globe,
  Shield,
  Download,
  FileArchive,
  RefreshCw,
  Copy,
  // Premium Google Icons
  FolderOpen,
  FolderArchive,
  FolderUp,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  Lock,
  Layers,
  Inbox,
  Monitor,
  Tag
} from "lucide-react";
import { VirtualItem } from "../types";

interface FileManagerProps {
  files: VirtualItem[];
  setFiles: Dispatch<SetStateAction<VirtualItem[]>>;
  addActivity: (category: "file" | "domain" | "node" | "db" | "email" | "ssl", message: string) => void;
  openAiWithPrompt: (prompt: string) => void;
  setActiveTab: (tab: string) => void;
}

const fallbackFiles: VirtualItem[] = [
  { id: "root-dir", name: "/", type: "directory", parentId: null, size: 4096, updatedAt: "2026-05-24 00:00:00", permissions: "0755" },
  { id: "public-html-dir", name: "public_html", type: "directory", parentId: "root-dir", size: 4096, updatedAt: "2026-05-24 00:00:00", permissions: "0755" }
];

export default function FileManager({ files, setFiles, addActivity, openAiWithPrompt, setActiveTab }: FileManagerProps) {
  const safeFiles = Array.isArray(files) && files.length ? files : fallbackFiles;
  const [currentFolderId, setCurrentFolderId] = useState<string>(() => {
    try {
      return localStorage.getItem("tpanel_file_manager_folder") || "root-dir";
    } catch {
      return "root-dir";
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [activeOperation, setActiveOperation] = useState("");
  const [operationError, setOperationError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{ name: string; percent: number; loaded: number; total: number } | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<"copy" | "move">("copy");
  const [transferIds, setTransferIds] = useState<string[]>([]);
  const [transferTargetId, setTransferTargetId] = useState("root-dir");
  
  // Multiple Item Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Right-Click Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: VirtualItem;
  } | null>(null);

  // File Editor state
  const [editingFile, setEditingFile] = useState<VirtualItem | null>(null);
  const [editorContent, setEditorContent] = useState("");
  
  // Drag and drop upload state
  const [dragActive, setDragActive] = useState(false);

  // Advanced operations state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<VirtualItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [isChmodModalOpen, setIsChmodModalOpen] = useState(false);
  const [itemToChmod, setItemToChmod] = useState<VirtualItem | null>(null);

  // Permissions checkboxes
  const [permUserRead, setPermUserRead] = useState(true);
  const [permUserWrite, setPermUserWrite] = useState(true);
  const [permUserExec, setPermUserExec] = useState(true);

  const [permGroupRead, setPermGroupRead] = useState(true);
  const [permGroupWrite, setPermGroupWrite] = useState(false);
  const [permGroupExec, setPermGroupExec] = useState(true);

  const [permWorldRead, setPermWorldRead] = useState(true);
  const [permWorldWrite, setPermWorldWrite] = useState(false);
  const [permWorldExec, setPermWorldExec] = useState(true);

  const [clipBoardIds, setClipBoardIds] = useState<string[]>([]);
  const [clipBoardMode, setClipBoardMode] = useState<"copy" | "cut">("copy");

  // Dismiss context menu on left click anywhere
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Helper to find parent folder ID
  const getCurrentFolder = () => {
    return safeFiles.find(f => f.id === currentFolderId) || safeFiles.find(f => f.id === "root-dir") || fallbackFiles[0];
  };

  useEffect(() => {
    if (!safeFiles.some((item) => item.id === currentFolderId && item.type === "directory")) {
      setCurrentFolderId("root-dir");
    }
  }, [currentFolderId, safeFiles]);

  useEffect(() => {
    try {
      localStorage.setItem("tpanel_file_manager_folder", currentFolderId);
    } catch {
      // Ignore private-mode storage failures.
    }
  }, [currentFolderId]);

  const getBreadcrumbs = () => {
    const list: VirtualItem[] = [];
    let current = getCurrentFolder();
    while (current) {
      list.unshift(current);
      if (current.parentId) {
        const parent = safeFiles.find(f => f.id === current.parentId);
        if (parent) {
          current = parent;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return list;
  };

  // Get Children of Current Path
  const currentItems = safeFiles.filter(f => f.parentId === currentFolderId);

  // Filtered by Search Query
  const filteredItems = searchQuery.trim() === ""
    ? currentItems
    : safeFiles.filter(f => f.parentId === currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const authToken = () => {
    try {
      return JSON.parse(localStorage.getItem("tpanel_auth") || "null")?.token || "";
    } catch {
      return "";
    }
  };

  const itemPath = (itemId: string) => {
    const parts: string[] = [];
    let current = safeFiles.find((item) => item.id === itemId);
    while (current && current.parentId !== null) {
      parts.unshift(current.name);
      current = safeFiles.find((item) => item.id === current?.parentId);
    }
    return parts.join("/");
  };

  const currentFolderPath = () => itemPath(currentFolderId);

  const directoryOptions = safeFiles
    .filter((item) => item.type === "directory")
    .map((item) => ({
      id: item.id,
      label: item.id === "root-dir" ? "/ root" : `/${itemPath(item.id)}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const descendantIds = (ids: string[]) => {
    const all = new Set(ids);
    let changed = true;
    while (changed) {
      changed = false;
      safeFiles.forEach((item) => {
        if (item.parentId && all.has(item.parentId) && !all.has(item.id)) {
          all.add(item.id);
          changed = true;
        }
      });
    }
    return Array.from(all);
  };

  const topLevelIds = (ids: string[]) => ids.filter((id) => {
    let current = safeFiles.find((item) => item.id === id);
    while (current?.parentId) {
      if (ids.includes(current.parentId)) return false;
      current = safeFiles.find((item) => item.id === current?.parentId);
    }
    return id !== "root-dir";
  });

  const apiJson = async (path: string, payload: Record<string, unknown>) => {
    const token = authToken();
    if (!token) throw new Error("User session expired. Log in again.");
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "File operation failed.");
    if (Array.isArray(data.files)) setFiles(data.files);
    return data;
  };

  const runFileOperation = async (label: string, operation: () => Promise<any>, successMessage?: string) => {
    setOperationError("");
    setActiveOperation(label);
    try {
      const data = await operation();
      if (successMessage) addActivity("file", successMessage);
      setSelectedIds([]);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "File operation failed.";
      setOperationError(message);
      throw error;
    } finally {
      setActiveOperation("");
    }
  };

  const openTransferModal = (mode: "copy" | "move", ids: string[]) => {
    if (!ids.length) return;
    setTransferMode(mode);
    setTransferIds(topLevelIds(ids));
    setTransferTargetId(currentFolderId);
    setIsTransferModalOpen(true);
  };

  const confirmTransfer = async () => {
    const target = directoryOptions.find((item) => item.id === transferTargetId);
    await runFileOperation(
      transferMode === "copy" ? "Copying files..." : "Moving files...",
      () => apiJson(`/api/user/files/${transferMode}`, {
        ids: transferIds,
        targetFolderId: transferTargetId,
        targetPath: itemPath(transferTargetId)
      }),
      `${transferMode === "copy" ? "Copied" : "Moved"} ${transferIds.length} item(s) to ${target?.label || "selected folder"}`
    );
    setClipBoardIds([]);
    setIsTransferModalOpen(false);
  };

  // Premium GCP/Google Cloud inspired custom Icon Resolver (No raw emojis)
  const getItemIcon = (item: VirtualItem, className = "w-5 h-5") => {
    if (item.type === "directory") {
      if (item.name === "public_html") {
        return <FolderOpen className={`${className} text-indigo-400`} />;
      }
      if (item.name === "backups") {
        return <FolderArchive className={`${className} text-amber-500`} />;
      }
      if (item.name === "logs") {
        return <Folder className={`${className} text-slate-400`} />;
      }
      if (item.name === "node_modules") {
        return <Folder className={`${className} text-emerald-500 h-5 w-5`} />;
      }
      if (item.name === "api") {
        return <FolderOpen className={`${className} text-pink-400`} />;
      }
      return <Folder className={`${className} text-amber-400 fill-amber-400/5`} />;
    }
    
    const name = item.name.toLowerCase();
    if (name.endsWith(".zip") || name.endsWith(".tar.gz") || name.endsWith(".rar")) {
      return <FileArchive className={`${className} text-rose-500 fill-rose-500/5`} />;
    }
    if (name.endsWith(".html") || name.endsWith(".htm")) {
      return <Globe className={`${className} text-sky-400`} />;
    }
    if (name.endsWith(".css")) {
      return <FileCode className={`${className} text-pink-400`} />;
    }
    if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".jsx") || name.endsWith(".tsx")) {
      return <FileCode className={`${className} text-amber-400`} />;
    }
    if (name.endsWith(".json")) {
      return <FileJson className={`${className} text-teal-400`} />;
    }
    if (name.endsWith(".sql") || name.endsWith(".db")) {
      return <Database className={`${className} text-emerald-400`} />;
    }
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".svg")) {
      return <FileImage className={`${className} text-indigo-400`} />;
    }
    if (name.endsWith(".php")) {
      return <FileCode className={`${className} text-violet-400`} />;
    }
    if (name.endsWith(".py")) {
      return <FileCode className={`${className} text-blue-400`} />;
    }
    if (name.endsWith(".md")) {
      return <FileText className={`${className} text-cyan-400`} />;
    }
    if (name.endsWith(".txt")) {
      return <FileText className={`${className} text-slate-500`} />;
    }
    if (name.endsWith(".env") || name.endsWith(".env.example")) {
      return <Lock className={`${className} text-rose-505`} />;
    }
    return <File className={`${className} text-slate-400`} />;
  };

  // Checkbox Multiselect Handlers
  const isAllSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.includes(i.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredItems.some(i => i.id === id)));
    } else {
      const added = [...selectedIds];
      filteredItems.forEach(i => {
        if (!added.includes(i.id)) added.push(i.id);
      });
      setSelectedIds(added);
    }
  };

  const handleRowCheckboxToggle = (e: ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to permanently delete these ${selectedIds.length} items?`)) {
      const ids = descendantIds(selectedIds);
      await runFileOperation(
        "Deleting selected files...",
        () => apiJson("/api/user/files/delete", { ids }),
        `Deleted ${selectedIds.length} selected item(s) from server storage`
      );
    }
  };

  const handleBulkCompress = async () => {
    if (selectedIds.length === 0) return;
    const nameSeed = "bulk_archive_" + Math.random().toString(36).substr(2, 4) + ".zip";
    await runFileOperation(
      "Creating zip archive...",
      () => apiJson("/api/user/files/compress", {
        ids: selectedIds,
        targetFolderId: currentFolderId,
        targetPath: currentFolderPath(),
        name: nameSeed
      }),
      `Compressed ${selectedIds.length} selected item(s) into ${nameSeed}`
    );
  };

  const handleBulkCopy = () => {
    if (selectedIds.length === 0) return;
    setClipBoardIds(selectedIds);
    setClipBoardMode("copy");
    openTransferModal("copy", selectedIds);
  };

  const handleBulkCut = () => {
    if (selectedIds.length === 0) return;
    setClipBoardIds(selectedIds);
    setClipBoardMode("cut");
    openTransferModal("move", selectedIds);
  };

  const handlePasteClipboard = async () => {
    if (clipBoardIds.length === 0) return;
    const endpoint = clipBoardMode === "copy" ? "/api/user/files/copy" : "/api/user/files/move";
    await runFileOperation(
      clipBoardMode === "copy" ? "Pasting copied files..." : "Moving files...",
      () => apiJson(endpoint, {
        ids: clipBoardIds,
        targetFolderId: currentFolderId,
        targetPath: currentFolderPath()
      }),
      `${clipBoardMode === "copy" ? "Pasted" : "Moved"} ${clipBoardIds.length} item(s) into current folder`
    );
    setClipBoardIds([]);
  };

  // Right-Click Event Handler
  const handleContextMenuTrigger = (e: any, item: VirtualItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Coordinate relative to viewport
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  // Calculate Octal Chmod permissions string
  const getCalculatedOctal = () => {
    const user = (permUserRead ? 4 : 0) + (permUserWrite ? 2 : 0) + (permUserExec ? 1 : 0);
    const group = (permGroupRead ? 4 : 0) + (permGroupWrite ? 2 : 0) + (permGroupExec ? 1 : 0);
    const world = (permWorldRead ? 4 : 0) + (permWorldWrite ? 2 : 0) + (permWorldExec ? 1 : 0);
    return `0${user}${group}${world}`;
  };

  // Open Permissions Modal
  const openChmodModal = (item: VirtualItem) => {
    setItemToChmod(item);
    const currentPermissions = item.permissions || (item.type === "directory" ? "0755" : "0644");
    
    // Parse digits
    const u = parseInt(currentPermissions[1] || "6");
    const g = parseInt(currentPermissions[2] || "4");
    const w = parseInt(currentPermissions[3] || "4");

    setPermUserRead((u & 4) !== 0);
    setPermUserWrite((u & 2) !== 0);
    setPermUserExec((u & 1) !== 0);

    setPermGroupRead((g & 4) !== 0);
    setPermGroupWrite((g & 2) !== 0);
    setPermGroupExec((g & 1) !== 0);

    setPermWorldRead((w & 4) !== 0);
    setPermWorldWrite((w & 2) !== 0);
    setPermWorldExec((w & 1) !== 0);

    setIsChmodModalOpen(true);
  };

  // Save Permissions Command
  const handleSaveChmod = async () => {
    if (!itemToChmod) return;
    const finalOctal = getCalculatedOctal();

    await runFileOperation(
      "Updating permissions...",
      () => apiJson("/api/user/files/chmod", {
        id: itemToChmod.id,
        path: itemPath(itemToChmod.id),
        permissions: finalOctal
      }),
      `Modified permissions for "${itemToChmod.name}" to ${finalOctal}`
    );
    setIsChmodModalOpen(false);
    setItemToChmod(null);
  };

  // Open Rename Modal
  const openRenameModal = (item: VirtualItem) => {
    setItemToRename(item);
    setRenameValue(item.name);
    setIsRenameModalOpen(true);
  };

  // Save Rename command
  const handleSaveRename = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemToRename || !renameValue.trim()) return;

    if (files.some(f => f.parentId === currentFolderId && f.id !== itemToRename.id && f.name.toLowerCase() === renameValue.trim().toLowerCase())) {
      alert("An item with this name already exists in this directory.");
      return;
    }

    await runFileOperation(
      "Renaming item...",
      () => apiJson("/api/user/files/rename", {
        id: itemToRename.id,
        path: itemPath(itemToRename.id),
        name: renameValue.trim()
      }),
      `Renamed "${itemToRename.name}" to "${renameValue.trim()}"`
    );
    setIsRenameModalOpen(false);
    setItemToRename(null);
  };

  // Create folder
  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (files.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      alert("A folder or file with this name already exists here.");
      return;
    }

    const folderName = newItemName.trim();
    await runFileOperation(
      "Creating folder...",
      () => apiJson("/api/user/files/create", {
        type: "directory",
        name: folderName,
        parentId: currentFolderId,
        parentPath: currentFolderPath()
      }),
      `Created folder: ${folderName} under ${getCurrentFolder().name}`
    );
    setNewItemName("");
    setIsNewFolderModalOpen(false);
  };

  // Create file
  const handleCreateFile = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (files.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      alert("A folder or file with this name already exists here.");
      return;
    }

    const fileName = newItemName.trim();
    const data = await runFileOperation(
      "Creating file...",
      () => apiJson("/api/user/files/create", {
        type: "file",
        name: fileName,
        parentId: currentFolderId,
        parentPath: currentFolderPath(),
        content: ""
      }),
      `Created empty file: ${fileName}`
    );
    setNewItemName("");
    setIsNewFileModalOpen(false);
    const created = Array.isArray(data?.files) ? data.files.find((item: VirtualItem) => item.id === data.itemId) : null;
    if (created) {
      setEditingFile(created);
      setEditorContent("");
    }
  };

  // Physical dynamic file download logic
  const triggerPhysicalDownload = (file: VirtualItem) => {
    try {
      const blob = new Blob([file.content || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addActivity("file", `Downloaded physical file backup: ${file.name}`);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  // Simulated zip archive compression
  const compressToZip = async (item: VirtualItem) => {
    const archiveName = item.name.includes(".") 
      ? item.name.split(".")[0] + ".zip" 
      : item.name + ".zip";

    if (files.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === archiveName.toLowerCase())) {
      alert("A ZIP archive with this name already exists in this folder.");
      return;
    }

    await runFileOperation(
      "Creating zip archive...",
      () => apiJson("/api/user/files/compress", {
        ids: [item.id],
        targetFolderId: currentFolderId,
        targetPath: currentFolderPath(),
        name: archiveName
      }),
      `Compressed "${item.name}" into ${archiveName}`
    );
  };

  const extractZipArchive = async (item: VirtualItem) => {
    await runFileOperation(
      "Extracting zip archive...",
      () => apiJson("/api/user/files/extract", {
        id: item.id,
        path: itemPath(item.id),
        targetFolderId: currentFolderId,
        targetPath: currentFolderPath()
      }),
      `Extracted ZIP archive "${item.name}"`
    );
  };

  // Delete item
  const handleDeleteItem = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      await runFileOperation(
        "Deleting item...",
        () => apiJson("/api/user/files/delete", { ids: descendantIds([id]) }),
        `Deleted "${name}" from server storage`
      );
    }
  };

  // Start Editing
  const openEditor = (file: VirtualItem) => {
    if (file.content === undefined && file.size > 262144) {
      setOperationError(`${file.name} is a large or binary file. Download it or use Extract/Move/Copy actions instead of editing as text.`);
      return;
    }
    setEditingFile(file);
    setEditorContent(file.content || "");
  };

  // Save File content
  const handleSaveFile = async () => {
    if (!editingFile) return;

    await runFileOperation(
      "Saving file...",
      () => apiJson("/api/user/files/save", {
        id: editingFile.id,
        path: itemPath(editingFile.id),
        content: editorContent
      }),
      `Saved modifications to server file: ${editingFile.name}`
    );
    setEditingFile(prev => prev ? { ...prev, content: editorContent } : null);
    
    const saveNotif = document.getElementById("editor-save-notif");
    if (saveNotif) {
      saveNotif.classList.remove("opacity-0");
      saveNotif.classList.add("opacity-100");
      setTimeout(() => {
        saveNotif.classList.remove("opacity-100");
        saveNotif.classList.add("opacity-0");
      }, 2000);
    }
  };

  // Drag & Drop
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFiles = async (fileList: globalThis.File[]) => {
    if (!fileList.length) return;
    const token = authToken();
    if (!token) {
      setOperationError("User session expired. Log in again.");
      return;
    }
    setOperationError("");
    setActiveOperation("Uploading files...");
    try {
      for (const file of fileList) {
        const data = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/user/files/upload");
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.setRequestHeader("X-TPanel-File-Name", encodeURIComponent(file.name));
          xhr.setRequestHeader("X-TPanel-Parent-Id", currentFolderId);
          xhr.setRequestHeader("X-TPanel-Parent-Path", encodeURIComponent(currentFolderPath()));
          xhr.upload.onprogress = (event) => {
            const total = event.lengthComputable ? event.total : file.size;
            const loaded = event.lengthComputable ? event.loaded : Math.min(file.size, event.loaded || 0);
            setUploadProgress({
              name: file.name,
              loaded,
              total,
              percent: total ? Math.round((loaded / total) * 100) : 0
            });
          };
          xhr.onload = () => {
            try {
              const parsed = JSON.parse(xhr.responseText || "{}");
              if (xhr.status >= 200 && xhr.status < 300 && parsed.ok) resolve(parsed);
              else reject(new Error(parsed.message || `Upload failed for ${file.name}`));
            } catch {
              reject(new Error(`Upload failed for ${file.name}`));
            }
          };
          xhr.onerror = () => reject(new Error(`Upload failed for ${file.name}`));
          xhr.send(file);
        });
        if (Array.isArray(data.files)) setFiles(data.files);
        addActivity("file", `Uploaded ${file.name} to ${getCurrentFolder().name}`);
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setActiveOperation("");
      setTimeout(() => setUploadProgress(null), 1200);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      void uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleManualUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      void uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Full Page Navigation Header Bar - DISTRACTION-FREE & IMMERSIVE */}
      <div className="bg-slate-900 border border-slate-700 p-4 rounded flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 bg-indigo-950/50 border border-indigo-700/40 rounded flex items-center justify-center shrink-0 shadow-inner">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                tPanel Web File Manager Pro
              </h1>
              <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/25">
                MAXIMIZED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Simulated Node environment directory path: <code className="text-indigo-400 font-semibold font-mono">/home/tpanel/public_html</code>
            </p>
          </div>
        </div>
        
        {/* Navigation Quick Jumps & Back Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={() => setActiveTab("dashboard")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("databases")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hidden sm:inline-flex"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            MySQL
          </button>
          <button 
            onClick={() => setActiveTab("node")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hidden sm:inline-flex"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            Node Apps
          </button>
          <button 
            onClick={() => setActiveTab("domains")} 
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition hidden sm:inline-flex"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            Domains
          </button>
          <button 
            onClick={() => setActiveTab("dashboard")}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold font-sans tracking-tight transition flex items-center gap-1.5 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/15"
          >
            <Monitor className="w-3.5 h-3.5 text-indigo-200" />
            Exit Full Screen
          </button>
        </div>
      </div>

      {(activeOperation || operationError || uploadProgress) && (
        <div className={`border p-3 rounded space-y-2 ${operationError ? "border-rose-700 bg-rose-950/30" : "border-indigo-700/50 bg-indigo-950/30"}`}>
          <div className="flex items-center justify-between gap-3">
            <p className={`text-xs font-bold font-mono ${operationError ? "text-rose-300" : "text-indigo-200"}`}>
              {operationError || activeOperation || (uploadProgress ? `Uploading ${uploadProgress.name}` : "")}
            </p>
            {activeOperation && <RefreshCw className="h-4 w-4 animate-spin text-indigo-300" />}
          </div>
          {uploadProgress && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded bg-slate-950">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress.percent}%` }} />
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                {uploadProgress.percent}% uploaded ({uploadProgress.loaded.toLocaleString()} / {uploadProgress.total.toLocaleString()} bytes)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Multiselect Batch Action Bar (DOCK AT TOP IF SELECTED) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 p-3 rounded flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1 px-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-indigo-300 font-mono">
              Selected: <strong className="text-white bg-indigo-505 px-2 py-0.5 rounded text-indigo-400">{selectedIds.length}</strong> resources
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={handleBulkCompress}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-505 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <FileArchive className="w-3.5 h-3.5 text-indigo-200" />
              Compress to .zip
            </button>
            <button 
              onClick={handleBulkCopy}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              Copy Selected
            </button>
            <button 
              onClick={handleBulkCut}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5 rotate-45 text-slate-400" />
              Cut Selected
            </button>
            <button 
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-rose-900/50 hover:bg-rose-800/80 text-rose-300 border border-rose-800 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete Selected
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-slate-400 hover:text-indigo-455 rounded text-xs transition font-mono border border-transparent hover:border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clipboard Active Notification */}
      {clipBoardIds.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded flex items-center justify-between">
          <p className="text-xs text-amber-500 font-mono flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-400 animate-pulse" />
            Clipboard contains <strong>{clipBoardIds.length}</strong> items in <strong>{clipBoardMode.toUpperCase()}</strong> state.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handlePasteClipboard}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold cursor-pointer"
            >
              Paste in here
            </button>
            <button 
              onClick={() => setClipBoardIds([])}
              className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              title="Clear Clipboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-700 p-4 rounded">
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsNewFolderModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700 hover:text-indigo-400 transition flex items-center gap-2 cursor-pointer"
            id="btn-create-folder"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            New Folder
          </button>
          <button 
            onClick={() => setIsNewFileModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/35 transition flex items-center gap-2 cursor-pointer shadow-sm"
            id="btn-create-file"
          >
            <FilePlus className="w-4 h-4 text-indigo-200" />
            New File
          </button>
          <button
            onClick={handleSelectAllToggle}
            disabled={filteredItems.length === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700 hover:text-indigo-400 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Layers className="w-4 h-4 text-indigo-300" />
            {isAllSelected ? "Clear selection" : "Select all"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Total Path Elements: <strong className="text-indigo-400 font-black">{safeFiles.length}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation & Files Area */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Breadcrumbs & Search Utility */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-700 p-3 rounded">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-sm text-slate-200 py-1 no-scrollbar">
              {getCurrentFolder().parentId && (
                <button 
                  onClick={() => setCurrentFolderId(getCurrentFolder().parentId!)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 transition cursor-pointer"
                  title="Go back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {getBreadcrumbs().map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                  <button 
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`hover:text-indigo-400 font-mono transition text-xs px-2 py-0.5 rounded border border-slate-725 ${crumb.id === currentFolderId ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/40 font-bold" : "border-slate-800 text-slate-300 bg-slate-950/40"}`}
                  >
                    {crumb.name === "/" ? "root" : crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* In-Folder Search */}
            <div className="relative shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input 
                type="text" 
                placeholder="Filter files..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Directory Listings container */}
          <div className="bg-slate-900 border border-slate-700 rounded overflow-hidden">
            <p className="px-4 py-2 bg-slate-950 text-[10px] text-slate-400 font-mono border-b border-slate-800">
              💡 Hint: Right-click on any row item for detailed server commands (Copy, Extract, Compressions)!
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead className="bg-slate-950 text-slate-300 text-xs font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAllToggle}
                        className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-indigo-500 cursor-pointer w-4 h-4 ml-0.5"
                        title="Select/deselect all items"
                      />
                    </th>
                    <th className="py-3 px-4 text-slate-100">File Name</th>
                    <th className="py-3 px-4 hidden sm:table-cell font-mono text-slate-300">Last Modified</th>
                    <th className="py-3 px-4 hidden md:table-cell font-mono text-slate-300">Chmod</th>
                    <th className="py-3 px-4 hidden md:table-cell font-mono text-slate-300">Size</th>
                    <th className="py-3 px-4 text-right text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/80 text-xs">
                  
                  {/* Up directory row */}
                  {getCurrentFolder().parentId && (
                    <tr 
                      onClick={() => setCurrentFolderId(getCurrentFolder().parentId!)}
                      className="hover:bg-slate-800/45 cursor-pointer text-indigo-400/90 transition border-b border-slate-700/50"
                    >
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 font-mono font-bold flex items-center gap-3">
                        <FolderUp className="w-5 h-5 text-indigo-400 shrink-0" />
                        .. (Go Up)
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell font-mono">-</td>
                      <td className="py-3 px-4 hidden md:table-cell font-mono">-</td>
                      <td className="py-3 px-4 hidden md:table-cell font-mono">-</td>
                      <td className="py-3 px-4 text-right"></td>
                    </tr>
                  )}

                  {/* Filtered files list */}
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                           <Inbox className="w-8 h-8 text-indigo-400/30 animate-pulse" />
                        <p className="text-xs font-semibold text-slate-100 font-mono">Empty Directory</p>
                           <p className="text-[11px] text-slate-500 font-mono">Create folders &amp; files above or select file to upload.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isZip = item.name.endsWith(".zip");
                      const perms = item.permissions || (item.type === "directory" ? "0755" : "0644");
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr 
                          key={item.id}
                          onContextMenu={(e) => handleContextMenuTrigger(e, item)}
                          className={`hover:bg-indigo-600/5 transition group cursor-pointer border-b border-slate-700/50 ${isSelected ? "bg-indigo-600/10 text-slate-100 font-bold" : "text-slate-300"}`}
                          onClick={() => {
                            if (item.type === "directory") {
                              setCurrentFolderId(item.id);
                              setSearchQuery("");
                            } else {
                              openEditor(item);
                            }
                          }}
                        >
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => handleRowCheckboxToggle(e, item.id)}
                              className="rounded border-slate-700 text-indigo-600 bg-slate-900 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono flex items-center gap-2.5 font-bold text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            <span className="shrink-0 group-hover:scale-110 transition">
                              {getItemIcon(item)}
                            </span>
                            <span className="truncate max-w-[180px] sm:max-w-[420px]">{item.name}</span>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell font-mono text-slate-400">
                            {item.updatedAt}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                openChmodModal(item);
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] border border-slate-755 hover:border-indigo-500 hover:text-white text-slate-300 cursor-pointer transition inline-flex items-center gap-1 font-semibold"
                              title="Click to modify permissions (chmod)"
                            >
                              <Shield className="w-3 h-3 text-slate-500" />
                              {perms}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell font-mono text-slate-400">
                            {item.type === "directory" ? "DIR" : `${(item.size).toLocaleString()} B`}
                          </td>
                          <td className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              
                              {/* Compress action */}
                              <button
                                onClick={() => compressToZip(item)}
                                className="p-1 px-[5px] text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded transition border border-transparent hover:border-slate-700"
                                title="Compress to ZIP"
                              >
                                <FolderArchive className="w-3.5 h-3.5 text-amber-500/80" />
                              </button>

                              {/* Unzip action if ZIP */}
                              {isZip && (
                                <button
                                  onClick={() => extractZipArchive(item)}
                                  className="p-1 px-[5px] text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition border border-transparent hover:border-slate-705"
                                  title="Extract ZIP contents"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                                </button>
                              )}

                              {item.type === "file" && (
                                <>
                                  <button
                                    onClick={() => triggerPhysicalDownload(item)}
                                    className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                                    title="Download raw file"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => openEditor(item)}
                                    className="p-1 text-slate-400 hover:text-sky-455 hover:bg-slate-800 rounded transition"
                                    title="Edit code source"
                                    id={`btn-edit-${item.id}`}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button 
                                onClick={() => openRenameModal(item)}
                                className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition"
                                title="Rename item"
                              >
                                <Tag className="w-3.5 h-3.5 text-purple-400/80" />
                              </button>

                              <button 
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1 text-slate-400 hover:text-rose-455 hover:bg-slate-800 rounded transition"
                                title="Delete"
                                id={`btn-delete-${item.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                </tbody>
              </table>
            </div>
          </div>

          {/* Simple drag and drop code uploader */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer border border-dashed rounded p-5 transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
              dragActive 
                ? "border-indigo-500 bg-indigo-500/10" 
                : "border-slate-700 bg-slate-900/15 hover:bg-slate-900/30 hover:border-slate-500"
            }`}
          >
            <Upload className={`w-7 h-7 ${dragActive ? "text-indigo-400 animate-bounce" : "text-slate-500"}`} />
            <p className="text-xs font-bold text-slate-300">
              Drag &amp; drop file to upload physically
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Will write into <code className="text-indigo-455 font-mono">{getCurrentFolder().name === "/" ? "root_document" : getCurrentFolder().name}</code> folder
            </p>
            <label className="mt-1 text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold px-2.5 py-1.5 rounded border border-slate-700 cursor-pointer transition">
              Choose Local File
              <input 
                type="file" 
                multiple
                className="hidden" 
                onChange={handleManualUpload} 
              />
            </label>
          </div>

        </div>

        {/* File Manager Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Dev Quick Tips
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Double click or select folders to navigate. Check the checkboxes to invoke <strong>Batch Actions</strong> like mass compressing or bulk deleting items! 
            </p>

            <div className="border-t border-slate-750 pt-3 space-y-2.5">
              <p className="text-xs font-semibold text-slate-300 font-mono">Ask Copilot smart boilerplates:</p>
              <button 
                onClick={() => openAiWithPrompt("Create a complete Node.js Express server template that responds to JSON GET requests")}
                className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded text-[10px] text-sky-400 font-mono transition block leading-normal cursor-pointer"
              >
                + Node Express Boilerplate
              </button>
              <button 
                onClick={() => openAiWithPrompt("Create a beautiful responsive modern web HTML starter landing page styled with neat CSS styles")}
                className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded text-[10px] text-sky-400 font-mono transition block leading-normal cursor-pointer"
              >
                + Modern HTML Landing Page
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT-CLICK ABSOLUTE CONTEXT MENU DOCK */}
      {contextMenu && (
        <>
          {/* Backdrop layer to capture window clicks comfortably inside iframe preview */}
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          />
          <div 
            className="fixed z-50 bg-slate-950 border border-slate-700 shadow-2xl rounded p-1 w-52 text-xs font-mono font-bold divide-y divide-slate-805"
            style={{ 
              top: `${Math.min(contextMenu.y, window.innerHeight - 240)}px`, 
              left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Context Actions Container */}
            <div className="py-1 space-y-0.5">
              <div className="px-3 py-1 text-[9px] text-slate-550 uppercase tracking-widest text-slate-500 font-black">
                Server Actions
              </div>
              {contextMenu.item.type === "directory" ? (
                <button 
                  onClick={() => {
                    setCurrentFolderId(contextMenu.item.id);
                    setSearchQuery("");
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Enter directory
                </button>
              ) : (
                <button 
                  onClick={() => {
                    openEditor(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
                >
                  <Edit className="w-3.5 h-3.5 text-sky-450" />
                  Edit code source
                </button>
              )}
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`/home/tpanel/public_html/${contextMenu.item.name}`)
                    .then(() => alert(`Copied full path to system clipboard!`))
                    .catch(() => alert(`Resource path: /home/tpanel/public_html/${contextMenu.item.name}`));
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copy absolute path
              </button>
              <button
                onClick={() => {
                  openTransferModal("copy", [contextMenu.item.id]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-300" />
                Copy to folder
              </button>
              <button
                onClick={() => {
                  openTransferModal("move", [contextMenu.item.id]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <FolderUp className="w-3.5 h-3.5 text-amber-400" />
                Move to folder
              </button>
            </div>

            <div className="py-1 space-y-0.5">
              <button 
                onClick={() => {
                  compressToZip(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                Compress into (.zip)
              </button>
              
              {contextMenu.item.name.endsWith(".zip") && (
                <button 
                  onClick={() => {
                    extractZipArchive(contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-emerald-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-emerald-400 font-bold"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  Extract Zip archive
                </button>
              )}

              <button 
                onClick={() => {
                  openRenameModal(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-indigo-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                Rename resource
              </button>
            </div>

            <div className="py-1 space-y-0.5">
              <button 
                onClick={() => {
                  openChmodModal(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-sky-600 hover:text-white rounded flex items-center gap-2 cursor-pointer transition text-slate-300"
              >
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                Chmod Permissions
              </button>

              <button 
                onClick={() => {
                  handleDeleteItem(contextMenu.item.id, contextMenu.item.name);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-600 hover:text-white text-rose-455 rounded flex items-center gap-2 cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Delete Resource
              </button>
            </div>
          </div>
        </>
      )}

      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                {transferMode === "copy" ? "Copy to folder" : "Move to folder"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              {transferIds.length} selected item(s). If a same-name file exists, tPanel will keep both by creating a safe numbered name.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Destination folder</label>
              <select
                value={transferTargetId}
                onChange={(event) => setTransferTargetId(event.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {directoryOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.label}</option>
                ))}
              </select>
            </div>

            <div className="max-h-40 overflow-y-auto rounded border border-slate-800 bg-slate-950 p-2">
              {transferIds.slice(0, 12).map((id) => {
                const item = safeFiles.find((entry) => entry.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex items-center gap-2 px-2 py-1 text-[11px] font-mono text-slate-300">
                    {getItemIcon(item, "w-4 h-4")}
                    <span className="truncate">{itemPath(id) || item.name}</span>
                  </div>
                );
              })}
              {transferIds.length > 12 && <p className="px-2 py-1 text-[11px] text-slate-500">+ {transferIds.length - 12} more</p>}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmTransfer()}
                disabled={Boolean(activeOperation)}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer disabled:opacity-60"
              >
                {transferMode === "copy" ? "Copy here" : "Move here"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHMOD PERMISSIONS MODAL */}
      {isChmodModalOpen && itemToChmod && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-md shadow-xl space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <Shield className="w-4 h-4 text-sky-400" />
                Change Linux Permissions (chmod)
              </h3>
              <button 
                type="button"
                onClick={() => { setIsChmodModalOpen(false); setItemToChmod(null); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Modifying server flags for <span className="font-mono text-amber-500 font-black">{itemToChmod.name}</span>:
            </p>

            <div className="grid grid-cols-3 gap-4 border border-slate-700 p-4 rounded bg-slate-950 font-mono text-xs">
              {/* User Permissions */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Owner</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permUserRead} onChange={(e) => setPermUserRead(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Read (r)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permUserWrite} onChange={(e) => setPermUserWrite(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Write (w)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permUserExec} onChange={(e) => setPermUserExec(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Exec (x)
                </label>
              </div>

              {/* Group Permissions */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Group</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permGroupRead} onChange={(e) => setPermGroupRead(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Read (r)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permGroupWrite} onChange={(e) => setPermGroupWrite(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Write (w)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permGroupExec} onChange={(e) => setPermGroupExec(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Exec (x)
                </label>
              </div>

              {/* World Permissions */}
              <div className="space-y-2">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">World</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permWorldRead} onChange={(e) => setPermWorldRead(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Read (r)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permWorldWrite} onChange={(e) => setPermWorldWrite(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Write (w)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-indigo-400">
                  <input type="checkbox" checked={permWorldExec} onChange={(e) => setPermWorldExec(e.target.checked)} className="rounded border-slate-700 text-indigo-650 focus:ring-indigo-500" />
                  Exec (x)
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
              <span className="text-xs text-slate-400">Equivalent Octal Code:</span>
              <span className="text-sm font-bold text-indigo-400">{getCalculatedOctal()}</span>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => { setIsChmodModalOpen(false); setItemToChmod(null); }}
                className="px-3 py-1.5 text-xs text-slate-450 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveChmod}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition cursor-pointer"
              >
                Save Flags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {isRenameModalOpen && itemToRename && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveRename}
            className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <Tag className="w-4 h-4 text-purple-400" />
                Rename Resource
              </h3>
              <button 
                type="button"
                onClick={() => { setIsRenameModalOpen(false); setItemToRename(null); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs text-slate-450 block font-semibold">Enter New Name</label>
              <input 
                type="text" 
                required
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsRenameModalOpen(false); setItemToRename(null); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer"
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Embedded File Editor Panel */}
      {editingFile && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 rounded overflow-hidden w-full max-w-4xl shadow-2xl flex flex-col h-[85vh]">
            
            {/* Editor Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-200 font-mono">{editingFile.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Path: /{!getBreadcrumbs().map(b=>b.name === "/" ? "" : b.name).filter(Boolean).join("/")}/{editingFile.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span id="editor-save-notif" className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 opacity-0 transition-opacity duration-300">
                  Saved successfully!
                </span>
                <button 
                  onClick={handleSaveFile}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white transition flex items-center gap-1.5 cursor-pointer border border-transparent"
                  id="btn-save-editor"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
                <button 
                  onClick={() => setEditingFile(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
                  id="btn-close-editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editing Textarea */}
            <div className="flex-1 overflow-hidden flex relative font-mono text-xs">
              <div className="hidden sm:block bg-slate-950 border-r border-slate-800 text-slate-600 text-right select-none py-4 px-3 w-12/100 overflow-hidden leading-[1.6]">
                {Array.from({ length: Math.max(15, editorContent.split("\n").length + 2) }).map((_, i) => (
                  <div key={i} className="leading-relaxed">{i + 1}</div>
                ))}
              </div>
              <textarea 
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                spellCheck={false}
                placeholder="Write codes here..."
                className="flex-1 bg-slate-950/80 p-4 text-slate-200 leading-relaxed font-mono focus:outline-none resize-none overflow-y-auto block select-text focus:bg-slate-950"
              />
            </div>

            {/* Footer status bar */}
            <div className="bg-slate-900 border-t border-slate-700 px-4 py-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <div>Size: {editorContent.length} chars ({(new Blob([editorContent]).size)} Bytes)</div>
              <div>Syntax Code editor (UTF-8)</div>
            </div>

          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateFolder}
            className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                Create Folder
              </h3>
              <button 
                type="button"
                onClick={() => { setIsNewFolderModalOpen(false); setNewItemName(""); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="Folder Name (e.g. static, api_v1)" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsNewFolderModalOpen(false); setNewItemName(""); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create File Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateFile}
            className="bg-slate-900 border border-slate-700 rounded p-5 w-full max-w-sm shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
                <FilePlus className="w-4 h-4 text-indigo-400" />
                Create Empty File
              </h3>
              <button 
                type="button"
                onClick={() => { setIsNewFileModalOpen(false); setNewItemName(""); }}
                className="p-1 text-slate-400 hover:text-rose-455 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="File name (e.g. app.js, index.php)" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button"
                onClick={() => { setIsNewFileModalOpen(false); setNewItemName(""); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold transition cursor-pointer"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
